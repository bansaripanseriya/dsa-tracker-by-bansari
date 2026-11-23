import { test } from 'node:test';
import assert from 'node:assert/strict';
import { competitionRanker } from '../src/lib/leaderboard.js';

test('competition ranking: ties share a rank and the next one skips (1, 2, 2, 4)', () => {
  const rank = competitionRanker([150, 105, 105, 65, 0]);
  assert.deepEqual([150, 105, 105, 65, 0].map(rank), [1, 2, 2, 4, 5]);
});

test('everyone on zero shares first place', () => {
  const rank = competitionRanker([0, 0, 0]);
  assert.equal(rank(0), 1);
});
