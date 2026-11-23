import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { authRequired } from '../middleware/auth.js';
import { computeStats, syncSolves } from '../lib/solves.js';
import { lcSetFromKeys } from '../../../shared/problemIndex.js';

const router = Router();

router.use(authRequired);

router.get('/', async (req, res) => {
  const user = await User.findById(req.user.sub).select('progress');
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ progress: user.progress || {} });
});

router.put(
  '/',
  [
    body('sheetDone').optional().isArray(),
    body('sheetDone.*').optional().isString(),
    body('practiceDone').optional().isArray(),
    body('practiceDone.*').optional().isString(),
    body('sheetSaved').optional().isArray(),
    body('sheetSaved.*').optional().isString(),
    body('practiceSaved').optional().isArray(),
    body('practiceSaved.*').optional().isString(),
    body('streak').optional().isObject(),
    body('streak.checkins').optional().isArray(),
    body('streak.checkins.*').optional().isString(),
    body('openSections').optional().isArray(),
    body('openSections.*').optional().isInt()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const user = await User.findById(req.user.sub);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      const p = req.body;
      if (!user.progress) user.progress = {};
      // Problems done before this save (unique LeetCode numbers across sheet + practice).
      const before = lcSetFromKeys(user.progress.sheetDone, user.progress.practiceDone);
      if (Array.isArray(p.sheetDone)) user.progress.sheetDone = p.sheetDone;
      if (Array.isArray(p.practiceDone)) user.progress.practiceDone = p.practiceDone;
      if (Array.isArray(p.sheetSaved)) user.progress.sheetSaved = p.sheetSaved;
      if (Array.isArray(p.practiceSaved)) user.progress.practiceSaved = p.practiceSaved;
      if (p.streak && Array.isArray(p.streak.checkins)) {
        user.progress.streak = user.progress.streak || {};
        user.progress.streak.checkins = p.streak.checkins;
      }
      if (Array.isArray(p.openSections)) {
        user.progress.openSections = p.openSections;
      }
      const after = lcSetFromKeys(user.progress.sheetDone, user.progress.practiceDone);
      const now = new Date();
      user.stats = computeStats(after, user.progress.streak?.checkins, now);
      user.markModified('progress');
      await user.save();

      // Record first-solve times for the weekly leaderboard. A failure here must not
      // lose the progress that was just saved; the next save reconciles it.
      try {
        await syncSolves(user, before, after, now);
      } catch (syncError) {
        console.error('PUT /api/progress: solve sync failed:', syncError);
      }

      res.json({ progress: user.progress });
    } catch (error) {
      console.error('PUT /api/progress failed:', error);
      return res.status(500).json({ error: 'Failed to save progress' });
    }
  }
);

export default router;
