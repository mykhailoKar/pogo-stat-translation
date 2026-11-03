// CP, stat product and bulk. Formulas from docs/methodology.md (research doc 2, section 3).
import type { GoStats } from "./types.ts";

/**
 * CP multipliers as the game master publishes them (8 significant digits). The rounded values
 * 0.7903 / 0.8403 / 0.8453 drift by 1–2 in stat product; these match the research's figures exactly.
 */
export const CPM = {
  40: 0.79030001,
  50: 0.84029999,
  51: 0.84529999,
} as const;

export type Level = keyof typeof CPM;

export const MAX_IV = 15;

/** CP = floor((A+iv) × √(D+iv) × √(S+iv) × CPM² / 10), never below 10. */
export function cp(stats: GoStats, level: Level, iv: number = MAX_IV): number {
  const m = CPM[level];
  const raw = ((stats.atk + iv) * Math.sqrt(stats.def + iv) * Math.sqrt(stats.sta + iv) * m * m) / 10;
  return Math.max(10, Math.floor(raw));
}

/** In-battle HP: floor((S+iv) × CPM). */
export function hp(stats: GoStats, level: Level, iv: number = MAX_IV): number {
  return Math.floor((stats.sta + iv) * CPM[level]);
}

/** Stat product = (A+iv)·CPM × (D+iv)·CPM × floor((S+iv)·CPM), rounded to a whole number. */
export function statProduct(stats: GoStats, level: Level, iv: number = MAX_IV): number {
  const m = CPM[level];
  return Math.round((stats.atk + iv) * m * (stats.def + iv) * m * hp(stats, level, iv));
}

/** Bulk = (D+iv)·CPM × floor((S+iv)·CPM), rounded to a whole number. */
export function bulk(stats: GoStats, level: Level, iv: number = MAX_IV): number {
  return Math.round((stats.def + iv) * CPM[level] * hp(stats, level, iv));
}

/**
 * Percentile rank of each value within the list, 0–100 with one decimal.
 * Ties share the midpoint of their ranks, so the order of the input doesn't matter.
 */
export function percentileRanks(values: readonly number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  if (n === 1) return [50];
  const sorted = [...values].sort((a, b) => a - b);
  const below = (v: number): number => {
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((sorted[mid] as number) < v) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const above = (v: number): number => {
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((sorted[mid] as number) <= v) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  return values.map((v) => {
    const less = below(v);
    const equal = above(v) - less;
    const rank = less + (equal - 1) / 2;
    return Math.round((rank / (n - 1)) * 1000) / 10;
  });
}
