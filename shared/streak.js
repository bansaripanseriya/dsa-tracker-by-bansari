/**
 * Streak maths shared by the client and the server.
 * Check-ins are calendar dates "YYYY-MM-DD" (the user's local date when recorded).
 */
import { IST_OFFSET_MS } from './scoring.js';

const pad2 = (n) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" in the machine's local time zone (what the browser records). */
export function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** "YYYY-MM-DD" in India Standard Time — the server's notion of "today". */
export function istDateStr(now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${pad2(ist.getUTCMonth() + 1)}-${pad2(ist.getUTCDate())}`;
}

/** Calendar arithmetic on "YYYY-MM-DD" strings (no time zone involved). */
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/**
 * { current, best, total } for a list of check-in dates.
 * `current` counts consecutive days ending on `today` (0 if `today` has no check-in).
 */
export function calcStreak(checkins, today = localDateStr()) {
  const sorted = [...new Set((checkins || []).filter((c) => typeof c === 'string'))].sort();
  if (!sorted.length) return { current: 0, best: 0, total: 0 };

  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = addDays(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1;
    if (run > best) best = run;
  }

  const set = new Set(sorted);
  let current = 0;
  for (let d = today; set.has(d); d = addDays(d, -1)) current += 1;

  return { current, best: Math.max(best, current), total: sorted.length };
}
