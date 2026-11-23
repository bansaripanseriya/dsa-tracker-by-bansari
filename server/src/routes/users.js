import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { authRequired } from '../middleware/auth.js';
import { selfDiscoverability } from '../lib/identity.js';

/**
 * Finding other users (search and tag lookup arrive in phase 4) and the
 * signed-in user's own discoverability settings.
 */
const router = Router();

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
