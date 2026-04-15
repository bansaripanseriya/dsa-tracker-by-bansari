import { appendTodayIfMissing, dsaTodayStr } from './streak.js';
import { syncSheetDoneForPractice } from './practiceSheetSync.js';

const GUEST_KEY = 'dsa-tracker-guest-progress-v1';

function normalize(p) {
  const streak = p?.streak && Array.isArray(p.streak.checkins) ? { checkins: [...p.streak.checkins] } : { checkins: [] };
  return {
    sheetDone: Array.isArray(p?.sheetDone) ? [...p.sheetDone] : [],
    practiceDone: Array.isArray(p?.practiceDone) ? [...p.practiceDone] : [],
    streak,
    openSections: Array.isArray(p?.openSections) ? [...p.openSections] : [1, 2, 3]
  };
}

export function loadGuestProgress() {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return normalize({});
    return normalize(JSON.parse(raw));
  } catch {
    return normalize({});
  }
}

export function saveGuestProgress(data) {
  try {
    const n = normalize(data);
    localStorage.setItem(GUEST_KEY, JSON.stringify(n));
  } catch {
    /* ignore quota */
  }
}

export function clearGuestProgress() {
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {
    /* ignore */
  }
}

function unionStrings(a, b) {
  return [...new Set([...(a || []), ...(b || [])])];
}

/** Apply a pending sheet/practice toggle after merge (user action before login). */
export function applyPendingToggle(merged, pending) {
  if (!pending || !pending.type) return merged;
  const next = {
    ...merged,
    sheetDone: [...(merged.sheetDone || [])],
    practiceDone: [...(merged.practiceDone || [])],
    streak: { checkins: [...(merged.streak?.checkins || [])] }
  };
  if (pending.type === 'sheet') {
    const k = `${pending.sid}_${pending.pi}`;
    const s = new Set(next.sheetDone);
    if (s.has(k)) s.delete(k);
    else s.add(k);
    next.sheetDone = [...s];
    return next;
  }
  if (pending.type === 'practice') {
    const k = `p${pending.day}_${pending.pi}`;
    const s = new Set(next.practiceDone);
    if (s.has(k)) s.delete(k);
    else s.add(k);
    next.practiceDone = [...s];
    const nowDone = s.has(k);
    next.sheetDone = syncSheetDoneForPractice(next.sheetDone, pending.day, pending.pi, nowDone);
    return next;
  }
  if (pending.type === 'checkin') {
    const list = [...(next.streak.checkins || [])];
    const today = dsaTodayStr();
    if (!list.includes(today)) list.push(today);
    list.sort();
    next.streak = { checkins: list };
    return next;
  }
  return merged;
}

/** Union guest/local snapshot with server progress (sheet, practice, streak, sections). */
export function mergeWithServerProgress(local, server) {
  const s = server || {};
  const streakIn = (st) => (st && Array.isArray(st.checkins) ? st.checkins : []);
  const open = unionStrings(
    (local.openSections || []).map(String),
    (s.openSections || []).map(String)
  )
    .map((x) => parseInt(x, 10))
    .filter((n) => !Number.isNaN(n));
  open.sort((a, b) => a - b);
  return {
    sheetDone: unionStrings(local.sheetDone, s.sheetDone).sort(),
    practiceDone: unionStrings(local.practiceDone, s.practiceDone).sort(),
    streak: { checkins: unionStrings(streakIn(local.streak), streakIn(s.streak)).sort() },
    openSections: open.length ? open : [1, 2, 3]
  };
}

/** After login/register: union guest localStorage progress into the account and clear guest storage. */
export async function mergeGuestProgressAfterAuth(apiClient, setProgress) {
  const guest = loadGuestProgress();
  const { data: me } = await apiClient.get('/auth/me');
  const merged = mergeWithServerProgress(guest, me.progress || {});
  merged.streak = { checkins: appendTodayIfMissing(merged.streak?.checkins) };
  const { data: saved } = await apiClient.put('/progress', {
    sheetDone: merged.sheetDone,
    practiceDone: merged.practiceDone,
    streak: { checkins: merged.streak.checkins || [] },
    openSections: merged.openSections
  });
  setProgress(saved.progress || merged);
  clearGuestProgress();
}
