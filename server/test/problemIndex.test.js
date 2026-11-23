import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA } from '../../shared/data/problems.js';
import { PRACTICE_DAYS } from '../../shared/data/practicePlan.js';
import {
  LC_INFO,
  SHEET_KEY_TO_LC,
  TOTALS,
  countByDifficulty,
  expandSheetDone,
  lcSetFromKeys,
  sheetKeysForLc,
  toggleProblemEverywhere
} from '../../shared/problemIndex.js';

// 392 "Is Subsequence" is listed under five topics.
const IS_SUBSEQUENCE = 392;

test('totals count unique problems on the sheet', () => {
  assert.deepEqual(TOTALS, { all: 1677, easy: 449, medium: 884, hard: 344 });
  assert.equal(TOTALS.easy + TOTALS.medium + TOTALS.hard, TOTALS.all);
});

test('every LeetCode number has a single difficulty across sheet and practice', () => {
  const seen = new Map();
  const conflicts = [];
  const check = (num, difficulty, where) => {
    if (!seen.has(num)) seen.set(num, difficulty);
    else if (seen.get(num) !== difficulty) conflicts.push(`${num} (${where})`);
  };
  DATA.forEach((s) => s.p.forEach(([num, , d]) => check(num, d, `section ${s.id}`)));
  PRACTICE_DAYS.forEach((day) => day.problems.forEach(([num, , d]) => check(num, d, `day ${day.day}`)));
  assert.deepEqual(conflicts, []);
});

test('every practice-plan problem is also on the sheet', () => {
  const missing = [];
  PRACTICE_DAYS.forEach((day) =>
    day.problems.forEach(([num]) => {
      if (!sheetKeysForLc(num).length) missing.push(num);
    })
  );
  assert.deepEqual(missing, []);
});

test('sheet keys map back to their LeetCode number', () => {
  assert.equal(SHEET_KEY_TO_LC.get('1_0'), 1); // Two Sum
  assert.equal(LC_INFO.get(1).name, 'Two Sum');
  assert.equal(sheetKeysForLc(IS_SUBSEQUENCE).length, 5);
});

test('lcSetFromKeys de-duplicates across sections and practice, ignoring unknown keys', () => {
  const keys = sheetKeysForLc(IS_SUBSEQUENCE);
  const set = lcSetFromKeys([...keys, '1_0', 'not-a-key'], ['p1_0']); // p1_0 is Two Sum again
  assert.deepEqual([...set].sort((a, b) => a - b), [1, IS_SUBSEQUENCE]);
  assert.deepEqual(countByDifficulty(set), { total: 2, easy: 2, medium: 0, hard: 0 });
});

test('toggleProblemEverywhere ticks and unticks every section', () => {
  const keys = sheetKeysForLc(IS_SUBSEQUENCE);
  const on = toggleProblemEverywhere(['1_0'], keys[0]);
  assert.deepEqual(new Set(on), new Set(['1_0', ...keys]));

  // Unticking from a different section removes all of them.
  const off = toggleProblemEverywhere(on, keys[3]);
  assert.deepEqual(off, ['1_0']);
});

test('toggleProblemEverywhere keeps working for unknown keys', () => {
  assert.deepEqual(toggleProblemEverywhere([], 'x_1'), ['x_1']);
  assert.deepEqual(toggleProblemEverywhere(['x_1'], 'x_1'), []);
});

test('expandSheetDone fills in sibling sections and practice-only ticks', () => {
  const keys = sheetKeysForLc(IS_SUBSEQUENCE);
  assert.deepEqual(new Set(expandSheetDone([keys[2]])), new Set(keys));

  // Word Break (139) used to exist only in the practice plan; a practice tick now shows on the sheet.
  const wordBreakPracticeKey = [...PRACTICE_DAYS.entries()]
    .flatMap(([, day]) => day.problems.map(([num], i) => [num, `p${day.day}_${i}`]))
    .find(([num]) => num === 139)[1];
  assert.deepEqual(expandSheetDone([], [wordBreakPracticeKey]), sheetKeysForLc(139));
});

test('expandSheetDone returns the same array when nothing changes', () => {
  const done = ['1_0', ...sheetKeysForLc(IS_SUBSEQUENCE)];
  const twoSumKeys = sheetKeysForLc(1);
  const complete = [...new Set([...done, ...twoSumKeys])];
  assert.equal(expandSheetDone(complete), complete);
});
