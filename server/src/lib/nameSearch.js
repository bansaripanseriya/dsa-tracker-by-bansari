/**
 * Fuzzy name search without extra infrastructure.
 *
 * Each user stores `nameSearch.tokens` (words) and `nameSearch.trigrams` (3-letter
 * chunks). A query finds candidates by shared trigrams or a word prefix (both indexed),
 * then `scoreName` ranks them. Works on any MongoDB, including local development.
 */

/** Lowercase, strip accents and punctuation, collapse spaces. Keeps letters of any script. */
export function normalizeName(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokensOf(value) {
  const norm = normalizeName(value);
  return norm ? [...new Set(norm.split(' '))] : [];
}

function windows(padded) {
  const out = [];
  for (let i = 0; i + 3 <= padded.length; i++) out.push(padded.slice(i, i + 3));
  return out;
}

/** Trigrams stored for a name: each word padded on both sides (" rohan " → " ro", "roh", …, "an "). */
export function trigramsOf(value) {
  const set = new Set();
  for (const token of tokensOf(value)) windows(` ${token} `).forEach((g) => set.add(g));
  return [...set];
}

/**
 * Trigrams for a search query. Only the front of each word is padded, because the
 * user may still be typing ("roh" must match "rohan").
 */
export function queryTrigramsOf(value) {
  const set = new Set();
  for (const token of tokensOf(value)) windows(` ${token}`).forEach((g) => set.add(g));
  return [...set];
}

/** What gets stored on the user document. */
export function buildNameSearch(name) {
  return { tokens: tokensOf(name), trigrams: trigramsOf(name) };
}

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

/**
 * Rank how well `name` matches `query` (0 = no match):
 *   4  the full name starts with the query          "priya s"  → Priya Sharma
 *   3  one of the words starts with the query       "sharma"   → Priya Sharma
 *   2  the name contains the query (3+ characters)  "arm"      → Priya Sharma
 *   1  a word is one typo away (4+ characters)      "rohn"     → Rohan
 */
export function scoreName(name, query) {
  const full = normalizeName(name);
  const q = normalizeName(query);
  if (!full || !q) return 0;
  if (full.startsWith(q)) return 4;
  const words = full.split(' ');
  if (words.some((w) => w.startsWith(q))) return 3;
  if (q.length >= 3 && full.includes(q)) return 2;
  if (q.length >= 4 && words.some((w) => levenshtein(w.slice(0, q.length), q) <= 1)) return 1;
  return 0;
}
