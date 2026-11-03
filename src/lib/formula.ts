// Main-series → Pokémon GO stat conversion. Spec: docs/methodology.md.
//
// Everything is computed in exact integer arithmetic. The formula produces many exact .5 ties
// (the 2× blend works in quarters), and floating point would round some of them the wrong way.
import { cp } from "./metrics.ts";
import type { AdjustmentReason, Conversion, GoStats, MsStats } from "./types.ts";

export const CP_CUT_THRESHOLD = 4000;
export const CP_CUT_PERCENT = 91;

export type AdjustmentRule =
  | { kind: "standard" } // ×0.91 if the uncut CP at L40 15/15/15 is ≥ 4000, else ×1
  | { kind: "mega" } // Megas and Primals: always ×1
  | { kind: "fixed"; percent: number }; // hand-set multiplier, e.g. 97 for Mega Rayquaza

/** round(p / q) with .5 rounded up, for p ≥ 0 and q > 0. */
function roundDiv(p: number, q: number): number {
  return Math.floor((2 * p + q) / (2 * q));
}

/** round(2 × (7/8 × higher + 1/8 × lower)) = round((7·higher + lower) / 4). */
export function attackBlend(atk: number, spa: number): number {
  const hi = Math.max(atk, spa);
  const lo = Math.min(atk, spa);
  return roundDiv(7 * hi + lo, 4);
}

/** round(2 × (5/8 × higher + 3/8 × lower)) = round((5·higher + 3·lower) / 4). */
export function defenseBlend(def: number, spd: number): number {
  const hi = Math.max(def, spd);
  const lo = Math.min(def, spd);
  return roundDiv(5 * hi + 3 * lo, 4);
}

/** 1 + (Speed − 75) / 500. For display; the conversion uses the exact form (425 + Speed) / 500. */
export function speedMod(spe: number): number {
  return (425 + spe) / 500;
}

/** round(blend × SpeedMod × adjustment) = round(blend × (425 + Speed) × percent / 50000). */
function scaled(blend: number, spe: number, percent: number): number {
  return roundDiv(blend * (425 + spe) * percent, 50_000);
}

/**
 * Unadjusted: floor(50 + 1.75 × HP) = floor((200 + 7·HP) / 4).
 * Adjusted:   round((50 + 1.75 × HP) × adjustment) = round((200 + 7·HP) × percent / 400).
 * The two research files disagree here. Mega Rayquaza (HP 105, ×0.97) settles it: GO has 227,
 * which only rounding gives (floor gives 226). See docs/methodology.md.
 */
function stamina(hp: number, percent: number): number {
  const quarters = 200 + 7 * hp;
  return percent === 100 ? Math.floor(quarters / 4) : roundDiv(quarters * percent, 400);
}

function convertAt(ms: MsStats, atkBlend: number, defBlend: number, percent: number): GoStats {
  return {
    atk: scaled(atkBlend, ms.spe, percent),
    def: scaled(defBlend, ms.spe, percent),
    sta: stamina(ms.hp, percent),
  };
}

/** Converts main-series base stats (in the stat era GO uses) to GO base stats. */
export function toGo(ms: MsStats, rule: AdjustmentRule = { kind: "standard" }): Conversion {
  const atkBlend = attackBlend(ms.atk, ms.spa);
  const defBlend = defenseBlend(ms.def, ms.spd);
  const uncut = convertAt(ms, atkBlend, defBlend, 100);
  const uncutCpL40 = cp(uncut, 40);

  let percent = 100;
  let adjustmentReason: AdjustmentReason = "none";
  if (rule.kind === "fixed") {
    if (!Number.isInteger(rule.percent) || rule.percent <= 0) {
      throw new Error(`Fixed adjustment must be a whole percent, got ${rule.percent}`);
    }
    percent = rule.percent;
    adjustmentReason = "fixed";
  } else if (rule.kind === "mega") {
    adjustmentReason = "mega";
  } else if (uncutCpL40 >= CP_CUT_THRESHOLD) {
    percent = CP_CUT_PERCENT;
    adjustmentReason = "cp-cut";
  }

  const final = percent === 100 ? uncut : convertAt(ms, atkBlend, defBlend, percent);
  return {
    ...final,
    steps: {
      atkBlend,
      defBlend,
      speedMod: speedMod(ms.spe),
      uncut,
      uncutCpL40,
      adjustment: percent / 100,
      adjustmentReason,
    },
  };
}
