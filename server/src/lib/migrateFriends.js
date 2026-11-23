import { User } from '../models/User.js';
import { Solve } from '../models/Solve.js';
import { Friendship } from '../models/Friendship.js';
import { ensureFriendTag } from './identity.js';
import { buildNameSearch } from './nameSearch.js';
import { backfillSolves, computeStats } from './solves.js';
import { expandSheetDone, lcSetFromKeys } from '../../../shared/problemIndex.js';

/**
 * One-time (but safe to re-run) migration that prepares existing accounts for the
 * friends feature. For each user, only what is missing is filled in:
 *
 *   1. friend tag                     (never replaced once set)
 *   2. name search index              (when missing)
 *   3. discoverability.byName = true  (opt-out default, when missing)
 *   4. sheet ticks in every section   (a problem ticked in one topic is ticked in all)
 *   5. backfilled solve history       (when solvesSyncedAt is null — never scores)
 *   6. summary stats                  (recomputed from progress)
 *
 * Everything here also happens lazily (on /auth/me or the next progress save), so the
 * app works before, during and after the migration; it just makes it complete at once.
 *
 * @param {{ dryRun?: boolean, log?: (line: string) => void }} options
 * @returns {Promise<object>} counts of what changed (or would change, in a dry run)
 */
export async function migrateFriends({ dryRun = false, log = () => {} } = {}) {
  if (!dryRun) {
    // Build indexes up front (the unique friend tag index in particular) rather than
    // relying on Mongoose's background autoIndex.
    await Promise.all([User.createIndexes(), Solve.createIndexes(), Friendship.createIndexes()]);
  }

  const counts = {
    users: 0,
    tagsAssigned: 0,
    nameIndexBuilt: 0,
    discoverabilitySet: 0,
    sheetExpanded: 0,
    solvesBackfilled: 0,
    statsUpdated: 0
  };

  const cursor = User.find({})
    .select('+nameSearch name friendTag discoverability progress.sheetDone progress.practiceDone progress.streak stats solvesSyncedAt createdAt')
    .lean()
    .cursor();

  for await (const user of cursor) {
    counts.users += 1;
    const set = {};
    const progress = user.progress || {};

    // 1. Tag (ensureFriendTag also builds the name index in the same write).
    let tagAssigned = false;
    if (!user.friendTag) {
      counts.tagsAssigned += 1;
      tagAssigned = true;
      if (!dryRun) await ensureFriendTag(user);
    }

    // 2. Name search index.
    if (!tagAssigned && !user.nameSearch?.tokens?.length && (user.name || '').trim()) {
      counts.nameIndexBuilt += 1;
      set.nameSearch = buildNameSearch(user.name);
    }

    // 3. Discoverability (an explicit `false` is the user's choice — never touched).
    if (typeof user.discoverability?.byName !== 'boolean') {
      counts.discoverabilitySet += 1;
      set['discoverability.byName'] = true;
    }

    // 4. Tick each done problem in every section it appears in. Only this one field is
    //    written, so a progress save happening at the same moment isn't clobbered.
    const sheetDone = progress.sheetDone || [];
    const expanded = expandSheetDone(sheetDone, progress.practiceDone || []);
    if (expanded !== sheetDone) {
      counts.sheetExpanded += 1;
      set['progress.sheetDone'] = [...expanded].sort();
    }

    const done = lcSetFromKeys(sheetDone, progress.practiceDone);

    // 5. Solve history for anything done before tracking existed.
    if (!user.solvesSyncedAt) {
      counts.solvesBackfilled += 1;
      if (!dryRun) await backfillSolves(user, done);
    }

    // 6. Stats (cheap, so always recomputed to correct any drift).
    const stats = computeStats(done, progress.streak?.checkins);
    const old = user.stats || {};
    if (
      !old.updatedAt ||
      old.totalSolved !== stats.totalSolved ||
      old.easy !== stats.easy ||
      old.medium !== stats.medium ||
      old.hard !== stats.hard ||
      old.lastCheckin !== stats.lastCheckin
    ) {
      counts.statsUpdated += 1;
      set.stats = stats;
    }

    if (!dryRun && Object.keys(set).length) {
      await User.updateOne({ _id: user._id }, { $set: set });
    }
    if (counts.users % 100 === 0) log(`  …${counts.users} users`);
  }

  return counts;
}
