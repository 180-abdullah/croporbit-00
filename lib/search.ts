import type { District } from "./types";

const norm = (s: string) => s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/** Substring match first, then a typo-tolerant match (edit distance <= 1 for short, 2 for longer words). */
export function searchDistricts(list: District[], q: string): District[] {
  const needle = norm(q);
  if (!needle) return list;
  const scored: [number, District][] = [];
  for (const d of list) {
    let best = Infinity;
    for (const name of [norm(d.name_en), norm(d.name_bn)]) {
      if (name.startsWith(needle)) best = Math.min(best, 0);
      else if (name.includes(needle)) best = Math.min(best, 1);
      else {
        const tol = needle.length <= 4 ? 1 : 2;
        const dist = Math.min(lev(name, needle), lev(name.slice(0, needle.length + 1), needle));
        if (dist <= tol) best = Math.min(best, 1 + dist);
      }
    }
    if (best < Infinity) scored.push([best, d]);
  }
  return scored.sort((a, b) => a[0] - b[0]).map((x) => x[1]);
}
