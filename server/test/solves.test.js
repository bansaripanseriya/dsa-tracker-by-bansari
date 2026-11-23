import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, diffSolves } from '../src/lib/solves.js';

test('diffSolves reports added and removed problems, sorted', () => {
  assert.deepEqual(diffSolves(new Set([1, 42, 392]), new Set([392, 1, 3, 2])), { added: [2, 3], removed: [42] });
  assert.deepEqual(diffSolves(new Set(), new Set()), { added: [], removed: [] });
});

test('computeStats counts unique problems by difficulty and finds the last check-in', () => {
  const now = new Date('2026-11-24T10:00:00Z');
  // 1 Two Sum (Easy), 42 Trapping Rain Water (Hard), 3 Longest Substring (Medium)
  const stats = computeStats(new Set([1, 42, 3]), ['2026-11-20', '2026-11-24', '2026-11-01'], now);
  assert.deepEqual(stats, { totalSolved: 3, easy: 1, medium: 1, hard: 1, lastCheckin: '2026-11-24', updatedAt: now });
  assert.equal(computeStats(new Set(), [], now).lastCheckin, null);
});
