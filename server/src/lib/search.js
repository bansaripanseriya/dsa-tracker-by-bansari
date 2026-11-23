import mongoose from 'mongoose';
import validator from 'validator';
import { User } from '../models/User.js';
import { CARD_FIELDS, memberCard } from './cards.js';
import { relationshipsWith } from './friendships.js';
import { ensureFriendTag } from './identity.js';
import { ensureStats } from './solves.js';
import { normalizeName, queryTrigramsOf, scoreName, tokensOf } from './nameSearch.js';
import { parseTagInput } from './tags.js';

const MAX_RESULTS = 10;
const MAX_CANDIDATES = 50;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Find people to add. The mode is decided by the input:
 *   "#7K3QX9P"         exact tag
 *   "a@b.com"          exact email (normalized exactly like registration; partial emails never search)
 *   anything else      fuzzy name search (2+ characters; skips people who turned name search off)
 *
 * @returns {Promise<{ mode: 'tag'|'email'|'name', results: object[], reason?: string }>}
 *   reason: 'invalid-tag' | 'partial-email' | 'too-short' when the query can't be searched.
 *   Each result: memberCard + { relationship, matchType: 'tag'|'email'|'name'|'close' }.
 */
export async function searchUsers(meId, rawQuery) {
  const q = String(rawQuery || '').trim().slice(0, 200);

  if (q.startsWith('#')) {
    const tag = parseTagInput(q);
    if (!tag) return { mode: 'tag', results: [], reason: 'invalid-tag' };
    const user = await User.findOne({ friendTag: tag }).select(CARD_FIELDS).lean();
    return { mode: 'tag', results: await withRelationships(meId, user ? [{ user, matchType: 'tag' }] : []) };
  }

  if (q.includes('@')) {
    if (!validator.isEmail(q)) return { mode: 'email', results: [], reason: 'partial-email' };
    // Same normalization as express-validator's normalizeEmail() at registration
    // (lowercase; Gmail dots and +suffix removed).
    const email = validator.normalizeEmail(q);
    const user = email
      ? await User.findOne({ email }).select(`${CARD_FIELDS} progress.sheetDone progress.practiceDone progress.streak`)
      : null;
    if (!user) return { mode: 'email', results: [] };
    await ensureFriendTag(user); // an account that hasn't opened the app since tags existed
    await ensureStats(user);
    return { mode: 'email', results: await withRelationships(meId, [{ user: user.toObject(), matchType: 'email' }]) };
  }

  if (normalizeName(q).length < 2) return { mode: 'name', results: [], reason: 'too-short' };

  const [firstToken] = tokensOf(q);
  const trigrams = queryTrigramsOf(q);
  const candidates = await User.aggregate([
    {
      $match: {
        _id: { $ne: new mongoose.Types.ObjectId(String(meId)) }, // aggregate() doesn't cast ids
        friendTag: { $exists: true },
        'discoverability.byName': { $ne: false },
        $or: [{ 'nameSearch.tokens': { $regex: `^${escapeRegex(firstToken)}` } }, { 'nameSearch.trigrams': { $in: trigrams } }]
      }
    },
    // Most shared trigrams first, so the candidate cap keeps the likeliest matches.
    { $addFields: { _overlap: { $size: { $setIntersection: [{ $ifNull: ['$nameSearch.trigrams', []] }, trigrams] } } } },
    { $sort: { _overlap: -1 } },
    { $limit: MAX_CANDIDATES },
    { $project: { name: 1, friendTag: 1, 'avatar.presetIndex': 1, 'avatar.uploadedAt': 1, stats: 1 } }
  ]);

  const ranked = candidates
    .map((user) => ({ user, score: scoreName(user.name, q) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.user.name.localeCompare(b.user.name))
    .slice(0, MAX_RESULTS)
    .map((r) => ({ user: r.user, matchType: r.score === 1 ? 'close' : 'name' }));

  return { mode: 'name', results: await withRelationships(meId, ranked) };
}

async function withRelationships(meId, matches) {
  const rel = await relationshipsWith(meId, matches.map((m) => m.user._id));
  return matches.map((m) => ({ ...memberCard(m.user), relationship: rel.get(String(m.user._id)), matchType: m.matchType }));
}
