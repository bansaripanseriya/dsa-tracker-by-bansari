import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POINTS, pointsFor, weekRangeIST } from '../../shared/scoring.js';

const iso = (d) => d.toISOString();

test('points per difficulty', () => {
  assert.deepEqual({ ...POINTS }, { Easy: 5, Medium: 10, Hard: 15 });
  assert.equal(pointsFor('Hard'), 15);
  assert.equal(pointsFor('Unknown'), 0);
});

test('week starts Monday 00:00 IST (Sunday 18:30 UTC)', () => {
  // Wednesday 2026-11-25 10:00 IST
  const { start, end } = weekRangeIST(new Date('2026-11-25T04:30:00Z'));
  assert.equal(iso(start), '2026-11-22T18:30:00.000Z'); // Mon 2026-11-23 00:00 IST
  assert.equal(iso(end), '2026-11-29T18:30:00.000Z'); // Mon 2026-11-30 00:00 IST
});

test('Sunday 23:59 IST still belongs to the previous week', () => {
  const { start } = weekRangeIST(new Date('2026-11-29T18:29:00Z')); // Sun 23:59 IST
  assert.equal(iso(start), '2026-11-22T18:30:00.000Z');
});

test('Monday 00:00 IST starts a new week', () => {
  const { start } = weekRangeIST(new Date('2026-11-29T18:30:00Z')); // Mon 00:00 IST
  assert.equal(iso(start), '2026-11-29T18:30:00.000Z');
});

test('Monday early morning IST is already the new week even though it is Sunday in UTC', () => {
  const { start } = weekRangeIST(new Date('2026-11-29T20:00:00Z')); // Mon 01:30 IST
  assert.equal(iso(start), '2026-11-29T18:30:00.000Z');
});

test('offset goes back whole weeks, across month and year boundaries', () => {
  const now = new Date('2027-01-06T06:00:00Z'); // Wed 2027-01-06 11:30 IST
  assert.equal(iso(weekRangeIST(now, 0).start), '2027-01-03T18:30:00.000Z'); // Mon 2027-01-04
  assert.equal(iso(weekRangeIST(now, 1).start), '2026-12-27T18:30:00.000Z'); // Mon 2026-12-28
  assert.equal(iso(weekRangeIST(now, 6).start), '2026-11-22T18:30:00.000Z'); // Mon 2026-11-23
});
