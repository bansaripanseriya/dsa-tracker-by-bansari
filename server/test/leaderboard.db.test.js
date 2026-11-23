/**
 * Weekly leaderboard against a real MongoDB
 * (throwaway `dsa-tracker-test-leaderboard` database; skipped if MongoDB isn't running).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../src/models/User.js';
import { Friendship } from '../src/models/Friendship.js';
import { Solve } from '../src/models/Solve.js';
import { weeklyLeaderboard } from '../src/lib/leaderboard.js';
import { acceptRequest, sendRequest } from '../src/lib/friendships.js';
import { ensureFriendTag } from '../src/lib/identity.js';
import { useTestDb } from './helpers/db.js';

const db = useTestDb('leaderboard', [User, Friendship, Solve]);

// Wed 2026-11-25 11:30 IST. This week: Mon 2026-11-23 00:00 IST = 2026-11-22T18:30Z.
const NOW = new Date('2026-11-25T06:00:00Z');
const THIS_WEEK = new Date('2026-11-24T05:00:00Z');
const LAST_WEEK = new Date('2026-11-18T05:00:00Z');
const POINTS = { Easy: 5, Medium: 10, Hard: 15 };

let n = 0;
async function makeUser(name) {
  n += 1;
  const user = await User.create({ email: `lb${n}@example.com`, passwordHash: 'x', name });
  await ensureFriendTag(user);
  return user;
}

async function befriend(a, b) {
  await sendRequest(a._id, b._id);
  await acceptRequest(b._id, a._id);
}

let lcCounter = 10000; // unique fake problem numbers per solve
async function solves(user, list) {
  await Solve.insertMany(
    list.map(([difficulty, solvedAt, extra = {}]) => ({
      userId: user._id,
      lcNumber: lcCounter++,
      difficulty,
      points: POINTS[difficulty],
      solvedAt,
      source: 'live',
      ...extra
    }))
  );
}

const repeat = (count, difficulty, when) => Array.from({ length: count }, () => [difficulty, when]);

test('ranks me and my friends; ties share a rank; strangers never appear', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  const me = await makeUser('Aditi');
  const priya = await makeUser('Priya');
  const rohan = await makeUser('Rohan');
  const kabir = await makeUser('Kabir');
  const stranger = await makeUser('Stranger');
  for (const f of [priya, rohan, kabir]) await befriend(me, f);

  // This week: Priya 135, Rohan 110, me 95, Kabir 0 — and the stranger 500 (must not show).
  await solves(priya, [...repeat(4, 'Easy', THIS_WEEK), ...repeat(7, 'Medium', THIS_WEEK), ...repeat(3, 'Hard', THIS_WEEK)]);
  await solves(rohan, [...repeat(6, 'Easy', THIS_WEEK), ...repeat(5, 'Medium', THIS_WEEK), ...repeat(2, 'Hard', THIS_WEEK)]);
  await solves(me, [...repeat(5, 'Easy', THIS_WEEK), ...repeat(4, 'Medium', THIS_WEEK), ...repeat(2, 'Hard', THIS_WEEK)]);
  await solves(stranger, repeat(50, 'Medium', THIS_WEEK));
  // Last week: Rohan 150, me 105, Priya 105 (tie), Kabir 55.
  await solves(rohan, [...repeat(5, 'Easy', LAST_WEEK), ...repeat(8, 'Medium', LAST_WEEK), ...repeat(3, 'Hard', LAST_WEEK)]);
  await solves(me, [...repeat(6, 'Easy', LAST_WEEK), ...repeat(6, 'Medium', LAST_WEEK), ...repeat(1, 'Hard', LAST_WEEK)]);
  await solves(priya, [...repeat(3, 'Easy', LAST_WEEK), ...repeat(6, 'Medium', LAST_WEEK), ...repeat(2, 'Hard', LAST_WEEK)]);
  await solves(kabir, [...repeat(7, 'Easy', LAST_WEEK), ...repeat(2, 'Medium', LAST_WEEK)]);

  const board = await weeklyLeaderboard(me._id, { now: NOW });
  assert.equal(board.week.start.toISOString(), '2026-11-22T18:30:00.000Z');
  assert.equal(board.week.live, true);
  assert.deepEqual(
    board.rows.map((r) => [r.name, r.points, r.rank, r.rankChange]),
    [
      ['Priya', 135, 1, 1], // was 2nd (tied) → up 1
      ['Rohan', 110, 2, -1], // was 1st → down 1
      ['Aditi', 95, 3, -1], // was 2nd (tied) → down 1
      ['Kabir', 0, 4, 0] // was 4th → same
    ]
  );
  assert.deepEqual([board.me.easy, board.me.medium, board.me.hard, board.me.solved], [5, 4, 2, 11]);
  assert.equal(board.me.isMe, true);
  assert.ok(!board.rows.some((r) => r.name === 'Stranger'));

  const last = await weeklyLeaderboard(me._id, { now: NOW, offset: 1 });
  assert.equal(last.week.live, false);
  assert.deepEqual(
    last.rows.map((r) => [r.name, r.points, r.rank]),
    [
      ['Rohan', 150, 1],
      ['Aditi', 105, 2],
      ['Priya', 105, 2],
      ['Kabir', 55, 4]
    ]
  );
  assert.ok(!JSON.stringify(board).includes('example.com'), 'no emails');
});

test('backfilled, un-ticked and out-of-week solves never count', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  const me = await makeUser('Edge');
  await solves(me, [
    ['Hard', THIS_WEEK], // 15 ✔
    ['Hard', THIS_WEEK, { source: 'backfill' }], // ✘ history from before tracking
    ['Hard', THIS_WEEK, { active: false }], // ✘ un-ticked
    ['Medium', new Date('2026-11-22T18:30:00Z')], // 10 ✔ Mon 00:00 IST — first moment of the week
    ['Medium', new Date('2026-11-22T18:29:59Z')], // ✘ Sun 23:59:59 IST — last week
    ['Easy', new Date('2026-11-29T18:30:00Z')] // ✘ next week
  ]);
  const board = await weeklyLeaderboard(me._id, { now: NOW });
  assert.equal(board.me.points, 25);
  assert.deepEqual([board.me.easy, board.me.medium, board.me.hard], [0, 1, 1]);
});

test('no friends: just me; no rank change when nobody scored last week', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  const me = await makeUser('Alone');
  await solves(me, [['Easy', THIS_WEEK]]);
  const board = await weeklyLeaderboard(me._id, { now: NOW });
  assert.equal(board.rows.length, 1);
  assert.equal(board.me.rank, 1);
  assert.equal(board.me.rankChange, null);
});
