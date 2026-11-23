import { Solve } from '../models/Solve.js';
import { memberCard } from './cards.js';
import { LC_INFO, TOTALS } from '../../../shared/problemIndex.js';
import { weekRangeIST } from '../../../shared/scoring.js';
import { addDays, calcStreak, istDateStr } from '../../../shared/streak.js';

export const HEATMAP_DAYS = 26 * 7;
const RECENT_SOLVES = 10;

/**
 * A friend's profile page (friends only — the caller must have checked that).
 * `friend` needs CARD_FIELDS plus `progress.streak.checkins` selected.
 * The weekly rank is added by the leaderboard (phase 5).
 */
export async function buildFriendProfile(friend, { friendsSince, now = new Date() }) {
  const today = istDateStr(now);
  const checkins = friend.progress?.streak?.checkins || [];
  const streak = calcStreak(checkins, today);
  const firstHeatmapDay = addDays(today, -(HEATMAP_DAYS - 1));
  const { start, end } = weekRangeIST(now);

  const [weekRows, recent] = await Promise.all([
    Solve.aggregate([
      { $match: { userId: friend._id, active: true, source: 'live', solvedAt: { $gte: start, $lt: end } } },
      { $group: { _id: '$difficulty', count: { $sum: 1 }, points: { $sum: '$points' } } }
    ]),
    Solve.find({ userId: friend._id, active: true, source: 'live' }).sort({ solvedAt: -1 }).limit(RECENT_SOLVES).lean()
  ]);

  const thisWeek = { start, end, points: 0, easy: 0, medium: 0, hard: 0 };
  for (const row of weekRows) {
    thisWeek.points += row.points;
    if (row._id === 'Easy') thisWeek.easy = row.count;
    else if (row._id === 'Medium') thisWeek.medium = row.count;
    else if (row._id === 'Hard') thisWeek.hard = row.count;
  }

  const stats = friend.stats || {};
  return {
    ...memberCard(friend),
    friendsSince,
    solved: {
      total: stats.totalSolved ?? 0,
      easy: stats.easy ?? 0,
      medium: stats.medium ?? 0,
      hard: stats.hard ?? 0,
      outOf: { ...TOTALS }
    },
    streak: { current: streak.current, best: streak.best, activeDays: streak.total },
    lastCheckin: stats.lastCheckin ?? null,
    checkins: [...new Set(checkins)].filter((d) => d >= firstHeatmapDay && d <= today).sort(),
    thisWeek,
    recentSolves: recent.map((s) => ({
      lcNumber: s.lcNumber,
      name: LC_INFO.get(s.lcNumber)?.name ?? `Problem ${s.lcNumber}`,
      difficulty: s.difficulty,
      points: s.points,
      solvedAt: s.solvedAt
    }))
  };
}
