// GO Fit: how much of its potential GO output a form's stat shape reaches. Spec: docs/methodology.md §7.
//
// The score compares a form with the best reshape of its own stat points. HP and the adjustment
// multiplier are the same on both sides, so Stamina and level cancel out of the stat product
// and only (Attack + 15) × (Defense + 15) is left.
import { roundDiv, toGo } from "./formula.ts";
import { MAX_IV } from "./metrics.ts";
import type { GoFit, GoStats, MsStats } from "./types.ts";

/** Main-series base stats always sit in this range. */
const MIN_STAT = 1;
const MAX_STAT = 255;

function convert(ms: MsStats, percent: number): GoStats {
  const { atk, def, sta } = toGo(ms, { kind: "fixed", percent });
  return { atk, def, sta };
}

/** The part of the stat product that can differ between a form and its reshapes. */
function output(go: GoStats): number {
  return (go.atk + MAX_IV) * (go.def + MAX_IV);
}

/** Two stats can hold these totals without leaving the stat range. */
function fitsTwoStats(points: number): boolean {
  return points >= 2 * MIN_STAT && points <= 2 * MAX_STAT;
}

/** Puts the points into the higher of two stats (the first on a tie), up to the stat limit. */
function concentrate(first: number, second: number, points: number): [number, number] {
  const main = Math.min(MAX_STAT, points - MIN_STAT);
  const rest = points - main;
  return first >= second ? [main, rest] : [rest, main];
}

function reshape(ms: MsStats, attackPoints: number, defensePoints: number, spe: number): MsStats {
  const [atk, spa] = concentrate(ms.atk, ms.spa, attackPoints);
  const [def, spd] = concentrate(ms.def, ms.spd, defensePoints);
  return { hp: ms.hp, atk, def, spa, spd, spe };
}

/**
 * Scores a form's stats (in the stat era GO uses) against the best reshape of the same points.
 * `percent` is the form's own adjustment multiplier; reshapes keep it rather than re-testing the
 * 4,000 CP line, otherwise forms just under the line would top the list for their power.
 *
 * Results are unrounded percentages, and attackFit × defenseFit × speedFit = score.
 */
export function goFit(ms: MsStats, percent: number): GoFit {
  const attackPoints = ms.atk + ms.spa;
  const defensePoints = ms.def + ms.spd;
  const totalPoints = attackPoints + defensePoints + ms.spe;

  const actual = convert(ms, percent);
  const focusedMs = reshape(ms, attackPoints, defensePoints, ms.spe);
  const focused = convert(focusedMs, percent);

  // Starting from the form's own Speed means it only changes when another value is strictly better.
  let bestMs = focusedMs;
  let bestGo = focused;
  for (let spe = MIN_STAT; spe <= MAX_STAT; spe++) {
    const shared = totalPoints - spe;
    const attack = roundDiv(shared * attackPoints, attackPoints + defensePoints);
    const defense = shared - attack;
    if (!fitsTwoStats(attack) || !fitsTwoStats(defense)) continue;

    const candidate = reshape(ms, attack, defense, spe);
    const go = convert(candidate, percent);
    if (output(go) > output(bestGo)) {
      bestMs = candidate;
      bestGo = go;
    }
  }

  return {
    score: (100 * output(actual)) / output(bestGo),
    attackFit: (100 * (actual.atk + MAX_IV)) / (focused.atk + MAX_IV),
    defenseFit: (100 * (actual.def + MAX_IV)) / (focused.def + MAX_IV),
    speedFit: (100 * output(focused)) / output(bestGo),
    best: { ms: bestMs, go: bestGo },
  };
}
