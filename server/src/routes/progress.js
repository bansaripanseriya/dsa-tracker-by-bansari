import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { authRequired } from '../middleware/auth.js';

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
    user.markModified('progress');
    await user.save();
    res.json({ progress: user.progress });
  }
);

export default router;
