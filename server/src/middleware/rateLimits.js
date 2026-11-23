import { rateLimit } from 'express-rate-limit';

const common = {
  windowMs: 60 * 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a minute and try again.', code: 'rate-limited' }
};

/** Signed-in routes: limit per user rather than per IP. Use after authRequired. */
const perUser = (limit) =>
  rateLimit({ ...common, limit, keyGenerator: (req) => `user:${req.user?.sub}` });

/** Public tag lookups (the invite page works signed out): per IP. */
export const tagLookupLimiter = rateLimit({ ...common, limit: 60 });

/** Avatar images are requested by every list that shows people. */
export const avatarLimiter = rateLimit({ ...common, limit: 300 });

export const searchLimiter = perUser(30);

/** Sending / accepting / removing requests and unfriending. */
export const friendWriteLimiter = perUser(30);
