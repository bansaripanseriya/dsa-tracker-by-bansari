import crypto from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { authRequired } from '../middleware/auth.js';
import { isSmtpConfigured, sendPasswordResetEmail } from '../lib/mail.js';

const router = Router();

const RESET_TOKEN_BYTES = 32;
const RESET_EXPIRY_MS = 60 * 60 * 1000;

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function clientBaseUrl() {
  const raw = process.env.CLIENT_URL || 'http://localhost:5173';
  return raw.split(',')[0].trim() || 'http://localhost:5173';
}

function signToken(userId, secret) {
  return jwt.sign({ sub: userId }, secret, { expiresIn: '30d' });
}

function getJwtSecret(res) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'Server misconfiguration: JWT secret missing' });
    return null;
  }
  return secret;
}

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').optional().trim().isLength({ max: 120 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const secret = getJwtSecret(res);
      if (!secret) return;

      const { email, password, name = '' } = req.body;
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({ email, passwordHash, name });
      const token = signToken(user._id.toString(), secret);
      res.status(201).json({
        token,
        user: { id: user._id, email: user.email, name: user.name }
      });
    } catch (error) {
      console.error('POST /api/auth/register failed:', error);
      return res.status(500).json({ error: 'Failed to register user' });
    }
  }
);

router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const secret = getJwtSecret(res);
      if (!secret) return;

      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const token = signToken(user._id.toString(), secret);
      res.json({
        token,
        user: { id: user._id, email: user.email, name: user.name }
      });
    } catch (error) {
      console.error('POST /api/auth/login failed:', error);
      return res.status(500).json({ error: 'Failed to log in' });
    }
  }
);

router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { email } = req.body;
      const user = await User.findOne({ email });
      const smtpOn = isSmtpConfigured();
      const generic = {
        message: 'If an account exists for that email, check it for reset instructions.',
        emailEnabled: smtpOn
      };

      if (user) {
        const rawToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString('base64url');
        const tokenHash = sha256Hex(rawToken);
        const expires = new Date(Date.now() + RESET_EXPIRY_MS);
        user.passwordResetTokenHash = tokenHash;
        user.passwordResetExpires = expires;
        await user.save();

        const resetUrl = `${clientBaseUrl().replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;
        if (smtpOn) {
          const sent = await sendPasswordResetEmail(user.email, resetUrl);
          if (!sent.ok) {
            console.error('[password-reset] Email send failed:', sent.error?.message || sent.error);
          }
        } else if (process.env.NODE_ENV !== 'production') {
          console.info('[password-reset] SMTP not configured; reset link:', resetUrl);
        }
      }

      return res.json(generic);
    } catch (error) {
      console.error('POST /api/auth/forgot-password failed:', error);
      return res.status(500).json({ error: 'Failed to process request' });
    }
  }
);

router.post(
  '/reset-password',
  [
    body('token').trim().notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { token, password } = req.body;
      const tokenHash = sha256Hex(token);
      const user = await User.findOne({
        passwordResetTokenHash: tokenHash,
        passwordResetExpires: { $gt: new Date() }
      });
      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset link. Request a new one from the sign-in page.' });
      }
      user.passwordHash = await bcrypt.hash(password, 12);
      user.passwordResetTokenHash = null;
      user.passwordResetExpires = null;
      await user.save();
      return res.json({ message: 'Password updated. You can sign in with your new password.' });
    } catch (error) {
      console.error('POST /api/auth/reset-password failed:', error);
      return res.status(500).json({ error: 'Failed to reset password' });
    }
  }
);

router.get('/me', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select('email name progress');
    if (!user) {
      return res.status(401).json({ error: 'Invalid session. Please log in again.' });
    }
    res.json({
      user: { id: user._id, email: user.email, name: user.name },
      progress: user.progress || {}
    });
  } catch (error) {
    console.error('GET /api/auth/me failed:', error);
    return res.status(500).json({ error: 'Failed to fetch current user' });
  }
});

export default router;
