import { DATA } from '../data/problems';
import { PRACTICE_DAYS } from '../data/practicePlan';

/** All sheet keys `sectionId_index` for a LeetCode problem number. */
export function sheetKeysForLeetCodeNumber(num) {
  if (num == null || Number.isNaN(num)) return [];
  const keys = [];
  for (const s of DATA) {
    s.p.forEach((row, idx) => {
      if (row[0] === num) keys.push(`${s.id}_${idx}`);
    });
  }
  return keys;
}

/** Practice day + index → LeetCode number, or undefined. */
export function practiceProblemNumber(day, pi) {
  const dayEntry = PRACTICE_DAYS.find((d) => d.day === day);
  return dayEntry?.problems?.[pi]?.[0];
}

/** When a practice row is marked done, add matching sheet keys. (Unchecking practice does not remove sheet marks.) */
export function syncSheetDoneForPractice(sheetDone, day, pi, practiceNowDone) {
  if (!practiceNowDone) return sheetDone;
  const num = practiceProblemNumber(day, pi);
  if (num == null) return sheetDone;
  const keys = sheetKeysForLeetCodeNumber(num);
  if (!keys.length) return sheetDone;
  const ss = new Set(sheetDone || []);
  keys.forEach((k) => ss.add(k));
  return [...ss];
}
