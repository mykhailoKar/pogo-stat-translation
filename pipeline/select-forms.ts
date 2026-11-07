// Decides which PokéAPI forms appear in the dataset.
import type { MsStats } from "../src/lib/types.ts";
import type { MsForm } from "./load-pokeapi.ts";
import { compileRules, firstMatchingRule, type Overrides } from "./overrides.ts";

export interface Exclusion {
  id: string;
  reason: string;
}

/** Step 1, before the join: drop forms ruled out by `excludeForms` (Gmax, Totem, cosmetic). */
export function excludeForms(
  forms: readonly MsForm[],
  overrides: Overrides,
): { candidates: MsForm[]; excluded: Exclusion[] } {
  const rules = compileRules(overrides.excludeForms);
  const forced = new Set(overrides.includeForms.map((f) => f.id));
  const candidates: MsForm[] = [];
  const excluded: Exclusion[] = [];
  for (const f of forms) {
    const rule = f.isDefault || forced.has(f.id) ? undefined : firstMatchingRule(rules, f.id);
    if (rule) excluded.push({ id: f.id, reason: rule.reason });
    else candidates.push(f);
  }
  return { candidates, excluded };
}

function statKey(s: MsStats): string {
  return `${s.hp}/${s.atk}/${s.def}/${s.spa}/${s.spd}/${s.spe}`;
}

/**
 * Step 2, after the join. Keeps a form when it is a default form, a regional form, has GO data,
 * is forced in by `includeForms`, or has stats no kept form of its species already has.
 */
export function selectForms(
  candidates: readonly MsForm[],
  goMatched: ReadonlySet<string>,
  overrides: Overrides,
): { kept: MsForm[]; dropped: Exclusion[] } {
  const forced = new Set(overrides.includeForms.map((f) => f.id));
  const sorted = [...candidates].sort(
    (a, b) => a.dex - b.dex || Number(b.isDefault) - Number(a.isDefault) || a.order - b.order,
  );
  const seenStats = new Map<number, Set<string>>();
  const kept: MsForm[] = [];
  const dropped: Exclusion[] = [];
  for (const f of sorted) {
    const key = statKey(f.ms);
    let speciesStats = seenStats.get(f.dex);
    if (!speciesStats) {
      speciesStats = new Set();
      seenStats.set(f.dex, speciesStats);
    }
    const keep = f.isDefault || f.isRegional || goMatched.has(f.id) || forced.has(f.id) || !speciesStats.has(key);
    if (keep) {
      kept.push(f);
      speciesStats.add(key);
    } else {
      dropped.push({ id: f.id, reason: "same stats as an earlier form of the species, and not in GO data" });
    }
  }
  return { kept, dropped };
}
