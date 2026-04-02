import type { Plushie } from "@/lib/schema";
import { parseTags } from "@/lib/utils";

export interface FilterState {
  name: string;
  tags: string[];
  yearFrom: string;
  yearTo: string;
  dayMonthFrom: string; // "DD.MM"
  dayMonthTo: string;   // "DD.MM"
}

export const EMPTY_FILTER: FilterState = {
  name: "",
  tags: [],
  yearFrom: "",
  yearTo: "",
  dayMonthFrom: "",
  dayMonthTo: "",
};

export function isFilterActive(f: FilterState): boolean {
  return (
    f.name !== "" ||
    f.tags.length > 0 ||
    f.yearFrom !== "" ||
    f.yearTo !== "" ||
    f.dayMonthFrom !== "" ||
    f.dayMonthTo !== ""
  );
}

export function activeFilterCount(f: FilterState): number {
  let n = 0;
  if (f.name !== "") n++;
  if (f.tags.length > 0) n++;
  if (f.yearFrom !== "" || f.yearTo !== "") n++;
  if (f.dayMonthFrom !== "" || f.dayMonthTo !== "") n++;
  return n;
}

// "DD.MM" → "MM-DD" for lexicographic comparison, null if invalid
function parseDDMM(ddmm: string): string | null {
  const parts = ddmm.trim().split(".");
  if (parts.length !== 2) return null;
  const day = (parts[0] ?? "").padStart(2, "0");
  const month = (parts[1] ?? "").padStart(2, "0");
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  if (isNaN(d) || isNaN(m) || d < 1 || d > 31 || m < 1 || m > 12) return null;
  return `${month}-${day}`;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j]!;
      dp[j] =
        a[i - 1]!.toLowerCase() === b[j - 1]!.toLowerCase()
          ? prev
          : 1 + Math.min(prev, dp[j]!, dp[j - 1]!);
      prev = temp;
    }
  }
  return dp[n]!;
}

function scoreMatch(query: string, name: string): number | null {
  const q = query.toLowerCase();
  const n = name.toLowerCase();

  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  const idx = n.indexOf(q);
  if (idx !== -1) return 2 + idx;

  // Per-word levenshtein
  const words = n.split(/\s+/);
  let minDist = levenshtein(q, n);
  for (const w of words) {
    const d = levenshtein(q, w);
    if (d < minDist) minDist = d;
  }

  const threshold = Math.max(1, Math.floor(q.length / 3));
  if (minDist <= threshold) return 100 + minDist;

  return null;
}

export function searchPlushies(query: string, plushies: Plushie[]): Plushie[] {
  const q = query.trim();
  if (!q) return plushies;

  const scored: Array<{ plushie: Plushie; score: number }> = [];
  for (const p of plushies) {
    const s = scoreMatch(q, p.name);
    if (s !== null) scored.push({ plushie: p, score: s });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.map((r) => r.plushie);
}

export function filterPlushies(plushies: Plushie[], f: FilterState): Plushie[] {
  const fromMD = f.dayMonthFrom ? parseDDMM(f.dayMonthFrom) : null;
  const toMD = f.dayMonthTo ? parseDDMM(f.dayMonthTo) : null;

  return plushies.filter((p) => {
    if (f.name && !p.name.toLowerCase().includes(f.name.toLowerCase())) return false;

    if (f.tags.length > 0) {
      const pt = parseTags(p.tags);
      if (!f.tags.every((t) => pt.includes(t))) return false;
    }

    const year = parseInt(p.birthday.slice(0, 4), 10);
    if (f.yearFrom && year < parseInt(f.yearFrom, 10)) return false;
    if (f.yearTo && year > parseInt(f.yearTo, 10)) return false;

    if (fromMD || toMD) {
      const md = p.birthday.slice(5); // "MM-DD"
      if (fromMD && toMD) {
        if (fromMD <= toMD) {
          // Normal range within a year, e.g. 01.05–14.05
          if (md < fromMD || md > toMD) return false;
        } else {
          // Cross-year range, e.g. 15.11–28.02
          if (md < fromMD && md > toMD) return false;
        }
      } else if (fromMD && md < fromMD) {
        return false;
      } else if (toMD && md > toMD) {
        return false;
      }
    }

    return true;
  });
}
