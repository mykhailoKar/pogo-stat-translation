// Golden values. Spreads and GO lines come from docs/research/ and GO data; the Garchomp fits are
// worked by hand from those lines. Every change to GO Fit must keep these passing.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toGo } from "../src/lib/formula.ts";
import { goFit } from "../src/lib/go-fit.ts";
import { statProduct } from "../src/lib/metrics.ts";
import type { MsStats } from "../src/lib/types.ts";

/** HP/Atk/Def/SpA/SpD/Spe, the notation used in the research. */
function spread(hp: number, atk: number, def: number, spa: number, spd: number, spe: number): MsStats {
  return { hp, atk, def, spa, spd, spe };
}

function total(ms: MsStats): number {
  return ms.hp + ms.atk + ms.def + ms.spa + ms.spd + ms.spe;
}

function assertClose(actual: number, expected: number, tolerance = 1e-9): void {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);
}

const GARCHOMP = spread(108, 130, 95, 80, 85, 102);
const MEW = spread(100, 100, 100, 100, 100, 100);
const ESPEON = spread(65, 65, 60, 130, 95, 110);
const BLISSEY = spread(255, 10, 10, 75, 135, 55);
const SLAKING = spread(150, 160, 100, 95, 65, 100);
const MEWTWO = spread(106, 110, 90, 154, 90, 130);
const RAYQUAZA_MEGA = spread(105, 180, 100, 180, 100, 115);

describe("goFit score", () => {
  it("compares the form with the best reshape of its own points", () => {
    // Real GO stats are 261/193. At Speed 102, 209/1 and 179/1 would give 386/237.
    // The best reshape is Speed 31 with 247/1 and 212/1, which gives 395/243.
    const fit = goFit(GARCHOMP, 100);
    assert.deepEqual(fit.best.ms, spread(108, 247, 212, 1, 1, 31));
    assert.deepEqual(fit.best.go, { atk: 395, def: 243, sta: 239 });
    assertClose(fit.score, (100 * 276 * 208) / (410 * 258));
    assertClose(fit.attackFit, (100 * 276) / 401);
    assertClose(fit.defenseFit, (100 * 208) / 252);
    assertClose(fit.speedFit, (100 * 401 * 252) / (410 * 258));
  });

  it("equals the ratio of real stat products, whatever the level", () => {
    const fit = goFit(GARCHOMP, 100);
    const actual = toGo(GARCHOMP);
    assertClose(fit.score, (100 * statProduct(actual, 50)) / statProduct(fit.best.go, 50), 1e-4);
    assertClose(fit.score, (100 * statProduct(actual, 40)) / statProduct(fit.best.go, 40), 1e-4);
  });

  it("gives a spread already in its best shape 100", () => {
    const shape = goFit(GARCHOMP, 100).best.ms;
    const fit = goFit(shape, 100);
    assert.deepEqual(fit.best.ms, shape);
    assert.equal(fit.score, 100);
    assert.equal(fit.speedFit, 100);
  });

  it("multiplies the three fits into the score, with none above 100", () => {
    for (const ms of [GARCHOMP, MEW, ESPEON, BLISSEY, SLAKING, MEWTWO, RAYQUAZA_MEGA]) {
      const fit = goFit(ms, 100);
      assertClose((fit.attackFit * fit.defenseFit * fit.speedFit) / 10_000, fit.score);
      for (const value of [fit.score, fit.attackFit, fit.defenseFit, fit.speedFit]) assert.ok(value <= 100);
    }
  });
});

describe("goFit reshape rules", () => {
  it("keeps HP and the total stat points, and stays within 1–255", () => {
    for (const ms of [GARCHOMP, MEW, ESPEON, BLISSEY, SLAKING, MEWTWO, RAYQUAZA_MEGA]) {
      const best = goFit(ms, 100).best.ms;
      assert.equal(best.hp, ms.hp);
      assert.equal(total(best), total(ms));
      for (const value of Object.values(best)) assert.ok(value >= 1 && value <= 255);
    }
  });

  it("concentrates points into the higher stat of each pair", () => {
    assert.deepEqual(goFit(ESPEON, 100).best.ms, spread(65, 1, 1, 251, 199, 8));
    assert.deepEqual(goFit(BLISSEY, 100).best.ms, spread(255, 1, 1, 104, 178, 1));
  });

  it("uses Attack and Defense when a pair is tied", () => {
    assert.deepEqual(goFit(MEW, 100).best.ms, spread(100, 233, 232, 1, 1, 33));
  });

  it("spills into the secondary stat and Speed once the main stat reaches 255", () => {
    assert.deepEqual(goFit(MEWTWO, 91).best.ms, spread(106, 2, 175, 255, 1, 141));
    assert.deepEqual(goFit(RAYQUAZA_MEGA, 97).best.ms, spread(105, 255, 151, 18, 1, 250));
  });

  it("keeps the form's Speed when no other value is better", () => {
    const fit = goFit(SLAKING, 91);
    assert.deepEqual(fit.best.ms, spread(150, 254, 164, 1, 1, 100));
    assert.equal(fit.speedFit, 100);
  });
});

describe("goFit adjustment", () => {
  it("applies the form's own multiplier to the best shape", () => {
    assert.deepEqual(goFit(SLAKING, 91).best.go, { atk: 425, def: 197, sta: 284 });
    assert.deepEqual(goFit(RAYQUAZA_MEGA, 97).best.go, { atk: 591, def: 249, sta: 227 });
  });

  it("doesn't re-test the 4,000 CP line on the best shape", () => {
    const fit = goFit(MEW, 100);
    assert.equal(toGo(MEW).steps.adjustment, 1);
    assert.equal(toGo(fit.best.ms).steps.adjustment, 0.91);
    assert.deepEqual(fit.best.go, { atk: 374, def: 267, sta: 225 });
  });
});
