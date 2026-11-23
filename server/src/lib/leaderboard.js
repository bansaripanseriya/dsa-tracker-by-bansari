import mongoose from 'mongoose';
import { Solve } from '../models/Solve.js';
import { User } from '../models/User.js';
import { CARD_FIELDS, memberCard } from './cards.js';
import { friendIds } from './friendships.js';
import { weekRangeIST } from '../../../shared/scoring.js';

export const MAX_WEEKS_BACK = 8;

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id)); // aggregate() doesn't cast

/**
 * Points and difficulty counts per user for one leaderboard week.
 * Only `live`, still-ticked solves first solved inside the week count — backfilled
 * history and un-ticked problems never do.
 * @returns {Promise<Map<string, { points, easy, medium, hard }>>}
 */
export async function weekScores(userIds, { start, end }) {
  const rows = await Solve.aggregate([
    {
      $match: {
        userId: { $in: userIds.map(toObjectId) },
        active: true,
        source: 'live',
        solvedAt: { $gte: start, $lt: end }
      }
    },
    {
      $group: {
        _id: '$userId',
        points: { $sum: '$points' },
        easy: { $sum: { $cond: [{ $eq: ['$difficulty', 'Easy'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$difficulty', 'Medium'] }, 1, 0] } },
        hard: { $sum: { $cond: [{ $eq: ['$difficulty', 'Hard'] }, 1, 0] } }
      }
    }
  ]);
  return new Map(rows.map((r) => [String(r._id), { points: r.points, easy: r.easy, medium: r.medium, hard: r.hard }]));
}

/**
 * Pure: competition ranking ("1224") — equal points share a rank and the next rank skips.
 * @param {number[]} points  in any order
 * @returns {(p: number) => number}  rank for a points value
 */
export function competitionRanker(points) {
  return (p) => 1 + points.filter((x) => x > p).length;
}

const EMPTY = { points: 0, easy: 0, medium: 0, hard: 0 };

/**
 * The weekly leaderboard for a user: themselves plus their friends.
 *
 * @returns {Promise<{
 *   week: { start: Date, end: Date, offset: number, live: boolean },
 *   rows: Array<memberCard & { points, easy, medium, hard, solved, rank, rankChange, isMe }>,
 *   me: object
 * }>}
 * `rankChange`: places gained since the previous week (+2 = up two, -1 = down one);
 * null when nobody scored in the previous week, so there's nothing to compare with.
 */
export async function weeklyLeaderboard(meId, { offset = 0, now = new Date() } = {}) {
  const ids = [String(meId), ...(await friendIds(meId)).map(String)];
  const week = weekRangeIST(now, offset);
  const [current, previous, users] = await Promise.all([
    weekScores(ids, week),
    weekScores(ids, weekRangeIST(now, offset + 1)),
    User.find({ _id: { $in: ids } }).select(CARD_FIELDS).lean()
  ]);

  const present = users.map((u) => String(u._id)); // ignore ids whose account no longer exists
  const rankNow = competitionRanker(present.map((id) => (current.get(id) ?? EMPTY).points));
  const prevPoints = present.map((id) => (previous.get(id) ?? EMPTY).points);
  const rankBefore = competitionRanker(prevPoints);
  const anyoneScoredBefore = prevPoints.some((p) => p > 0);

  const rows = users
    .map((user) => {
      const id = String(user._id);
      const score = current.get(id) ?? EMPTY;
      const rank = rankNow(score.points);
      return {
        ...memberCard(user),
        points: score.points,
        easy: score.easy,
        medium: score.medium,
        hard: score.hard,
        solved: score.easy + score.medium + score.hard,
        rank,
        rankChange: anyoneScoredBefore ? rankBefore((previous.get(id) ?? EMPTY).points) - rank : null,
        isMe: id === String(meId)
      };
    })
    .sort((a, b) => a.rank - b.rank || (a.name || a.tag).localeCompare(b.name || b.tag));

  return {
    week: { start: week.start, end: week.end, offset, live: offset === 0 },
    rows,
    me: rows.find((r) => r.isMe) ?? null
  };
}
