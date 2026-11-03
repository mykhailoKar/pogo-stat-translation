// Which main-series stat era GO converts from. Rule from Bulbapedia, Stat (GO):
//   forms introduced in Gens I–II use their Gen VI stats,
//   Gens III–VII use their Gen VII stats,
//   Gen VIII onward use their Gen IX stats.
import type { MsStatKey, MsStats } from "./types.ts";

/** A superseded stat value. `generation` is the last generation that used it (PokéAPI semantics). */
export interface PastStat {
  generation: number;
  stat: MsStatKey;
  value: number;
}

export function goBasisGeneration(introducedIn: number): number {
  if (introducedIn <= 2) return 6;
  if (introducedIn <= 7) return 7;
  return 9;
}

/**
 * Stats as they were in `generation`. For each stat, the past value with the smallest
 * generation at or after the target applies; if there is none, the current value does.
 */
export function statsInGeneration(current: MsStats, past: readonly PastStat[], generation: number): MsStats {
  const result: MsStats = { ...current };
  const best = new Map<MsStatKey, PastStat>();
  for (const p of past) {
    if (p.generation < generation) continue;
    const prev = best.get(p.stat);
    if (!prev || p.generation < prev.generation) best.set(p.stat, p);
  }
  for (const [stat, p] of best) result[stat] = p.value;
  return result;
}

/** The stats that differ between two spreads, or null when they are identical. */
export function statDiff(current: MsStats, basis: MsStats): Partial<MsStats> | null {
  const diff: Partial<MsStats> = {};
  let any = false;
  for (const key of Object.keys(current) as MsStatKey[]) {
    if (current[key] !== basis[key]) {
      diff[key] = basis[key];
      any = true;
    }
  }
  return any ? diff : null;
}
