/**
 * Friend tags and the name search index against a real MongoDB
 * (throwaway `dsa-tracker-test-identity` database; skipped if MongoDB isn't running).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../src/models/User.js';
import { ensureFriendTag, selfDiscoverability } from '../src/lib/identity.js';
import { isValidTag } from '../src/lib/tags.js';
import { useTestDb } from './helpers/db.js';

const db = useTestDb('identity', [User]);

test('new users get a name search index and default discoverability', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  const user = await User.create({ email: 'new@example.com', passwordHash: 'x', name: 'Priya Sharma' });
  const stored = await User.findById(user._id).select('+nameSearch discoverability friendTag').lean();
  assert.deepEqual(stored.nameSearch.tokens, ['priya', 'sharma']);
  assert.ok(stored.nameSearch.trigrams.includes('pri'));
  assert.equal(stored.discoverability.byName, true);
  assert.equal(stored.friendTag, undefined, 'no tag until ensureFriendTag runs');
});

test('nameSearch is not returned unless asked for', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  await User.create({ email: 'hidden@example.com', passwordHash: 'x', name: 'Hidden Name' });
  const plain = await User.findOne({ email: 'hidden@example.com' }).lean();
  assert.equal(plain.nameSearch, undefined);
});

test('ensureFriendTag assigns once and never replaces a tag', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  const user = await User.create({ email: 'tag@example.com', passwordHash: 'x', name: 'Rohan Iyer' });
  const tag = await ensureFriendTag(user);
  assert.ok(isValidTag(tag));
  assert.equal(await ensureFriendTag(user), tag);

  const reloaded = await User.findById(user._id);
  assert.equal(await ensureFriendTag(reloaded), tag);
  assert.equal((await User.findById(user._id).lean()).friendTag, tag);
});

test('an existing user without a tag or name index gets both', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  // Simulate an account created before this feature: no friendTag, no nameSearch.
  const { insertedId } = await User.collection.insertOne({ email: 'old@example.com', passwordHash: 'x', name: 'Kabir Singh' });
  const old = await User.findById(insertedId);
  assert.equal(selfDiscoverability(old).byName, true, 'name search is on by default for existing users');

  await ensureFriendTag(old);
  const stored = await User.findById(insertedId).select('+nameSearch').lean();
  assert.ok(isValidTag(stored.friendTag));
  assert.deepEqual(stored.nameSearch.tokens, ['kabir', 'singh']);
});

test('concurrent requests end up with the same single tag', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  const user = await User.create({ email: 'race@example.com', passwordHash: 'x' });
  const copies = await Promise.all([1, 2, 3, 4].map(() => User.findById(user._id)));
  const tags = await Promise.all(copies.map((u) => ensureFriendTag(u)));
  assert.equal(new Set(tags).size, 1);
  assert.equal((await User.findById(user._id).lean()).friendTag, tags[0]);
});

test('friend tags are unique', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  const a = await User.create({ email: 'a@example.com', passwordHash: 'x' });
  const tag = await ensureFriendTag(a);
  await assert.rejects(
    User.collection.insertOne({ email: 'b@example.com', passwordHash: 'x', friendTag: tag }),
    (err) => err.code === 11000
  );
});

test('changing the name rebuilds the search index', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  const user = await User.create({ email: 'rename@example.com', passwordHash: 'x', name: 'Old Name' });
  user.name = 'Ananya Rao';
  await user.save();
  const stored = await User.findById(user._id).select('+nameSearch').lean();
  assert.deepEqual(stored.nameSearch.tokens, ['ananya', 'rao']);
});
