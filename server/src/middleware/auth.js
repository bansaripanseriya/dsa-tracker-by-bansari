import jwt from 'jsonwebtoken';

export function authRequired(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'Server misconfiguration' });
    }
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * For routes that work signed in or out (e.g. the invite page): sets `req.user` when a
 * valid token is present, otherwise carries on anonymously. Never rejects the request.
 */
export function authOptional(req, _res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;
  const secret = process.env.JWT_SECRET;
  if (token && secret) {
    try {
      req.user = jwt.verify(token, secret);
    } catch {
      req.user = undefined;
    }
  }
  next();
}
