import { DATA } from '../data/problems';

/** Aggregate sheet completion and per-difficulty counts from `sheetDone` keys `sectionId_index`. */
export function computeSheetStats(sheetDone) {
  const set = new Set(sheetDone || []);
  let total = 0;
  let done = 0;
  let eT = 0;
  let eD = 0;
  let mT = 0;
  let mD = 0;
  let hT = 0;
  let hD = 0;

  for (const s of DATA) {
    s.p.forEach((p, i) => {
      total += 1;
      const k = `${s.id}_${i}`;
      const is = set.has(k);
      const diff = p[2];
      if (diff === 'Easy') {
        eT += 1;
        if (is) eD += 1;
      } else if (diff === 'Medium') {
        mT += 1;
        if (is) mD += 1;
      } else if (diff === 'Hard') {
        hT += 1;
        if (is) hD += 1;
      }
      if (is) done += 1;
    });
  }

  const pctRaw = total ? Math.min(100, (done / total) * 100) : 0;
  const pctLabel = formatSheetPctLabel(done, total);
  return {
    total,
    done,
    pctRaw,
    pctLabel,
    easy: { done: eD, total: eT },
    med: { done: mD, total: mT },
    hard: { done: hD, total: hT }
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
