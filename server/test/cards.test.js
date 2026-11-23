import { test } from 'node:test';
import assert from 'node:assert/strict';
import { friendSummary, memberCard, publicCard } from '../src/lib/cards.js';

// A user document with everything a card must NOT leak.
const user = {
  _id: '6b0484a2191b32c06644407e',
  email: 'priya@example.com',
  passwordHash: 'secret',
  name: '  Priya Sharma ',
  friendTag: '7K3QX9P',
  avatar: { presetIndex: 3, uploadedAt: new Date('2026-11-01T00:00:00Z'), data: 'data:image/png;base64,AAAA' },
  stats: { totalSolved: 236, easy: 112, medium: 98, hard: 26, lastCheckin: '2026-11-24' },
  notes: [{ body: 'private' }],
  resume: { data: 'base64' },
  progress: { sheetDone: ['1_0'], streak: { checkins: ['2026-11-23', '2026-11-24'] } }
};

const FORBIDDEN = ['email', '_id', 'id', 'passwordHash', 'notes', 'resume', 'progress', 'data', 'sheetDone'];

function assertNoLeaks(obj) {
  const json = JSON.stringify(obj);
  assert.ok(!json.includes('example.com'), 'no email');
  assert.ok(!json.includes('6b0484a2191b32c06644407e'), 'no Mongo id');
  assert.ok(!json.includes('base64'), 'no image or resume data');
  for (const key of FORBIDDEN) assert.ok(!(key in obj), `no "${key}"`);
}

test('publicCard: tag, trimmed name, avatar — nothing else', () => {
  const card = publicCard(user);
  assert.deepEqual(Object.keys(card).sort(), ['avatar', 'name', 'tag']);
  assert.equal(card.name, 'Priya Sharma');
  assert.equal(card.avatar.presetIndex, 3);
  assert.equal(card.avatar.photoUrl, `/api/users/by-tag/7K3QX9P/avatar?v=${new Date('2026-11-01T00:00:00Z').getTime()}`);
  assertNoLeaks(card);
});

test('memberCard adds only totalSolved', () => {
  const card = memberCard(user);
  assert.deepEqual(Object.keys(card).sort(), ['avatar', 'name', 'tag', 'totalSolved']);
  assert.equal(card.totalSolved, 236);
  assertNoLeaks(card);
});

test('friendSummary adds streak and difficulty split, still no leaks', () => {
  const summary = friendSummary(user, { since: new Date('2026-10-12'), today: '2026-11-24' });
  assert.equal(summary.streak, 2);
  assert.deepEqual(summary.solved, { easy: 112, medium: 98, hard: 26 });
  assert.equal(summary.lastCheckin, '2026-11-24');
  assertNoLeaks(summary);
});

test('cards handle missing name, avatar and stats', () => {
  const bare = { _id: 'x', email: 'bare@example.com', friendTag: 'K9P3NXE' };
  assert.deepEqual(memberCard(bare), { tag: 'K9P3NXE', name: '', avatar: { presetIndex: 0, photoUrl: null }, totalSolved: 0 });
});
