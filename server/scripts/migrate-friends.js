/**
 * Prepare existing accounts for the friends feature (see src/lib/migrateFriends.js).
 *
 *   npm run migrate:friends -- --dry-run     report what would change, write nothing
 *   npm run migrate:friends                  run it (local database)
 *   npm run migrate:friends -- --yes         run it against a non-local database (e.g. production)
 *
 * Safe to re-run: only missing data is filled in; tags are never replaced.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { migrateFriends } from '../src/lib/migrateFriends.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');

function isLocalUri(uri) {
  return /^mongodb:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(uri);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set (repo-root .env, or the environment).');

  const shown = uri.replace(/\/\/[^@]*@/, '//***@');
  if (!dryRun && !isLocalUri(uri) && !args.has('--yes')) {
    throw new Error(
      `This would modify a non-local database (${shown}).\n` +
        '  Run with --dry-run first to see what would change, then add --yes to apply it.'
    );
  }

  await mongoose.connect(uri);
  console.log(`${dryRun ? 'DRY RUN — nothing will be written. ' : ''}Migrating ${mongoose.connection.name} on ${shown}`);
  const started = Date.now();
  const counts = await migrateFriends({ dryRun, log: (line) => console.log(line) });

  const rows = [
    ['Users checked', counts.users],
    ['Friend tags assigned', counts.tagsAssigned],
    ['Name search index built', counts.nameIndexBuilt],
    ['Name search switched on (default)', counts.discoverabilitySet],
    ['Sheet ticks expanded to all sections', counts.sheetExpanded],
    ['Solve history backfilled', counts.solvesBackfilled],
    ['Stats updated', counts.statsUpdated]
  ];
  console.log(dryRun ? '\nWould change:' : '\nChanged:');
  for (const [label, n] of rows) console.log(`  ${label.padEnd(38)} ${n}`);
  console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(`Migration failed: ${err.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
