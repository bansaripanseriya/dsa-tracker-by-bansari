import crypto from 'crypto';

/**
 * Friend tags: 7 characters, stored WITHOUT '#', always shown and typed WITH '#'.
 * The alphabet leaves out look-alikes 0/O, 1/I/L → 31 symbols, 31^7 ≈ 27.5 billion tags.
 */
export const TAG_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const TAG_LENGTH = 7;
const TAG_RE = new RegExp(`^[${TAG_ALPHABET}]{${TAG_LENGTH}}$`);

export function generateTag() {
  let tag = '';
  for (let i = 0; i < TAG_LENGTH; i++) {
    tag += TAG_ALPHABET[crypto.randomInt(TAG_ALPHABET.length)];
  }
  return tag;
}

export function isValidTag(tag) {
  return typeof tag === 'string' && TAG_RE.test(tag);
}

/**
 * Normalize user input into a stored tag, or null if it isn't one.
 * Accepts an optional leading '#', any case, and stray spaces: " #7k3 qx9p " → "7K3QX9P".
 */
export function parseTagInput(input) {
  if (typeof input !== 'string') return null;
  const tag = input.replace(/\s+/g, '').replace(/^#/, '').toUpperCase();
  return isValidTag(tag) ? tag : null;
}

/** How a tag is displayed everywhere. */
export function formatTag(tag) {
  return `#${tag}`;
}
