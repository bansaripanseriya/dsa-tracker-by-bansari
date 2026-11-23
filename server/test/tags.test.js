import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAG_ALPHABET, formatTag, generateTag, isValidTag, parseTagInput } from '../src/lib/tags.js';

test('alphabet has 31 symbols and no look-alikes', () => {
  assert.equal(TAG_ALPHABET.length, 31);
  for (const c of '01ILO') assert.ok(!TAG_ALPHABET.includes(c), `${c} must not be in the alphabet`);
});

test('generated tags are valid and vary', () => {
  const tags = new Set();
  for (let i = 0; i < 500; i++) {
    const tag = generateTag();
    assert.ok(isValidTag(tag), tag);
    tags.add(tag);
  }
  assert.ok(tags.size > 495, 'tags should essentially never repeat');
});

test('parseTagInput accepts #, any case and spaces', () => {
  assert.equal(parseTagInput('#7k3qx9p'), '7K3QX9P');
  assert.equal(parseTagInput(' # 7K3 QX9P '), '7K3QX9P');
  assert.equal(parseTagInput('7K3QX9P'), '7K3QX9P');
});

test('parseTagInput rejects anything that is not a tag', () => {
  for (const bad of ['', '#', '#7K3QX9', '#7K3QX9PP', '#7K3QX0P', '#7K3QXIP', 'priya', null, undefined, 42]) {
    assert.equal(parseTagInput(bad), null, String(bad));
  }
});

test('tags are displayed with #', () => {
  assert.equal(formatTag('7K3QX9P'), '#7K3QX9P');
});
