import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { authRequired } from '../middleware/auth.js';
import { friendWriteLimiter } from '../middleware/rateLimits.js';
import { CARD_FIELDS, friendSummary, memberCard } from '../lib/cards.js';
import {
  FriendError,
  acceptRequest,
  acceptedFriendships,
  countPendingIncoming,
  friendsSince,
  pendingRequests,
  removeRequest,
  sendRequest,
  unfriend
} from '../lib/friendships.js';
import { buildFriendProfile } from '../lib/profile.js';
import { parseTagInput } from '../lib/tags.js';
import { istDateStr } from '../../../shared/streak.js';

/** Friends and friend requests. Everything here needs a signed-in user; people are addressed by tag. */
const router = Router();
router.use(authRequired);

/** Wrap a handler: FriendError → its status and code; anything else → 500. */
const handle = (label, fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error instanceof FriendError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }
    console.error(`${label} failed:`, error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

/** Load the user a `:tag` (or body tag) refers to, or throw a 404. */
async function userByTag(rawTag, fields = CARD_FIELDS) {
  const tag = parseTagInput(rawTag);
  const user = tag ? await User.findOne({ friendTag: tag }).select(fields).lean() : null;
  if (!user) throw new FriendError('not-found', 404, 'No one has that tag.');
  return user;
}

async function cardsById(ids, fields = CARD_FIELDS) {
  const users = await User.find({ _id: { $in: ids } }).select(fields).lean();
  return new Map(users.map((u) => [String(u._id), u]));
}

router.get(
  '/',
  handle('GET /api/friends', async (req, res) => {
    const friendships = await acceptedFriendships(req.user.sub);
    const users = await cardsById(
      friendships.map((f) => f.friendId),
      `${CARD_FIELDS} progress.streak.checkins`
    );
    const today = istDateStr();
    const friends = friendships
      .filter((f) => users.has(String(f.friendId)))
      .map((f) => friendSummary(users.get(String(f.friendId)), { since: f.since, today }))
      .sort((a, b) => (a.name || a.tag).localeCompare(b.name || b.tag));
    res.json({ friends });
  })
);

router.get(
  '/requests',
  handle('GET /api/friends/requests', async (req, res) => {
    const { incoming, outgoing } = await pendingRequests(req.user.sub);
    const users = await cardsById([...incoming, ...outgoing].map((r) => r.otherId));
    const toCards = (list) =>
      list
        .filter((r) => users.has(String(r.otherId)))
        .map((r) => ({ ...memberCard(users.get(String(r.otherId))), requestedAt: r.createdAt }));
    res.json({ incoming: toCards(incoming), outgoing: toCards(outgoing) });
  })
);

/** Cheap: for the header badge. */
router.get(
  '/summary',
  handle('GET /api/friends/summary', async (req, res) => {
    res.json({ pendingIncoming: await countPendingIncoming(req.user.sub) });
  })
);

router.post(
  '/requests',
  friendWriteLimiter,
  [body('tag').isString().withMessage('tag is required')],
  handle('POST /api/friends/requests', async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const target = await userByTag(req.body.tag);
    const result = await sendRequest(req.user.sub, target._id);
    const relationshipNow = result.status === 'accepted' ? 'friends' : 'outgoing';
    res.status(result.created ? 201 : 200).json({ status: result.status, relationship: relationshipNow, user: memberCard(target) });
  })
);

router.post(
  '/requests/:tag/accept',
  friendWriteLimiter,
  handle('POST /api/friends/requests/:tag/accept', async (req, res) => {
    const other = await userByTag(req.params.tag);
    await acceptRequest(req.user.sub, other._id);
    res.json({ status: 'accepted', relationship: 'friends', user: memberCard(other) });
  })
);

/** Decline a request they sent, or cancel one I sent. */
router.delete(
  '/requests/:tag',
  friendWriteLimiter,
  handle('DELETE /api/friends/requests/:tag', async (req, res) => {
    const other = await userByTag(req.params.tag);
    await removeRequest(req.user.sub, other._id);
    res.json({ status: 'removed', relationship: 'none' });
  })
);

router.get(
  '/:tag/profile',
  handle('GET /api/friends/:tag/profile', async (req, res) => {
    const tag = parseTagInput(req.params.tag);
    const friend = tag ? await User.findOne({ friendTag: tag }).select(`${CARD_FIELDS} progress.streak.checkins`).lean() : null;
    const since = friend ? await friendsSince(req.user.sub, friend._id) : null;
    // Same 404 whether the tag doesn't exist or you just aren't friends — don't confirm who exists.
    if (!since) {
      return res.status(404).json({ error: 'Not found', code: 'not-found' });
    }
    res.json({ profile: await buildFriendProfile(friend, { friendsSince: since }) });
  })
);

router.delete(
  '/:tag',
  friendWriteLimiter,
  handle('DELETE /api/friends/:tag', async (req, res) => {
    const other = await userByTag(req.params.tag);
    await unfriend(req.user.sub, other._id);
    res.json({ status: 'removed', relationship: 'none' });
  })
);

export default router;
