export function leetCodeProblemUrl(num, name) {
  const slug = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `https://leetcode.com/problems/${slug}/`;
}
