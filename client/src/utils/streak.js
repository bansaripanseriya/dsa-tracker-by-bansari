export function dsaTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Sorted YYYY-MM-DD list with today included once (for login / session sync). */
/** How many distinct check-in days fall in the current calendar week (Sun–Sat). */
export function countCheckinsCurrentWeek(checkins) {
  const set = new Set(checkins || []);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const sun = new Date(now);
  sun.setDate(now.getDate() - now.getDay());
  let c = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(sun);
    d.setDate(sun.getDate() + i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (set.has(ds)) c += 1;
  }
  return c;
}

export function appendTodayIfMissing(checkins) {
  const today = dsaTodayStr();
  const out = [...(checkins || [])];
  if (out.includes(today)) {
    out.sort();
    return out;
  }
  out.push(today);
  out.sort();
  return out;
}

export function calcStreak(checkins) {
  if (!checkins?.length) {
    return { current: 0, best: 0, total: 0 };
  }
  const sorted = [...checkins].sort();
  let best = 1;
  let temp = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      temp++;
      if (temp > best) best = temp;
    } else {
      temp = 1;
    }
  }
  let curStreak = 0;
  const d = new Date();
  while (true) {
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (sorted.includes(ds)) {
      curStreak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return { current: curStreak, best: Math.max(best, curStreak), total: sorted.length };
}

/** Unique sorted YYYY-MM-DD check-ins for a calendar year. */
export function yearCheckinDates(checkins, year) {
  const y = String(year);
  return [...new Set((checkins || []).filter((c) => typeof c === 'string' && c.startsWith(`${y}-`)))].sort();
}

/** Longest run of consecutive days within that year (from unique check-in dates). */
export function maxStreakInYear(sortedDates) {
  if (!sortedDates?.length) return 0;
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const a = new Date(`${sortedDates[i - 1]}T12:00:00`);
    const b = new Date(`${sortedDates[i]}T12:00:00`);
    const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      cur++;
      if (cur > best) best = cur;
    } else if (diff > 0) {
      cur = 1;
    }
  }
  return best;
}

export function yearActivityStats(checkins, year) {
  const dates = yearCheckinDates(checkins, year);
  return {
    activeDays: dates.length,
    maxStreak: maxStreakInYear(dates)
  };
}

/**
 * Columns = weeks (Sun→Sat), rows = weekday. Cells before/after the year are inYear: false.
 */
export function buildYearHeatmap(checkins, year) {
  const set = new Set(checkins || []);
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const ws = new Date(year, 0, 1);
  ws.setDate(1 - jan1.getDay());
  const lastSaturday = new Date(dec31);
  lastSaturday.setDate(dec31.getDate() + (6 - dec31.getDay()));
  const weeks = [];
  for (; ws <= lastSaturday; ws.setDate(ws.getDate() + 7)) {
    const col = [];
    for (let r = 0; r < 7; r++) {
      const d = new Date(ws);
      d.setHours(12, 0, 0, 0);
      d.setDate(ws.getDate() + r);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const inYear = d.getFullYear() === year;
      col.push({ ds, inYear, done: inYear && set.has(ds) });
    }
    weeks.push(col);
  }
  return weeks;
}

/**
 * Left edge (px) of each week column and total scroll width.
 * Matches flex: `.gh-weeks { gap: colGap }` between columns of width `cellW`.
 */
export function computeHeatmapLayout(weeks, cellW, colGap) {
  const n = weeks?.length ?? 0;
  const colStarts = new Array(n);
  let x = 0;
  for (let wi = 0; wi < n; wi++) {
    colStarts[wi] = x;
    x += cellW;
    if (wi < n - 1) x += colGap;
  }
  return { colStarts, innerWidth: Math.max(x, 0) };
}

