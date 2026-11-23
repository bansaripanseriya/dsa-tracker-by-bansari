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
import { LC_INFO, TOTALS, expandSheetDone, lcSetFromKeys } from '../../shared/problemIndex.js';
import { pointsFor, weekRangeIST } from '../../shared/scoring.js';
import { Friendship } from '../src/models/Friendship.js';
import { pairOf } from '../src/lib/friendships.js';
import { weeklyLeaderboard } from '../src/lib/leaderboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const PASSWORD = 'password123';

// sheet: how many sheet problems are ticked; practiceDays: practice days fully done;
// streak: current consecutive check-in days ending today; history: extra random check-ins.
// tag: fixed friend tag (same as the design mockups) so testing is predictable.
// byName: false = hidden from name search (only findable by tag or exact email).
// thisWeek / lastWeek: [easy, medium, hard] solved in that leaderboard week (the rest of
// their progress is recorded as backfilled history, which never scores). Same numbers as the mockup.
const DEMO_USERS = [
  { key: 'aditi', email: 'aditi@example.com', name: 'Aditi Verma', tag: 'A4TZ6HW', seed: 11, sheet: 198, practiceDays: 12, streak: 12, history: 70, thisWeek: [5, 4, 2], lastWeek: [6, 6, 1] },
  { key: 'priya', email: 'priya@example.com', name: 'Priya Sharma', tag: '7K3QX9P', seed: 23, sheet: 236, practiceDays: 20, streak: 21, history: 90, thisWeek: [4, 7, 3], lastWeek: [3, 6, 2] },
  { key: 'rohan', email: 'rohan@example.com', name: 'Rohan Iyer', tag: 'R8M2VQA', seed: 37, sheet: 301, practiceDays: 25, streak: 9, history: 110, thisWeek: [6, 5, 2], lastWeek: [5, 8, 3] },
  { key: 'kabir', email: 'kabir@example.com', name: 'Kabir Singh', tag: 'K9P3NXE', seed: 41, sheet: 142, practiceDays: 6, streak: 4, history: 40, thisWeek: [8, 3, 0], lastWeek: [7, 2, 0] },
  { key: 'kavya', email: 'kavya@example.com', name: 'Kavya Reddy', tag: 'W6DM3XF', seed: 53, sheet: 177, practiceDays: 10, streak: 8, history: 60, byName: false, thisWeek: [2, 4, 1], lastWeek: [4, 3, 1] }
];

// [from, to, status]: 'accepted' friendships, or a 'pending' request from → to.
const DEMO_FRIENDSHIPS = [
  ['aditi', 'priya', 'accepted'],
  ['aditi', 'rohan', 'accepted'],
  ['aditi', 'kavya', 'accepted'],
  ['priya', 'rohan', 'accepted'],
  ['kabir', 'aditi', 'pending']
];

/**
 * Solve history for a user: `thisWeek` / `lastWeek` problems (by difficulty) get `live`
 * solve times inside those leaderboard weeks; everything else is backfill.
 */
function buildSolves(u, userId, done, now) {
  const rand = rng(u.seed + 1);
  const byDifficulty = { Easy: [], Medium: [], Hard: [] };
  for (const num of [...done].sort((a, b) => a - b)) byDifficulty[LC_INFO.get(num).difficulty]?.push(num);
  for (const list of Object.values(byDifficulty)) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }

  const thisWeek = weekRangeIST(now, 0);
  const lastWeek = weekRangeIST(now, 1);
  const at = ({ start, end }) => {
    const until = Math.min(end.getTime(), now.getTime());
    return new Date(start.getTime() + Math.floor(rand() * Math.max(1, until - start.getTime())));
  };
  const historyDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const solves = [];
  const take = (counts, week) => {
    ['Easy', 'Medium', 'Hard'].forEach((difficulty, i) => {
      for (const num of byDifficulty[difficulty].splice(0, counts[i])) {
        solves.push({ userId, lcNumber: num, difficulty, points: pointsFor(difficulty), solvedAt: at(week), source: 'live', active: true });
      }
    });
  };
  take(u.thisWeek, thisWeek);
  take(u.lastWeek, lastWeek);
  for (const [difficulty, nums] of Object.entries(byDifficulty)) {
    for (const num of nums) {
      solves.push({ userId, lcNumber: num, difficulty, points: pointsFor(difficulty), solvedAt: historyDate, source: 'backfill', active: true });
    }
  }
  return solves;
}

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
  const now = new Date();
  const ids = {};

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
          // Solve history is written below, so the backfill on first save is not needed.
          solvesSyncedAt: now,
          notes: [],
          skills: []
        },
        $unset: { resume: 1 }
      },
      { upsert: true, setDefaultsOnInsert: true, new: true }
    );
    await Solve.deleteMany({ userId: user._id });
    await Solve.insertMany(buildSolves(u, user._id, done, now));
    ids[u.key] = user._id;
    const solved = done.size;
    console.log(
      `  ${u.email.padEnd(20)} #${u.tag}  ${String(solved).padStart(4)}/${TOTALS.all} solved · ` +
        `${u.streak}-day streak${u.byName === false ? ' · hidden from name search' : ''}`
    );
  }

  // Friendships between demo users only (anything else in the database is left alone).
  const demoIds = Object.values(ids);
  await Friendship.deleteMany({ userA: { $in: demoIds }, userB: { $in: demoIds } });
  for (const [from, to, status] of DEMO_FRIENDSHIPS) {
    await Friendship.create({
      ...pairOf(ids[from], ids[to]),
      requestedBy: ids[from],
      status,
      acceptedAt: status === 'accepted' ? now : null
    });
  }
  console.log(`\n  Friends: ${DEMO_FRIENDSHIPS.map(([a, b, s]) => (s === 'accepted' ? `${a} ↔ ${b}` : `${a} → ${b} (pending)`)).join(', ')}`);

  const board = await weeklyLeaderboard(ids.aditi, { now });
  console.log(`  Aditi's leaderboard this week: ${board.rows.map((r) => `#${r.rank} ${r.name.split(' ')[0]} ${r.points}`).join(' · ')}`);

  console.log(`\nSeeded ${DEMO_USERS.length} demo users. Password for all: ${PASSWORD}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(`Seed failed: ${err.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
