import { TOTALS, countByDifficulty, lcSetFromKeys } from '@shared/problemIndex.js';

/**
 * Sheet completion counted by unique LeetCode problem (a problem listed under several
 * topics counts once), from `sheetDone` keys `sectionId_index`.
 */
export function computeSheetStats(sheetDone) {
  const done = countByDifficulty(lcSetFromKeys(sheetDone));
  const total = TOTALS.all;
  const pctRaw = total ? Math.min(100, (done.total / total) * 100) : 0;
  return {
    total,
    done: done.total,
    pctRaw,
    pctLabel: formatSheetPctLabel(done.total, total),
    easy: { done: done.easy, total: TOTALS.easy },
    med: { done: done.medium, total: TOTALS.medium },
    hard: { done: done.hard, total: TOTALS.hard }
  };
}

/** Whole percent when ≥1%; one decimal under 1%; "<0.1" when progress is positive but tiny. */
function formatSheetPctLabel(done, total) {
  if (!total || done <= 0) return '0';
  const raw = (done / total) * 100;
  if (raw >= 99.95) return '100';
  if (raw >= 1) return String(Math.round(raw));
  if (raw < 0.05) return '<0.1';
  return (Math.round(raw * 10) / 10).toFixed(1);
}
