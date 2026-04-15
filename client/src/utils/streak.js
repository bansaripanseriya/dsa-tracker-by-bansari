export function dsaTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function calcStreak(checkins) {
  if (!checkins?.length) {
    return { current: 0, best: 0, total: 0 };
  }
  const sorted = [...checkins].sort();
  let best = 1;
  let temp = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      temp++;
      if (temp > best) best = temp;
    } else {
      temp = 1;
    }
  }
  let curStreak = 0;
  const d = new Date();
  while (true) {
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (sorted.includes(ds)) {
      curStreak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return { current: curStreak, best: Math.max(best, curStreak), total: sorted.length };
}
