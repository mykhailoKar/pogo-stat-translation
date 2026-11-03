// Golden values from docs/research/. Every formula change must keep these passing.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attackBlend, defenseBlend, toGo } from "../src/lib/formula.ts";
import type { MsStats } from "../src/lib/types.ts";

/** HP/Atk/Def/SpA/SpD/Spe, the notation used in the research. */
function spread(hp: number, atk: number, def: number, spa: number, spd: number, spe: number): MsStats {
  return { hp, atk, def, spa, spd, spe };
}

function goLine(ms: MsStats, rule?: Parameters<typeof toGo>[1]): [number, number, number] {
  const r = toGo(ms, rule);
  return [r.atk, r.def, r.sta];
}

describe("blends", () => {
  it("weights the higher offensive stat 7/8 and the lower 1/8, doubled and rounded", () => {
    // Dittobase worked example: round(2 × (7/8 × 130 + 1/8 × 80)) = round(247.5) = 248
    assert.equal(attackBlend(130, 80), 248);
    assert.equal(attackBlend(80, 130), 248);
  });

  it("weights the higher defensive stat 5/8 and the lower 3/8, doubled and rounded", () => {
    // round(2 × (5/8 × 95 + 3/8 × 85)) = round(182.5) = 183
    assert.equal(defenseBlend(95, 85), 183);
  });
});

describe("toGo", () => {
  it("matches the Dittobase worked example (no adjustment)", () => {
    const r = toGo(spread(108, 130, 95, 80, 85, 102));
    assert.deepEqual([r.atk, r.def, r.sta], [261, 193, 239]);
    assert.equal(r.steps.adjustmentReason, "none");
    assert.ok(r.steps.uncutCpL40 < 4000);
  });

  it("taxes slow Pokémon through SpeedMod: Espeon 261 vs Machamp 234 Attack", () => {
    assert.equal(toGo(spread(65, 65, 60, 130, 95, 110)).atk, 261);
    assert.equal(toGo(spread(90, 130, 80, 65, 85, 55)).atk, 234);
  });

  it("converts Blissey to 129/169/496", () => {
    assert.deepEqual(goLine(spread(255, 10, 10, 75, 135, 55)), [129, 169, 496]);
  });

  it("applies the ×0.91 cut when uncut CP at L40 reaches 4000: Slaking 290/166/284", () => {
    const r = toGo(spread(150, 160, 100, 95, 65, 100));
    assert.deepEqual([r.atk, r.def, r.sta], [290, 166, 284]);
    assert.equal(r.steps.adjustmentReason, "cp-cut");
    assert.equal(r.steps.adjustment, 0.91);
  });

  it("matches the BST 680 attack-max custom build: 196/255/215/1/1/12 → 356/215/358", () => {
    const r = toGo(spread(196, 255, 215, 1, 1, 12));
    assert.deepEqual([r.atk, r.def, r.sta], [356, 215, 358]);
    assert.equal(r.steps.uncutCpL40, 8114);
  });

  it("uses fixed ×0.97 for Mega Rayquaza: 377/210/227 (Stamina rounds when adjusted)", () => {
    assert.deepEqual(goLine(spread(105, 180, 100, 180, 100, 115), { kind: "fixed", percent: 97 }), [377, 210, 227]);
  });

  it("uses fixed ×0.97 for Mega Zygarde: 403/181/415", () => {
    assert.deepEqual(goLine(spread(216, 70, 91, 216, 85, 100), { kind: "fixed", percent: 97 }), [403, 181, 415]);
  });

  it("never cuts Megas without a fixed adjustment", () => {
    const r = toGo(spread(105, 180, 100, 180, 100, 115), { kind: "mega" });
    assert.equal(r.steps.adjustmentReason, "mega");
    assert.equal(r.steps.adjustment, 1);
    assert.ok(r.steps.uncutCpL40 >= 4000);
  });

  it("floors unadjusted Stamina: HP 45 gives 128, not 129", () => {
    assert.equal(toGo(spread(45, 49, 49, 65, 65, 45)).sta, 128);
  });

  it("rejects fractional fixed adjustments", () => {
    assert.throws(() => toGo(spread(50, 50, 50, 50, 50, 50), { kind: "fixed", percent: 97.5 }));
  });
});
