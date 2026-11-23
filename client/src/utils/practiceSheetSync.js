import { PRACTICE_KEY_TO_LC, sheetKeysForLc } from '@shared/problemIndex.js';

export { toggleProblemEverywhere, expandSheetDone } from '@shared/problemIndex.js';

/** All sheet keys `sectionId_index` for a LeetCode problem number. */
export function sheetKeysForLeetCodeNumber(num) {
  if (num == null || Number.isNaN(num)) return [];
  return sheetKeysForLc(num);
}

/** Practice day + index → LeetCode number, or undefined. */
export function practiceProblemNumber(day, pi) {
  return PRACTICE_KEY_TO_LC.get(`p${day}_${pi}`);
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
