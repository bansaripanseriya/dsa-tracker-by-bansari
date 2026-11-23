import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { authOptional, authRequired } from '../middleware/auth.js';
import { avatarLimiter, searchLimiter, tagLookupLimiter } from '../middleware/rateLimits.js';
import { selfDiscoverability } from '../lib/identity.js';
import { CARD_FIELDS, memberCard, publicCard } from '../lib/cards.js';
import { relationship } from '../lib/friendships.js';
import { searchUsers } from '../lib/search.js';
import { parseTagInput } from '../lib/tags.js';

/** Finding other users, and the signed-in user's own discoverability settings. */
const router = Router();

/**
 * Look up one user by tag — used by the invite page, so it works signed out.
 * Signed out: publicCard. Signed in: memberCard + relationship.
 */
router.get('/by-tag/:tag', tagLookupLimiter, authOptional, async (req, res) => {
  try {
    const tag = parseTagInput(req.params.tag);
    const user = tag ? await User.findOne({ friendTag: tag }).select(CARD_FIELDS).lean() : null;
    if (!user) {
      return res.status(404).json({ error: 'No one has that tag.', code: 'not-found' });
    }
    if (!req.user) {
      return res.json({ user: publicCard(user) });
    }
    return res.json({ user: memberCard(user), relationship: await relationship(req.user.sub, user._id) });
  } catch (error) {
    console.error('GET /api/users/by-tag failed:', error);
    return res.status(500).json({ error: 'Failed to look up that tag' });
  }
});

// Only raster formats: an SVG served from our own origin could run scripts.
const AVATAR_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

/** A user's uploaded photo as an image (so lists never carry base64 data). Public, like the name. */
router.get('/by-tag/:tag/avatar', avatarLimiter, async (req, res) => {
  try {
    const tag = parseTagInput(req.params.tag);
    const user = tag ? await User.findOne({ friendTag: tag }).select('avatar.data').lean() : null;
    const match = /^data:([^;,]+);base64,(.+)$/s.exec(user?.avatar?.data || '');
    if (!match || !AVATAR_TYPES.has(match[1].toLowerCase())) {
      return res.status(404).end();
    }
    res.set({
      'Content-Type': match[1].toLowerCase(),
      'Cache-Control': 'public, max-age=86400', // URLs carry ?v=<uploadedAt>, so a new photo gets a new URL
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'"
    });
    return res.send(Buffer.from(match[2], 'base64'));
  } catch (error) {
    console.error('GET /api/users/by-tag/:tag/avatar failed:', error);
    return res.status(500).end();
  }
});

/** Search by #tag, exact email, or name. See lib/search.js for the rules. */
router.get('/search', authRequired, searchLimiter, async (req, res) => {
  try {
    return res.json(await searchUsers(req.user.sub, req.query.q));
  } catch (error) {
    console.error('GET /api/users/search failed:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
});

router.put(
  '/me/discoverability',
  authRequired,
  [body('byName').isBoolean().withMessage('byName must be true or false')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const user = await User.findByIdAndUpdate(
        req.user.sub,
        { $set: { 'discoverability.byName': req.body.byName } },
        { new: true, projection: { discoverability: 1 } }
      );
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json({ discoverability: selfDiscoverability(user) });
    } catch (error) {
      console.error('PUT /api/users/me/discoverability failed:', error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  }
);

export default router;