/** Week column index → short month label (first occurrence of day 1 in that month). */
export function heatmapMonthTicks(weeks, year) {
  const ticks = [];
  const seen = new Set();
  for (let wi = 0; wi < weeks.length; wi++) {
    const col = weeks[wi];
    for (const cell of col) {
      if (!cell.inYear) continue;
      const parts = cell.ds.split('-').map(Number);
      const yy = parts[0];
      const mm = parts[1];
      const dd = parts[2];
      if (yy !== year || dd !== 1) continue;
      const m0 = mm - 1;
      if (seen.has(m0)) continue;
      seen.add(m0);
      const label = new Date(year, m0, 1).toLocaleString('default', { month: 'short' });
      ticks.push({ wi, label });
      break;
    }
  }
  return ticks;
}

/** Minutes per day when a check-in exists (no per-session timestamps in app). */
export const DEFAULT_LEARN_SESSION_MIN = 30;

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Y-axis max (minutes) with comfortable steps for small or large totals. */
export function niceLearnYMax(maxMinutes) {
  const m = Math.max(maxMinutes, 1);
  if (m <= 40) return 40;
  if (m <= 200) return Math.ceil(m / 20) * 20;
  return Math.ceil(m / 60) * 60;
}

export function earliestCheckinYear(checkins) {
  let minY = null;
  for (const c of checkins || []) {
    if (typeof c !== 'string' || c.length < 4) continue;
    const y = parseInt(c.slice(0, 4), 10);
    if (!Number.isNaN(y)) minY = minY == null ? y : Math.min(minY, y);
  }
  return minY;
}

/**
 * Earliest year shown in heatmap / yearly nav: at least `yearsBack` empty years before "now"
 * so you can open past years even with no check-ins there.
 */
export function heatmapNavMinYear(checkins, currentYear, yearsBack = 20) {
  const floor = currentYear - yearsBack;
  const e = earliestCheckinYear(checkins);
  if (e == null) return floor;
  return Math.min(e, floor);
}

/**
 * Sunday-first week: weekOffset 0 = current week, 1 = previous, etc.
 * `minutes` is 0 or sessionMinutes for days with a check-in.
 */
export function buildWeeklyLearningBars(checkins, weekOffset, sessionMinutes = DEFAULT_LEARN_SESSION_MIN) {
  const chart = buildLearningTimeChart(checkins, 'weekly', weekOffset, sessionMinutes);
  const days = chart.bars.map((b) => ({
    ds: b.key,
    date: new Date(`${b.key}T12:00:00`),
    minutes: b.minutes,
    dowLetter: b.xLabel
  }));
  return {
    days,
    yMax: chart.yMax,
    rangeLabel: chart.rangeLabel,
    weekTotalMinutes: chart.bars.reduce((a, b) => a + b.minutes, 0),
    sessionMinutes: chart.sessionMinutes
  };
}

const MAX_LEARN_WEEK_OFFSET = 520;
const MAX_LEARN_MONTH_OFFSET = 360;

/**
 * @typedef {'weekly'|'monthly'|'yearly'|'all'} LearningChartMode
 * @returns {{ kind: LearningChartMode, bars: { key: string, xLabel: string, minutes: number, title: string }[], yMax: number, rangeLabel: string, sessionMinutes: number, canGoOlder: boolean, canGoNewer: boolean }}
 */
