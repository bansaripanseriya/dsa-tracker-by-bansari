import { Solve } from '../models/Solve.js';
import { User } from '../models/User.js';
import { LC_INFO, countByDifficulty } from '../../../shared/problemIndex.js';
import { pointsFor } from '../../../shared/scoring.js';

/**
 * Pure: what changed between two sets of LeetCode numbers.
 * @param {Set<number>} before
 * @param {Set<number>} after
 */
export function diffSolves(before, after) {
  const added = [...after].filter((n) => !before.has(n)).sort((a, b) => a - b);
  const removed = [...before].filter((n) => !after.has(n)).sort((a, b) => a - b);
  return { added, removed };
}

/** Pure: the denormalized `user.stats` for a set of done LeetCode numbers. */
export function computeStats(lcSet, checkins = [], now = new Date()) {
  const c = countByDifficulty(lcSet);
  const sorted = [...(checkins || [])].sort();
  return {
    totalSolved: c.total,
    easy: c.easy,
    medium: c.medium,
    hard: c.hard,
    lastCheckin: sorted.length ? sorted[sorted.length - 1] : null,
    updatedAt: now
  };
}

/**
 * Mark problems as solved. A problem that was solved before keeps its original
 * `solvedAt` and `source` — it is only reactivated — so un-ticking and re-ticking
 * an old problem can never count toward the current week again.
 */
async function upsertSolves(userId, lcNumbers, { solvedAt, source }) {
  const ops = [];
  for (const num of lcNumbers) {
    const info = LC_INFO.get(num);
    if (!info) continue;
    ops.push({
      updateOne: {
        filter: { userId, lcNumber: num },
        update: {
          $setOnInsert: { difficulty: info.difficulty, points: pointsFor(info.difficulty), solvedAt, source },
          $set: { active: true }
        },
        upsert: true
      }
    });
  }
  if (ops.length) await Solve.bulkWrite(ops, { ordered: false });
}

/**
 * One-time: record everything a user had already done before solve tracking existed.
 * These never count toward a leaderboard week. Safe to run more than once.
 */
export async function backfillSolves(user, lcSet) {
  await upsertSolves(user._id, lcSet, { solvedAt: user.createdAt || new Date(), source: 'backfill' });
  await User.updateOne({ _id: user._id, solvesSyncedAt: null }, { $set: { solvesSyncedAt: new Date() } });
}

/**
 * Bring the `solves` collection in line with a user's current progress.
 *
 * Reconciles against the user's existing solve documents (not the previous progress),
 * so a failed or interrupted save is corrected by the next one.
 *
 * @param {object} user        the User document (needs _id, createdAt, solvesSyncedAt)
 * @param {Set<number>} before problems done in the previously stored progress
 * @param {Set<number>} after  problems done in the new progress
 * @param {Date} now
 * @returns {Promise<{ added: number[], removed: number[] }>}
 */
export async function syncSolves(user, before, after, now = new Date()) {
  if (!user.solvesSyncedAt) {
    // Progress saved before this feature existed must not become this week's points.
    await backfillSolves(user, before);
  }

  const existing = await Solve.find({ userId: user._id }, { lcNumber: 1, active: 1, _id: 0 }).lean();
  const active = new Set(existing.filter((s) => s.active).map((s) => s.lcNumber));
  const { added, removed } = diffSolves(active, after);

  await upsertSolves(user._id, added, { solvedAt: now, source: 'live' });
  if (removed.length) {
    await Solve.updateMany({ userId: user._id, lcNumber: { $in: removed } }, { $set: { active: false } });
  }
  return { added, removed };
}
