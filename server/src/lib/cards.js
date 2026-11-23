/**
 * What one user may see about another. These functions are the ONLY way another user's
 * data leaves the API — routes must never send a user document directly.
 *
 *   publicCard     anyone, even signed out (invite link)      tag, name, avatar
 *   memberCard     any signed-in user (search, requests)      + totalSolved
 *   friendSummary  friends list                               + difficulty split, current streak, last check-in
 *   friendProfile  a friend's profile page (lib/profile.js)   + full stats, heatmap, this week, recent solves
 *
 * Never included: email, Mongo _id, notes, resume, raw progress keys.
 */
import { calcStreak } from '../../../shared/streak.js';

/** Fields to `.select()` when loading users for cards. Never includes avatar image data. */
export const CARD_FIELDS = 'name friendTag avatar.presetIndex avatar.uploadedAt stats';

function avatarOf(user) {
  const uploadedAt = user.avatar?.uploadedAt;
  return {
    presetIndex: Number.isInteger(user.avatar?.presetIndex) ? user.avatar.presetIndex : 0,
    // Photos are served separately so lists never carry base64 image data.
    photoUrl: uploadedAt ? `/api/users/by-tag/${user.friendTag}/avatar?v=${new Date(uploadedAt).getTime()}` : null
  };
}

/** `name` may be empty — clients then show the tag instead. Never fall back to the email. */
export function publicCard(user) {
  return {
    tag: user.friendTag,
    name: (user.name || '').trim(),
    avatar: avatarOf(user)
  };
}

export function memberCard(user) {
  return { ...publicCard(user), totalSolved: user.stats?.totalSolved ?? 0 };
}

/** For the friends list. Needs `progress.streak.checkins` selected as well. */
export function friendSummary(user, { since, today }) {
  const stats = user.stats || {};
  return {
    ...memberCard(user),
    solved: { easy: stats.easy ?? 0, medium: stats.medium ?? 0, hard: stats.hard ?? 0 },
    streak: calcStreak(user.progress?.streak?.checkins || [], today).current,
    lastCheckin: stats.lastCheckin ?? null,
    friendsSince: since
  };
}
