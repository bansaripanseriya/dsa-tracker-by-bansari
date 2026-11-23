import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, calcStreak, istDateStr } from '../../shared/streak.js';

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2027-01-01', -1), '2026-12-31');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});

test('istDateStr is the IST calendar date', () => {
  assert.equal(istDateStr(new Date('2026-11-23T18:29:00Z')), '2026-11-23'); // 23:59 IST
  assert.equal(istDateStr(new Date('2026-11-23T18:30:00Z')), '2026-11-24'); // 00:00 IST
});

test('calcStreak: current run ending today, best run, total days', () => {
  const checkins = ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-10-01', '2026-10-02'];
  assert.deepEqual(calcStreak(checkins, '2026-11-24'), { current: 5, best: 5, total: 7 });
});

test('calcStreak: no check-in today means current is 0', () => {
  assert.deepEqual(calcStreak(['2026-11-22', '2026-11-23'], '2026-11-24'), { current: 0, best: 2, total: 2 });
});

test('calcStreak: duplicates and junk are ignored; empty input', () => {
  assert.deepEqual(calcStreak(['2026-11-24', '2026-11-24', null, 7], '2026-11-24'), { current: 1, best: 1, total: 1 });
  assert.deepEqual(calcStreak([], '2026-11-24'), { current: 0, best: 0, total: 0 });
  assert.deepEqual(calcStreak(undefined), { current: 0, best: 0, total: 0 });
});

test('calcStreak: streak across a month boundary', () => {
  assert.equal(calcStreak(['2026-11-29', '2026-11-30', '2026-12-01'], '2026-12-01').current, 3);
});
