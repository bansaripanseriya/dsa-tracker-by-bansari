/**
 * Finding people: #tag, exact email, fuzzy name — and the privacy rules around them
 * (throwaway `dsa-tracker-test-search` database; skipped if MongoDB isn't running).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../src/models/User.js';
import { Friendship } from '../src/models/Friendship.js';
import { searchUsers } from '../src/lib/search.js';
import { ensureFriendTag } from '../src/lib/identity.js';
import { sendRequest } from '../src/lib/friendships.js';
import { useTestDb } from './helpers/db.js';

const db = useTestDb('search', [User, Friendship]);
const people = {};

async function make(key, name, email, extra = {}) {
  const user = await User.create({ email, passwordHash: 'x', name, ...extra });
  await ensureFriendTag(user);
  people[key] = user;
  return user;
}

async function setup() {
  if (people.me) return;
  await make('me', 'Aditi Verma', 'aditi@example.com');
  await make('rohan', 'Rohan Iyer', 'rohan.iyer@example.com');
  await make('rohanDas', 'Rohan Das', 'rohan.das@example.com');
  await make('rohini', 'Rohini Kapoor', 'rohini@example.com');
  await make('arjun', 'Arjun Menon', 'arjunmenon@gmail.com'); // stored the way registration normalizes Gmail
  await make('kavya', 'Kavya Reddy', 'kavya@example.com', { discoverability: { byName: false } });
  await sendRequest(people.me._id, people.rohan._id);
}

const names = (r) => r.results.map((x) => x.name);

test('#tag: exact, any case, with the relationship', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  await setup();
  const r = await searchUsers(people.me._id, `#${people.rohan.friendTag.toLowerCase()}`);
  assert.equal(r.mode, 'tag');
  assert.deepEqual(names(r), ['Rohan Iyer']);
  assert.equal(r.results[0].relationship, 'outgoing');
  assert.equal(r.results[0].matchType, 'tag');
  assert.deepEqual((await searchUsers(people.me._id, '#ABC')).reason, 'invalid-tag');
  assert.deepEqual(names(await searchUsers(people.me._id, '#ZZZZZZZ')), []);
});

test('a 7-letter word without # is a name search, not a tag', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  await setup();
  assert.equal((await searchUsers(people.me._id, people.rohan.friendTag)).mode, 'name');
});

test('exact email, normalized like registration; partial emails never search', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  await setup();
  assert.deepEqual(names(await searchUsers(people.me._id, 'Arjun.Menon+dsa@Gmail.com')), ['Arjun Menon']);
  assert.deepEqual(names(await searchUsers(people.me._id, 'ROHINI@example.com')), ['Rohini Kapoor']);
  assert.equal((await searchUsers(people.me._id, 'rohini@')).reason, 'partial-email');
  assert.equal((await searchUsers(people.me._id, '@example.com')).reason, 'partial-email');
  assert.deepEqual(names(await searchUsers(people.me._id, 'nobody@example.com')), []);
});

test('people hidden from name search are still found by tag and email', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  await setup();
  assert.deepEqual(names(await searchUsers(people.me._id, 'kavya')), []);
  assert.deepEqual(names(await searchUsers(people.me._id, `#${people.kavya.friendTag}`)), ['Kavya Reddy']);
  assert.deepEqual(names(await searchUsers(people.me._id, 'kavya@example.com')), ['Kavya Reddy']);
});

test('name search: prefix, typo, ranking, and never yourself', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  await setup();
  // Exact name matches first (alphabetical), then one-typo "close" matches ("rohin" ≈ "rohan").
  const rohan = await searchUsers(people.me._id, 'rohan');
  assert.deepEqual(names(rohan), ['Rohan Das', 'Rohan Iyer', 'Rohini Kapoor']);
  assert.deepEqual(rohan.results.map((r) => r.matchType), ['name', 'name', 'close']);
  const typo = await searchUsers(people.me._id, 'rohn');
  assert.ok(names(typo).includes('Rohan Iyer'), `rohn → ${names(typo)}`);
  assert.ok(typo.results.every((r) => r.matchType === 'close'));
  assert.deepEqual(names(await searchUsers(people.me._id, 'iyer')), ['Rohan Iyer']);
  assert.deepEqual(names(await searchUsers(people.me._id, 'aditi')), [], 'you are not in your own name results');
  assert.equal((await searchUsers(people.me._id, 'r')).reason, 'too-short');
});

test('results never contain email or internal ids', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  await setup();
  for (const q of ['rohan', 'rohini@example.com', `#${people.rohan.friendTag}`]) {
    const json = JSON.stringify(await searchUsers(people.me._id, q));
    assert.ok(!json.includes('@example.com'), `${q}: no email`);
    assert.ok(!json.includes(String(people.rohan._id)) && !json.includes(String(people.rohini._id)), `${q}: no ids`);
  }
});

test('an account without a tag yet gets one when found by email', async (t) => {
  if (!db.connected) return t.skip('no local MongoDB');
  await setup();
  await User.collection.insertOne({ email: 'old@example.com', passwordHash: 'x', name: 'Old Account', progress: { sheetDone: ['1_0'] } });
  const r = await searchUsers(people.me._id, 'old@example.com');
  assert.match(r.results[0].tag, /^[2-9A-HJKMNP-Z]{7}$/);
  assert.equal(r.results[0].totalSolved, 1, 'stats computed from stored progress');
});
