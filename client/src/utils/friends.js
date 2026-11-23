import api from '../api/client';
import { localDateStr } from '@shared/streak.js';
import { POINTS } from '@shared/scoring.js';

/** Fired after any friend action so the header badge and the Friends tab refresh. */
export const FRIENDS_CHANGED = 'dsa:friends-changed';
export function notifyFriendsChanged() {
  window.dispatchEvent(new Event(FRIENDS_CHANGED));
}

export const formatTag = (tag) => (tag ? `#${tag}` : '');

/** A person's display name; people without a name are shown by their tag (never their email). */
export const displayName = (p) => p?.name?.trim() || formatTag(p?.tag);
export const firstName = (p) => (p?.name?.trim() ? p.name.trim().split(/\s+/)[0] : formatTag(p?.tag));

export function initials(p) {
  const name = p?.name?.trim();
  if (!name) return (p?.tag || '?').slice(0, 2);
  const parts = name.split(/\s+/);
  return `${parts[0][0] || ''}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase();
}

/** Stable colour per person for initials avatars. */
export function hueFor(tag = '') {
  let h = 0;
  for (const ch of tag) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

/** API paths like "/api/users/..." → a URL that also works when VITE_API_BASE_URL points elsewhere. */
export function assetUrl(path) {
  if (!path) return null;
  const base = api.defaults.baseURL || '/api';
  return base.startsWith('/') ? path : `${base.replace(/\/api\/?$/, '')}${path}`;
}

const IST = 'Asia/Kolkata';
const dayMonth = new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: 'numeric', month: 'short' });
const dayMonthYear = new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric' });
const weekdayDay = new Intl.DateTimeFormat('en-IN', { timeZone: IST, weekday: 'short', day: 'numeric', month: 'short' });

/** "23 Nov – 29 Nov" for a leaderboard week (`end` is exclusive). */
export function formatWeekRange(start, end) {
  return `${dayMonth.format(new Date(start))} – ${dayMonth.format(new Date(new Date(end).getTime() - 1))}`;
}
export const formatDate = (d) => (d ? dayMonthYear.format(new Date(d)) : '');
export const formatSolvedAt = (d) => (d ? weekdayDay.format(new Date(d)) : '');

/** "today" / "yesterday" / "3 days ago" for a YYYY-MM-DD check-in date. */
export function relativeDay(dateStr) {
  if (!dateStr) return 'not yet';
  const today = localDateStr();
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${dateStr}T00:00:00Z`)) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/** The encouraging line under the leaderboard. */
export function leaderboardNudge(board) {
  const me = board?.me;
  if (!me) return '';
  if (!board.week.live) {
    const tied = board.rows.filter((r) => !r.isMe && r.points === me.points && me.points > 0);
    return `Final: you finished #${me.rank}${tied.length ? `, tied with ${firstName(tied[0])}` : ''} with ${me.points} pts.`;
  }
  if (board.rows.length === 1) return 'Add friends to see how your week compares.';
  const ahead = board.rows.filter((r) => r.points > me.points);
  if (!ahead.length) {
    return me.points > 0 ? "You're top of the board — hold on until Monday!" : 'Solve a problem to get on the board.';
  }
  const target = ahead[ahead.length - 1];
  const gap = target.points - me.points;
  let hint;
  if (gap <= POINTS.Easy) hint = 'One Easy problem would tie it.';
  else if (gap <= POINTS.Medium) hint = 'One Medium would tie it.';
  else if (gap <= POINTS.Hard) hint = 'One Hard would tie it.';
  else hint = `About ${Math.ceil(gap / POINTS.Hard)} Hard problems would catch up.`;
  return `You're #${me.rank} — ${gap} pts behind ${firstName(target)}. ${hint}`;
}

/** Same rule as the server: "#..." is a tag, anything with "@" an email, else a name. */
export function searchModeOf(q) {
  const s = q.trim();
  if (s.startsWith('#')) return 'tag';
  if (s.includes('@')) return 'email';
  return 'name';
}

// An invite link opened while signed out: remember it across sign-in / sign-up.
const PENDING_INVITE_KEY = 'dsa-pending-invite';
export function setPendingInvite(tag) {
  try {
    localStorage.setItem(PENDING_INVITE_KEY, tag);
  } catch {
    /* storage unavailable */
  }
}
export function peekPendingInvite() {
  try {
    return localStorage.getItem(PENDING_INVITE_KEY);
  } catch {
    return null;
  }
}
export function clearPendingInvite() {
  try {
    localStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    /* storage unavailable */
  }
}
/** Where to go after signing in: back to a pending invite, or home. */
export const postAuthPath = () => (peekPendingInvite() ? `/friends/add/${peekPendingInvite()}` : '/');

export const inviteLink = (tag) => `${window.location.origin}/friends/add/${tag}`;

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data;
  return data?.error || data?.errors?.[0]?.msg || fallback;
}