export function buildLearningTimeChart(checkins, mode, offset, sessionMinutes = DEFAULT_LEARN_SESSION_MIN) {
  const set = new Set(checkins || []);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const cy = now.getFullYear();

  if (mode === 'weekly') {
    const sun = new Date(now);
    sun.setDate(now.getDate() - now.getDay() - offset * 7);
    const bars = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sun);
      d.setDate(sun.getDate() + i);
      const ds = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      const minutes = set.has(ds) ? sessionMinutes : 0;
      const xLabel = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i];
      bars.push({ key: ds, xLabel, minutes, title: `${ds}: ${minutes} min` });
    }
    const maxM = Math.max(...bars.map((b) => b.minutes), 0);
    const yMax = niceLearnYMax(maxM);
    const start = new Date(sun);
    const end = new Date(sun);
    end.setDate(sun.getDate() + 6);
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    const fmtDay = (dt) => dt.getDate();
    const fmtMon = (dt) => dt.toLocaleString('default', { month: 'short' });
    let rangeLabel;
    if (sameMonth) {
      rangeLabel = `${fmtDay(start)} – ${fmtDay(end)} ${fmtMon(end)} ${end.getFullYear()}`;
    } else {
      rangeLabel = `${fmtDay(start)} ${fmtMon(start)} – ${fmtDay(end)} ${fmtMon(end)} ${end.getFullYear()}`;
    }
    return {
      kind: 'weekly',
      bars,
      yMax,
      rangeLabel,
      sessionMinutes,
      canGoOlder: offset < MAX_LEARN_WEEK_OFFSET,
      canGoNewer: offset > 0
    };
  }

  if (mode === 'monthly') {
    const anchor = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const yy = anchor.getFullYear();
    const mm = anchor.getMonth();
    const dim = new Date(yy, mm + 1, 0).getDate();
    const bars = [];
    let maxM = 0;
    for (let day = 1; day <= dim; day++) {
      const ds = `${yy}-${pad2(mm + 1)}-${pad2(day)}`;
      const minutes = set.has(ds) ? sessionMinutes : 0;
      maxM = Math.max(maxM, minutes);
      bars.push({ key: ds, xLabel: String(day), minutes, title: `${ds}: ${minutes} min` });
    }
    const rangeLabel = anchor.toLocaleString('default', { month: 'long', year: 'numeric' });
    return {
      kind: 'monthly',
      bars,
      yMax: niceLearnYMax(maxM),
      rangeLabel,
      sessionMinutes,
      canGoOlder: offset < MAX_LEARN_MONTH_OFFSET,
      canGoNewer: offset > 0
    };
  }

  if (mode === 'yearly') {
    const year = cy - offset;
    const bars = [];
    let maxM = 0;
    for (let mi = 0; mi < 12; mi++) {
      const prefix = `${year}-${pad2(mi + 1)}`;
      let count = 0;
      for (const c of set) {
        if (typeof c === 'string' && c.startsWith(prefix)) count += 1;
      }
      const minutes = count * sessionMinutes;
      maxM = Math.max(maxM, minutes);
      const xLabel = new Date(year, mi, 1).toLocaleString('default', { month: 'short' });
      bars.push({
        key: `${year}-${pad2(mi + 1)}`,
        xLabel,
        minutes,
        title: `${xLabel} ${year}: ${count} active day${count === 1 ? '' : 's'} · ${minutes} min`
      });
    }
    return {
      kind: 'yearly',
      bars,
      yMax: niceLearnYMax(maxM),
      rangeLabel: String(year),
      sessionMinutes,
      canGoOlder: year > heatmapNavMinYear(checkins, cy, 20),
      canGoNewer: offset > 0
    };
  }

  /* all — one bar per calendar year from first check-in (or last 6 years) through today */
  const eY = earliestCheckinYear(checkins);
  const minY = eY == null ? cy - 5 : Math.min(eY, cy - 5);
  const bars = [];
  let maxM = 0;
  for (let y = minY; y <= cy; y++) {
    let count = 0;
    for (const c of set) {
      if (typeof c === 'string' && c.startsWith(`${y}-`)) count += 1;
    }
    const minutes = count * sessionMinutes;
    maxM = Math.max(maxM, minutes);
    bars.push({
      key: String(y),
      xLabel: String(y),
      minutes,
      title: `${y}: ${count} active day${count === 1 ? '' : 's'} · ${minutes} min`
    });
  }
  return {
    kind: 'all',
    bars,
    yMax: niceLearnYMax(maxM),
    rangeLabel: `All time · ${minY}–${cy}`,
    sessionMinutes,
    canGoOlder: false,
    canGoNewer: false
  };
}
