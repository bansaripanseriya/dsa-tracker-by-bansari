/**
 * Weekly leaderboard scoring, shared by the client and the server.
 */

/** Points per solved problem, by difficulty. */
export const POINTS = Object.freeze({ Easy: 5, Medium: 10, Hard: 15 });

export function pointsFor(difficulty) {
  return POINTS[difficulty] ?? 0;
}

/** India Standard Time is UTC+5:30 all year (no daylight saving). */
export const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Leaderboard week containing `now`, shifted back `offset` weeks.
 * Weeks run Monday 00:00 IST (inclusive) to the next Monday 00:00 IST (exclusive).
 * @returns {{ start: Date, end: Date }}
 */
export function weekRangeIST(now = new Date(), offset = 0) {
  // Shift so that the UTC getters read the IST wall clock.
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const daysSinceMonday = (ist.getUTCDay() + 6) % 7;
  const mondayIstWallClock = Date.UTC(
    ist.getUTCFullYear(),
    ist.getUTCMonth(),
    ist.getUTCDate() - daysSinceMonday - 7 * offset
  );
  const start = new Date(mondayIstWallClock - IST_OFFSET_MS);
  return { start, end: new Date(start.getTime() + WEEK_MS) };
}
