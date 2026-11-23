import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNameSearch, normalizeName, queryTrigramsOf, scoreName, tokensOf, trigramsOf } from '../src/lib/nameSearch.js';

test('normalizeName lowercases, strips accents and punctuation, keeps other scripts', () => {
  assert.equal(normalizeName('  Zoë   O\'Brien-Smith '), 'zoe o brien smith');
  assert.equal(normalizeName('प्रिया शर्मा'), normalizeName('प्रिया शर्मा'));
  assert.ok(normalizeName('प्रिया').length > 0, 'non-Latin names are kept');
  assert.equal(normalizeName(null), '');
});

test('tokens and trigrams', () => {
  assert.deepEqual(tokensOf('Priya Sharma priya'), ['priya', 'sharma']);
  assert.deepEqual(trigramsOf('Rohan'), [' ro', 'roh', 'oha', 'han', 'an ']);
  assert.deepEqual(queryTrigramsOf('roh'), [' ro', 'roh']);
  assert.deepEqual(buildNameSearch(''), { tokens: [], trigrams: [] });
});

test('a typo still shares trigrams with the real name', () => {
  const stored = new Set(trigramsOf('Rohan Iyer'));
  const shared = queryTrigramsOf('rohn').filter((g) => stored.has(g));
  assert.ok(shared.length >= 2, `shared: ${shared}`);
});

test('scoreName ranks the way the design shows', () => {
  assert.equal(scoreName('Priya Sharma', 'priya s'), 4); // full name starts with it
  assert.equal(scoreName('Priya Sharma', 'Sharma'), 3); // a word starts with it
  assert.equal(scoreName('Priya Sharma', 'arm'), 2); // contained (3+ chars)
  assert.equal(scoreName('Rohan Iyer', 'rohn'), 1); // one typo (4+ chars)
  assert.equal(scoreName('Rohan Iyer', 'ro'), 4);
  assert.equal(scoreName('Priya Sharma', 'ar'), 0); // too short to match inside a word
  assert.equal(scoreName('Kavya Reddy', 'rohan'), 0);
  assert.equal(scoreName('', 'x'), 0);
});
