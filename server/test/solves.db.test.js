/**
 * Integration tests for solve tracking against a real MongoDB
 * (throwaway `dsa-tracker-test-solves` database; skipped if MongoDB isn't running).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../src/models/User.js';
import { Solve } from '../src/models/Solve.js';
import { syncSolves } from '../src/lib/solves.js';
import { useTestDb } from './helpers/db.js';

const db = useTestDb('solves', [User, Solve]);
const connected = () => db.connected;

const T0 = new Date('2026-10-01T00:00:00Z'); // account created
const T1 = new Date('2026-11-24T05:00:00Z');
const T2 = new Date('2026-11-25T05:00:00Z');
const T3 = new Date('2026-11-26T05:00:00Z');
const T4 = new Date('2026-11-27T05:00:00Z');

async function freshUser(email) {
  const user = await User.create({ email, passwordHash: 'x' });
  await User.collection.updateOne({ _id: user._id }, { $set: { createdAt: T0 } });
  return User.findById(user._id);
}

async function solveOf(user, lcNumber) {
  return Solve.findOne({ userId: user._id, lcNumber }).lean();
}

test('first sync backfills earlier progress; new ticks are live', async (t) => {
  if (!connected()) return t.skip('no local MongoDB');
  let user = await freshUser('first@example.com');

  // Had Two Sum (1) and Is Subsequence (392) before tracking; now also ticks Trapping Rain Water (42).
  await syncSolves(user, new Set([1, 392]), new Set([1, 392, 42]), T1);

  const s1 = await solveOf(user, 1);
  assert.equal(s1.source, 'backfill');
  assert.equal(s1.solvedAt.getTime(), T0.getTime());
  const s42 = await solveOf(user, 42);
  assert.equal(s42.source, 'live');
  assert.equal(s42.solvedAt.getTime(), T1.getTime());
  assert.equal(s42.points, 15);
  assert.equal(s42.difficulty, 'Hard');

  user = await User.findById(user._id);
  assert.ok(user.solvesSyncedAt, 'solvesSyncedAt is set after the first sync');
  assert.equal(await Solve.countDocuments({ userId: user._id }), 3);
});

test('unticking deactivates; re-ticking keeps the original solvedAt and source', async (t) => {
  if (!connected()) return t.skip('no local MongoDB');
  let user = await freshUser('retick@example.com');
  await syncSolves(user, new Set([1]), new Set([1, 42]), T1);
  user = await User.findById(user._id);

  await syncSolves(user, new Set([1, 42]), new Set([1]), T2);
  assert.equal((await solveOf(user, 42)).active, false);

  await syncSolves(user, new Set([1]), new Set([1, 42]), T3);
  const s42 = await solveOf(user, 42);
  assert.equal(s42.active, true);
  assert.equal(s42.solvedAt.getTime(), T1.getTime(), 're-ticking must not move it into a later week');

  // An old backfilled problem stays backfilled when re-ticked.
  await syncSolves(user, new Set([1, 42]), new Set([42]), T3);
  await syncSolves(user, new Set([42]), new Set([1, 42]), T4);
  const s1 = await solveOf(user, 1);
  assert.equal(s1.source, 'backfill');
  assert.equal(s1.solvedAt.getTime(), T0.getTime());
  assert.equal(await Solve.countDocuments({ userId: user._id }), 2);
});

test('a missed sync is repaired by the next save', async (t) => {
  if (!connected()) return t.skip('no local MongoDB');
  let user = await freshUser('repair@example.com');
  await syncSolves(user, new Set(), new Set([1]), T1);
  user = await User.findById(user._id);

  // Suppose the sync for ticking 3 failed: progress has it, the solves collection doesn't.
  // The next save (which also ticks 42) passes `before` = {1, 3}.
  const result = await syncSolves(user, new Set([1, 3]), new Set([1, 3, 42]), T2);
  assert.deepEqual(result.added, [3, 42]);
  assert.equal((await solveOf(user, 3)).source, 'live');
});

test('running sync twice with the same data changes nothing', async (t) => {
  if (!connected()) return t.skip('no local MongoDB');
  let user = await freshUser('idempotent@example.com');
  await syncSolves(user, new Set(), new Set([1, 42]), T1);
  user = await User.findById(user._id);
  const again = await syncSolves(user, new Set([1, 42]), new Set([1, 42]), T2);
  assert.deepEqual(again, { added: [], removed: [] });
  assert.equal((await solveOf(user, 42)).solvedAt.getTime(), T1.getTime());
});
