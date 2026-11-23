import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import { authRequired } from '../middleware/auth.js';
import { MAX_WEEKS_BACK, weeklyLeaderboard } from '../lib/leaderboard.js';

/** Weekly leaderboard: you and your friends. Weeks run Monday 00:00 IST to Monday 00:00 IST. */
const router = Router();
router.use(authRequired);

router.get(
  '/weekly',
  [
    query('offset')
      .optional()
      .isInt({ min: 0, max: MAX_WEEKS_BACK })
      .withMessage(`offset must be a whole number from 0 (this week) to ${MAX_WEEKS_BACK}`)
      .toInt()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      res.json(await weeklyLeaderboard(req.user.sub, { offset: req.query.offset ?? 0 }));
    } catch (error) {
      console.error('GET /api/leaderboard/weekly failed:', error);
      return res.status(500).json({ error: 'Failed to load the leaderboard' });
    }
  }
);

export default router;
