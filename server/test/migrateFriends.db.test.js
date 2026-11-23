/**
 * The friends migration against a real MongoDB
 * (throwaway `dsa-tracker-test-migrate` database; skipped if MongoDB isn't running).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../src/models/User.js';
import { Solve } from '../src/models/Solve.js';
import { Friendship } from '../src/models/Friendship.js';
import { migrateFriends } from '../src/lib/migrateFriends.js';
import { sheetKeysForLc } from '../../shared/problemIndex.js';
import { useTestDb } from './helpers/db.js';

const db = useTestDb('migrate', [User, Solve, Friendship]);

const CREATED = new Date('2026-03-01T00:00:00Z');
const IS_SUBSEQUENCE = sheetKeysForLc(392); // listed in 5 sections

/** A document exactly as an account created before the friends feature looks in MongoDB. */
const oldAccount = (email, name, progress, extra = {}) => ({
  email,
  passwordHash: 'x',
  name,
  progress: { sheetDone: [], practiceDone: [], streak: { checkins: [] }, openSections: [1, 2, 3], ...progress },
  createdAt: CREATED,
  updatedAt: CREATED,
  ...extra
});

test('fills in everything an old account is missing, and a second run changes nothing', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  await User.collection.insertMany([
    oldAccount('old1@example.com', 'Meera Nair', {
      sheetDone: ['1_0', IS_SUBSEQUENCE[0]], // Two Sum + Is Subsequence ticked in one section only
      streak: { checkins: ['2026-11-20', '2026-11-21'] }
    }),
    oldAccount('old2@example.com', '', {}), // no name, no progress
    // Already chose to hide from name search — must stay hidden.
    oldAccount('hidden@example.com', 'Dev Patel', { sheetDone: ['1_0'] }, { discoverability: { byName: false } })
  ]);

  const dry = await migrateFriends({ dryRun: true });
  assert.equal(dry.users, 3);
  assert.equal(dry.tagsAssigned, 3);
  assert.equal(await Solve.countDocuments(), 0, 'dry run writes nothing');
  assert.equal(await User.countDocuments({ friendTag: { $exists: true } }), 0, 'dry run writes nothing');

  const first = await migrateFriends();
  assert.deepEqual(first, {
    users: 3,
    tagsAssigned: 3,
    nameIndexBuilt: 0, // built together with the tag
    discoverabilitySet: 2,
    sheetExpanded: 2, // Two Sum (1_0) is also listed in more than one section
    solvesBackfilled: 3,
    statsUpdated: 3
  });

  const meera = await User.findOne({ email: 'old1@example.com' }).select('+nameSearch').lean();
  assert.match(meera.friendTag, /^[2-9A-HJKMNP-Z]{7}$/);
  assert.deepEqual(meera.nameSearch.tokens, ['meera', 'nair']);
  assert.equal(meera.discoverability.byName, true);
  assert.ok(IS_SUBSEQUENCE.every((k) => meera.progress.sheetDone.includes(k)), 'ticked in all 5 sections');
  assert.deepEqual(
    { total: meera.stats.totalSolved, easy: meera.stats.easy, last: meera.stats.lastCheckin },
    { total: 2, easy: 2, last: '2026-11-21' }
  );
  const solves = await Solve.find({ userId: meera._id }).lean();
  assert.equal(solves.length, 2);
  assert.ok(solves.every((s) => s.source === 'backfill' && s.solvedAt.getTime() === CREATED.getTime()), 'backfill never scores');
  assert.ok(meera.solvesSyncedAt);

  const hidden = await User.findOne({ email: 'hidden@example.com' }).lean();
  assert.equal(hidden.discoverability.byName, false, "a user's opt-out is respected");

  const tagsBefore = (await User.find().select('friendTag').lean()).map((u) => u.friendTag).sort();
  const second = await migrateFriends();
  assert.deepEqual(second, {
    users: 3,
    tagsAssigned: 0,
    nameIndexBuilt: 0,
    discoverabilitySet: 0,
    sheetExpanded: 0,
    solvesBackfilled: 0,
    statsUpdated: 0
  });
  const tagsAfter = (await User.find().select('friendTag').lean()).map((u) => u.friendTag).sort();
  assert.deepEqual(tagsAfter, tagsBefore, 'tags are never replaced');
  assert.equal(await Solve.countDocuments(), 3, 'no duplicate solves');
});

test('an account that already has a tag but no name index gets one', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  await User.collection.insertOne(oldAccount('tagged@example.com', 'Tanvi Joshi', {}, { friendTag: 'T5WJ8MK' }));
  await migrateFriends();
  const tanvi = await User.findOne({ email: 'tagged@example.com' }).select('+nameSearch').lean();
  assert.equal(tanvi.friendTag, 'T5WJ8MK');
  assert.deepEqual(tanvi.nameSearch.tokens, ['tanvi', 'joshi']);
});
