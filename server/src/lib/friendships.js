import { Friendship } from '../models/Friendship.js';

export const MAX_FRIENDS = 200;
export const MAX_PENDING_OUTGOING = 50;

/** An expected, user-facing failure. Routes turn it into `res.status(status).json({ error, code })`. */
export class FriendError extends Error {
  constructor(code, status, message) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const same = (a, b) => String(a) === String(b);

/** The document key for a pair, in sorted order. */
export function pairOf(a, b) {
  const [userA, userB] = [String(a), String(b)].sort();
  return { userA, userB };
}

export function findPair(a, b) {
  return Friendship.findOne(pairOf(a, b));
}

/** 'none' | 'outgoing' | 'incoming' | 'friends' for `meId`, given the pair's document. */
export function relationshipFrom(doc, meId) {
  if (!doc) return 'none';
  if (doc.status === 'accepted') return 'friends';
  return same(doc.requestedBy, meId) ? 'outgoing' : 'incoming';
}

/** Relationship between me and one other user (adds 'self'). */
export async function relationship(meId, otherId) {
  if (same(meId, otherId)) return 'self';
  return relationshipFrom(await findPair(meId, otherId), meId);
}

/** Map of otherId (string) → relationship, for a list of users, in one query. */
export async function relationshipsWith(meId, otherIds) {
  const ids = otherIds.filter((id) => !same(id, meId));
  const out = new Map(otherIds.map((id) => [String(id), same(id, meId) ? 'self' : 'none']));
  if (!ids.length) return out;
  const docs = await Friendship.find({
    $or: [
      { userA: meId, userB: { $in: ids } },
      { userB: meId, userA: { $in: ids } }
    ]
  }).lean();
  for (const doc of docs) {
    const other = same(doc.userA, meId) ? doc.userB : doc.userA;
    out.set(String(other), relationshipFrom(doc, meId));
  }
  return out;
}

const involving = (meId) => ({ $or: [{ userA: meId }, { userB: meId }] });

/** Accepted friendships of a user: [{ friendId, since }]. */
export async function acceptedFriendships(meId) {
  const docs = await Friendship.find({ status: 'accepted', ...involving(meId) }).lean();
  return docs.map((d) => ({ friendId: same(d.userA, meId) ? d.userB : d.userA, since: d.acceptedAt || d.updatedAt }));
}

export async function friendIds(meId) {
  return (await acceptedFriendships(meId)).map((f) => f.friendId);
}

/** Pending requests involving a user, split by direction. */
export async function pendingRequests(meId) {
  const docs = await Friendship.find({ status: 'pending', ...involving(meId) }).sort({ createdAt: -1 }).lean();
  const incoming = [];
  const outgoing = [];
  for (const d of docs) {
    const otherId = same(d.userA, meId) ? d.userB : d.userA;
    (same(d.requestedBy, meId) ? outgoing : incoming).push({ otherId, createdAt: d.createdAt });
  }
  return { incoming, outgoing };
}

export function countPendingIncoming(meId) {
  return Friendship.countDocuments({ status: 'pending', requestedBy: { $ne: meId }, ...involving(meId) });
}

function countFriends(userId) {
  return Friendship.countDocuments({ status: 'accepted', ...involving(userId) });
}

async function assertRoomForFriend(meId, otherId) {
  if ((await countFriends(meId)) >= MAX_FRIENDS) {
    throw new FriendError('friend-limit', 409, `You can have at most ${MAX_FRIENDS} friends.`);
  }
  if ((await countFriends(otherId)) >= MAX_FRIENDS) {
    throw new FriendError('their-friend-limit', 409, 'They already have the maximum number of friends.');
  }
}

async function acceptDoc(doc) {
  const updated = await Friendship.findOneAndUpdate(
    { _id: doc._id, status: 'pending' },
    { $set: { status: 'accepted', acceptedAt: new Date() } },
    { new: true }
  );
  return Boolean(updated);
}

/**
 * Send a friend request (the invite link and search both use this).
 *   none                    → create a pending request          → { status: 'pending', created: true }
 *   pending, sent by me     → nothing changes                   → { status: 'pending', created: false }
 *   pending, sent by them   → accept it (requests crossed)      → { status: 'accepted' }
 *   already friends         → FriendError 'already-friends' (409)
 * Safe if two requests race: the unique pair index rejects the second insert and we re-read.
 */
export async function sendRequest(meId, targetId) {
  if (same(meId, targetId)) {
    throw new FriendError('self', 400, "You can't add yourself.");
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const doc = await findPair(meId, targetId);
    if (!doc) {
      await assertRoomForFriend(meId, targetId);
      const pendingOut = await Friendship.countDocuments({ status: 'pending', requestedBy: meId });
      if (pendingOut >= MAX_PENDING_OUTGOING) {
        throw new FriendError('too-many-pending', 429, `You have ${MAX_PENDING_OUTGOING} requests waiting. Wait for some to be answered.`);
      }
      try {
        await Friendship.create({ ...pairOf(meId, targetId), requestedBy: meId, status: 'pending' });
        return { status: 'pending', created: true };
      } catch (error) {
        if (error?.code === 11000) continue; // the other person (or a double click) got there first
        throw error;
      }
    }
    if (doc.status === 'accepted') {
      throw new FriendError('already-friends', 409, "You're already friends.");
    }
    if (same(doc.requestedBy, meId)) {
      return { status: 'pending', created: false };
    }
    await assertRoomForFriend(meId, targetId);
    if (await acceptDoc(doc)) return { status: 'accepted' };
    // It changed under us (accepted or deleted meanwhile) — look again.
  }
  throw new FriendError('conflict', 409, 'Something changed — please try again.');
}

/** Accept a request that `otherId` sent me. */
export async function acceptRequest(meId, otherId) {
  const doc = await findPair(meId, otherId);
  if (!doc || doc.status !== 'pending' || same(doc.requestedBy, meId)) {
    throw new FriendError('no-request', 404, 'There is no request from them to accept.');
  }
  await assertRoomForFriend(meId, otherId);
  if (!(await acceptDoc(doc))) {
    throw new FriendError('no-request', 404, 'There is no request from them to accept.');
  }
}

/** Decline a request they sent, or cancel one I sent. */
export async function removeRequest(meId, otherId) {
  const { deletedCount } = await Friendship.deleteOne({ ...pairOf(meId, otherId), status: 'pending' });
  if (!deletedCount) throw new FriendError('no-request', 404, 'There is no pending request between you.');
}

export async function unfriend(meId, otherId) {
  const { deletedCount } = await Friendship.deleteOne({ ...pairOf(meId, otherId), status: 'accepted' });
  if (!deletedCount) throw new FriendError('not-friends', 404, "You aren't friends.");
}

/** When two users became friends, or null if they aren't. */
export async function friendsSince(meId, otherId) {
  const doc = await findPair(meId, otherId);
  return doc?.status === 'accepted' ? doc.acceptedAt || doc.updatedAt : null;
}
