/**
 * Lookups over the problem data, shared by the client and the server.
 *
 * Progress is stored as keys:
 *   sheet    "<sectionId>_<index>"  e.g. "1_0" (Two Sum, first problem of section 1)
 *   practice "p<day>_<index>"       e.g. "p1_0"
 * The same LeetCode problem can appear under several sheet sections (and in the
 * practice plan), so anything that counts or scores problems must go through the
 * LeetCode number, never the raw keys.
 */
import { DATA } from './data/problems.js';
import { PRACTICE_DAYS } from './data/practicePlan.js';

/** "sid_idx" → LeetCode number */
export const SHEET_KEY_TO_LC = new Map();
/** "pDay_idx" → LeetCode number */
export const PRACTICE_KEY_TO_LC = new Map();
/** LeetCode number → { num, name, difficulty, sheetKeys } (first occurrence wins for name/difficulty) */
export const LC_INFO = new Map();

for (const section of DATA) {
  section.p.forEach(([num, name, difficulty], i) => {
    const key = `${section.id}_${i}`;
    SHEET_KEY_TO_LC.set(key, num);
    let info = LC_INFO.get(num);
    if (!info) {
      info = { num, name, difficulty, sheetKeys: [] };
      LC_INFO.set(num, info);
    }
    info.sheetKeys.push(key);
  });
}

for (const day of PRACTICE_DAYS) {
  day.problems.forEach(([num, name, difficulty], i) => {
    PRACTICE_KEY_TO_LC.set(`p${day.day}_${i}`, num);
    if (!LC_INFO.has(num)) LC_INFO.set(num, { num, name, difficulty, sheetKeys: [] });
  });
}

function countDifficulties(nums) {
  const out = { total: 0, easy: 0, medium: 0, hard: 0 };
  for (const num of nums) {
    const info = LC_INFO.get(num);
    if (!info) continue;
    out.total += 1;
    if (info.difficulty === 'Easy') out.easy += 1;
    else if (info.difficulty === 'Medium') out.medium += 1;
    else if (info.difficulty === 'Hard') out.hard += 1;
  }
  return out;
}

/** Unique problems on the sheet: { all, easy, medium, hard }. */
export const TOTALS = (() => {
  const c = countDifficulties([...LC_INFO.values()].filter((i) => i.sheetKeys.length).map((i) => i.num));
  return { all: c.total, easy: c.easy, medium: c.medium, hard: c.hard };
})();

/** All sheet keys for a LeetCode number (a new array; empty if it's not on the sheet). */
export function sheetKeysForLc(num) {
  return [...(LC_INFO.get(num)?.sheetKeys ?? [])];
}

/** Set of LeetCode numbers marked done across sheet and practice keys. Unknown keys are ignored. */
export function lcSetFromKeys(sheetDone = [], practiceDone = []) {
  const set = new Set();
  for (const k of sheetDone || []) {
    const num = SHEET_KEY_TO_LC.get(k);
    if (num != null) set.add(num);
  }
  for (const k of practiceDone || []) {
    const num = PRACTICE_KEY_TO_LC.get(k);
    if (num != null) set.add(num);
  }
  return set;
}

/** { total, easy, medium, hard } for a collection of LeetCode numbers. */
export function countByDifficulty(lcNumbers) {
  return countDifficulties(lcNumbers);
}

/**
 * Toggle a sheet problem in every section it appears in.
 * If `key` is currently done, all of its sibling keys are removed; otherwise all are added.
 */
export function toggleProblemEverywhere(sheetDone, key) {
  const set = new Set(sheetDone || []);
  const num = SHEET_KEY_TO_LC.get(key);
  const keys = num == null ? [key] : sheetKeysForLc(num);
  const wasDone = set.has(key);
  for (const k of keys) {
    if (wasDone) set.delete(k);
    else set.add(k);
  }
  return [...set];
}

/**
 * Make sheet progress consistent: every problem that is done (on the sheet or in the
 * practice plan) is ticked in all of its sheet sections. Unknown keys are kept as-is.
 * Returns the same array when nothing changes.
 */
export function expandSheetDone(sheetDone = [], practiceDone = []) {
  const current = sheetDone || [];
  const set = new Set(current);
  for (const num of lcSetFromKeys(current, practiceDone)) {
    for (const k of LC_INFO.get(num)?.sheetKeys ?? []) set.add(k);
  }
  return set.size === current.length ? current : [...set];
}
