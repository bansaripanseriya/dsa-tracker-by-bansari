import { User } from '../models/User.js';
import { generateTag } from './tags.js';
import { buildNameSearch } from './nameSearch.js';

const MAX_TAG_ATTEMPTS = 5;

/**
 * Give a user a friend tag if they don't have one yet (new signups, and existing users
 * the first time they load the app — the Phase 7 migration does the same for everyone).
 * Also builds their name search index at the same time. Never replaces an existing tag.
 *
 * @returns {Promise<string>} the user's tag
 */
export async function ensureFriendTag(user) {
  if (user.friendTag) return user.friendTag;

  for (let attempt = 0; attempt < MAX_TAG_ATTEMPTS; attempt++) {
    const tag = generateTag();
    try {
      const result = await User.updateOne(
        { _id: user._id, friendTag: null },
        { $set: { friendTag: tag, nameSearch: buildNameSearch(user.name) } }
      );
      if (result.modifiedCount === 1) {
        user.friendTag = tag;
        return tag;
      }
      // Nothing modified: another request assigned a tag first — use that one.
      const fresh = await User.findById(user._id).select('friendTag').lean();
      if (fresh?.friendTag) {
        user.friendTag = fresh.friendTag;
        return fresh.friendTag;
      }
      throw new Error('User not found while assigning a friend tag');
    } catch (error) {
      if (error?.code === 11000) continue; // tag collision (~1 in billions) — try another
      throw error;
    }
  }
  throw new Error(`Could not assign a unique friend tag after ${MAX_TAG_ATTEMPTS} attempts`);
}

/** The signed-in user's own identity, as returned by /auth/me and /auth/profile. */
export function selfUser(user) {
  return { id: user._id, email: user.email, name: user.name, friendTag: user.friendTag || null };
}

export function selfDiscoverability(user) {
  return { byName: user.discoverability?.byName !== false };
}
