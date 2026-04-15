import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

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

router.get('/me', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select('email name progress');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
