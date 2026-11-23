/**
 * Friend request state machine and friend profiles against a real MongoDB
 * (throwaway `dsa-tracker-test-friends` database; skipped if MongoDB isn't running).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../src/models/User.js';
import { Friendship } from '../src/models/Friendship.js';
import { Solve } from '../src/models/Solve.js';
import {
  FriendError,
  acceptRequest,
  countPendingIncoming,
  friendIds,
  pendingRequests,
  relationship,
  relationshipsWith,
  removeRequest,
  sendRequest,
  unfriend
} from '../src/lib/friendships.js';
import { buildFriendProfile } from '../src/lib/profile.js';
import { ensureFriendTag } from '../src/lib/identity.js';
import { useTestDb } from './helpers/db.js';

const db = useTestDb('friends', [User, Friendship, Solve]);
let n = 0;

async function makeUser(name) {
  n += 1;
  const user = await User.create({ email: `u${n}@example.com`, passwordHash: 'x', name });
  await ensureFriendTag(user);
  return user;
}

const rejectsWith = (promise, code) =>
  assert.rejects(promise, (err) => err instanceof FriendError && err.code === code);

test('request → accept → unfriend', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  const a = await makeUser('Aditi');
  const p = await makeUser('Priya');

  assert.deepEqual(await sendRequest(a._id, p._id), { status: 'pending', created: true });
  assert.equal(await relationship(a._id, p._id), 'outgoing');
  assert.equal(await relationship(p._id, a._id), 'incoming');
  assert.equal(await countPendingIncoming(p._id), 1);
  assert.equal((await pendingRequests(a._id)).outgoing.length, 1);

  // Sending again changes nothing.
  assert.deepEqual(await sendRequest(a._id, p._id), { status: 'pending', created: false });
  assert.equal(await Friendship.countDocuments(), 1);

  // Only the receiver can accept.
  await rejectsWith(acceptRequest(a._id, p._id), 'no-request');
  await acceptRequest(p._id, a._id);
  assert.equal(await relationship(a._id, p._id), 'friends');
  assert.deepEqual((await friendIds(a._id)).map(String), [String(p._id)]);
  await rejectsWith(sendRequest(a._id, p._id), 'already-friends');

  await unfriend(p._id, a._id);
  assert.equal(await relationship(a._id, p._id), 'none');
  await rejectsWith(unfriend(a._id, p._id), 'not-friends');
});

test('requests that cross become a friendship', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  const a = await makeUser('Rohan');
  const b = await makeUser('Kabir');
  await sendRequest(a._id, b._id);
  assert.deepEqual(await sendRequest(b._id, a._id), { status: 'accepted' });
  assert.equal(await relationship(a._id, b._id), 'friends');
  assert.equal(await Friendship.countDocuments({ status: 'accepted' }), 1);
});

test('decline and cancel delete the request; you can ask again (no cooldown)', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  const a = await makeUser('Sneha');
  const b = await makeUser('Aarav');

  await sendRequest(a._id, b._id);
  await removeRequest(b._id, a._id); // b declines
  assert.equal(await relationship(a._id, b._id), 'none');

  await sendRequest(a._id, b._id);
  await removeRequest(a._id, b._id); // a cancels
  await rejectsWith(removeRequest(a._id, b._id), 'no-request');

  assert.deepEqual(await sendRequest(a._id, b._id), { status: 'pending', created: true });
});

test('you cannot add yourself', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  const a = await makeUser('Solo');
  await rejectsWith(sendRequest(a._id, a._id), 'self');
  assert.equal(await relationship(a._id, a._id), 'self');
});

test('simultaneous requests in both directions end as one friendship', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  const a = await makeUser('Race A');
  const b = await makeUser('Race B');
  const results = await Promise.all([sendRequest(a._id, b._id), sendRequest(b._id, a._id), sendRequest(a._id, b._id)]);
  assert.equal(await Friendship.countDocuments({ $or: [{ userA: a._id }, { userB: a._id }] }), 1);
  const rel = await relationship(a._id, b._id);
  assert.ok(['friends', 'outgoing', 'incoming'].includes(rel), rel);
  assert.ok(results.every((r) => ['pending', 'accepted'].includes(r.status)));
});

test('relationshipsWith answers for many users in one go', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  const me = await makeUser('Me');
  const friend = await makeUser('Friend');
  const asked = await makeUser('Asked');
  const asker = await makeUser('Asker');
  const stranger = await makeUser('Stranger');
  await sendRequest(me._id, friend._id);
  await acceptRequest(friend._id, me._id);
  await sendRequest(me._id, asked._id);
  await sendRequest(asker._id, me._id);

  const rel = await relationshipsWith(me._id, [friend._id, asked._id, asker._id, stranger._id, me._id]);
  assert.deepEqual(
    [friend, asked, asker, stranger, me].map((u) => rel.get(String(u._id))),
    ['friends', 'outgoing', 'incoming', 'none', 'self']
  );
});

test('friend profile: this week counts only live solves inside the IST week', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  const friend = await makeUser('Profile Friend');
  const now = new Date('2026-11-25T06:00:00Z'); // Wed 11:30 IST; week started Mon 2026-11-23 00:00 IST
  await Solve.insertMany([
    { userId: friend._id, lcNumber: 42, difficulty: 'Hard', points: 15, solvedAt: new Date('2026-11-24T05:00:00Z'), source: 'live' },
    { userId: friend._id, lcNumber: 3, difficulty: 'Medium', points: 10, solvedAt: new Date('2026-11-22T18:30:00Z'), source: 'live' }, // Mon 00:00 IST
    { userId: friend._id, lcNumber: 1, difficulty: 'Easy', points: 5, solvedAt: new Date('2026-11-22T18:29:00Z'), source: 'live' }, // Sun 23:59 IST
    { userId: friend._id, lcNumber: 217, difficulty: 'Easy', points: 5, solvedAt: new Date('2026-11-24T05:00:00Z'), source: 'backfill' },
    { userId: friend._id, lcNumber: 238, difficulty: 'Medium', points: 10, solvedAt: new Date('2026-11-24T06:00:00Z'), source: 'live', active: false }
  ]);
  const doc = {
    ...friend.toObject(),
    stats: { totalSolved: 4, easy: 2, medium: 1, hard: 1, lastCheckin: '2026-11-25' },
    progress: { streak: { checkins: ['2026-11-23', '2026-11-24', '2026-11-25', '2026-01-01'] } }
  };
  const profile = await buildFriendProfile(doc, { friendsSince: new Date('2026-10-12'), now });

  assert.equal(profile.thisWeek.points, 25);
  assert.deepEqual([profile.thisWeek.easy, profile.thisWeek.medium, profile.thisWeek.hard], [0, 1, 1]);
  assert.deepEqual(profile.streak, { current: 3, best: 3, activeDays: 4 });
  assert.deepEqual(profile.checkins, ['2026-11-23', '2026-11-24', '2026-11-25'], 'heatmap covers the last 26 weeks only');
  assert.deepEqual(
    profile.recentSolves.map((s) => s.lcNumber),
    [42, 3, 1],
    'recent solves: live and active only, newest first'
  );
  assert.equal(profile.recentSolves[0].name, 'Trapping Rain Water');
  assert.equal(profile.solved.outOf.all, 1677);
  assert.ok(!JSON.stringify(profile).includes('example.com'), 'no email in the profile');
});
