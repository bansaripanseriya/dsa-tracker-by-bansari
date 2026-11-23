/**
 * Seeds demo accounts with realistic progress for local development.
 *
 *   npm run seed            (from repo root or server/)
 *
 * Safe to re-run: demo users are upserted by email and their data is reset.
 * Only touches the demo emails below. Refuses to run against a non-local
 * database unless you pass --force.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User.js';
import { Solve } from '../src/models/Solve.js';
import { computeStats } from '../src/lib/solves.js';
import { buildNameSearch } from '../src/lib/nameSearch.js';
import { DATA } from '../../shared/data/problems.js';
import { PRACTICE_DAYS } from '../../shared/data/practicePlan.js';
import { TOTALS, expandSheetDone, lcSetFromKeys } from '../../shared/problemIndex.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const PASSWORD = 'password123';

// sheet: how many sheet problems are ticked; practiceDays: practice days fully done;
// streak: current consecutive check-in days ending today; history: extra random check-ins.
// tag: fixed friend tag (same as the design mockups) so testing is predictable.
// byName: false = hidden from name search (only findable by tag or exact email).
const DEMO_USERS = [
  { email: 'aditi@example.com', name: 'Aditi Verma', tag: 'A4TZ6HW', seed: 11, sheet: 198, practiceDays: 12, streak: 12, history: 70 },
  { email: 'priya@example.com', name: 'Priya Sharma', tag: '7K3QX9P', seed: 23, sheet: 236, practiceDays: 20, streak: 21, history: 90 },
  { email: 'rohan@example.com', name: 'Rohan Iyer', tag: 'R8M2VQA', seed: 37, sheet: 301, practiceDays: 25, streak: 9, history: 110 },
  { email: 'kabir@example.com', name: 'Kabir Singh', tag: 'K9P3NXE', seed: 41, sheet: 142, practiceDays: 6, streak: 4, history: 40 },
  { email: 'kavya@example.com', name: 'Kavya Reddy', tag: 'W6DM3XF', seed: 53, sheet: 177, practiceDays: 10, streak: 8, history: 60, byName: false }
];

function isLocalUri(uri) {
  return /^mongodb:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(uri);
}

function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function dayStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildProgress(u) {
  const rand = rng(u.seed);

  const allKeys = [];
  for (const s of DATA) s.p.forEach((_, i) => allKeys.push(`${s.id}_${i}`));
  for (let i = allKeys.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [allKeys[i], allKeys[j]] = [allKeys[j], allKeys[i]];
  }
  const practiceDone = [];
  for (const d of PRACTICE_DAYS.slice(0, u.practiceDays)) {
    d.problems.forEach((_, i) => practiceDone.push(`p${d.day}_${i}`));
  }
  // Same rule as the app: a done problem is ticked in every section it appears in.
  const sheetDone = [...expandSheetDone(allKeys.slice(0, u.sheet), practiceDone)].sort();

  const checkins = new Set();
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  for (let i = 0; i < u.streak; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    checkins.add(dayStr(d));
  }
  // Leave a gap right before the streak so the current streak length is exact.
  for (let n = 0; n < u.history; n++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (u.streak + 1 + Math.floor(rand() * 240)));
    checkins.add(dayStr(d));
  }

  const sheetSaved = sheetDone.filter(() => rand() < 0.05);

  return {
    sheetDone,
    practiceDone,
    sheetSaved,
    practiceSaved: [],
    streak: { checkins: [...checkins].sort() },
    openSections: [1, 2, 3]
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env in the repo root.');
  }
  if (!isLocalUri(uri) && !process.argv.includes('--force')) {
    throw new Error(`Refusing to seed a non-local database (${uri.replace(/\/\/[^@]*@/, '//***@')}). Pass --force if you really mean it.`);
  }

  await mongoose.connect(uri);
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  for (const u of DEMO_USERS) {
    const progress = buildProgress(u);
    const done = lcSetFromKeys(progress.sheetDone, progress.practiceDone);
    const user = await User.findOneAndUpdate(
      { email: u.email },
      {
        $set: {
          email: u.email,
          name: u.name,
          passwordHash,
          progress,
          stats: computeStats(done, progress.streak.checkins),
          friendTag: u.tag,
          discoverability: { byName: u.byName !== false },
          nameSearch: buildNameSearch(u.name), // update queries skip the pre-save hook
          // Solve history is rebuilt (as backfill) on this user's next progress save.
          solvesSyncedAt: null,
          notes: [],
          skills: []
        },
        $unset: { resume: 1 }
      },
      { upsert: true, setDefaultsOnInsert: true, new: true }
    );
    await Solve.deleteMany({ userId: user._id });
    const solved = done.size;
    console.log(
      `  ${u.email.padEnd(20)} #${u.tag}  ${String(solved).padStart(4)}/${TOTALS.all} solved · ` +
        `${u.streak}-day streak${u.byName === false ? ' · hidden from name search' : ''}`
    );
  }

  console.log(`\nSeeded ${DEMO_USERS.length} demo users. Password for all: ${PASSWORD}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(`Seed failed: ${err.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
