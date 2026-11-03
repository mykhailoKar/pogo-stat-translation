import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toGo } from "../src/lib/formula.ts";
import { goBasisGeneration, statDiff, statsInGeneration, type PastStat } from "../src/lib/stat-basis.ts";
import type { MsStats } from "../src/lib/types.ts";

describe("goBasisGeneration", () => {
  it("maps Gens I–II to VI, III–VII to VII and VIII+ to IX", () => {
    assert.deepEqual([1, 2, 3, 7, 8, 9].map(goBasisGeneration), [6, 6, 7, 7, 9, 9]);
  });
});

describe("statsInGeneration", () => {
  // Arbok (Gen I): Attack was 85 up to Gen VI, 95 from Gen VII. GO uses its Gen VI stats.
  const arbokNow: MsStats = { hp: 60, atk: 95, def: 69, spa: 65, spd: 79, spe: 80 };
  const arbokPast: PastStat[] = [{ generation: 6, stat: "atk", value: 85 }];

  it("restores Arbok's Gen VI Attack and converts to its GO line 167/153/155", () => {
    const basis = statsInGeneration(arbokNow, arbokPast, goBasisGeneration(1));
    assert.equal(basis.atk, 85);
    const go = toGo(basis);
    assert.deepEqual([go.atk, go.def, go.sta], [167, 153, 155]);
    assert.deepEqual(statDiff(arbokNow, basis), { atk: 85 });
  });

  // Cresselia (Gen IV): Def 120 / SpD 130 until Gen VIII, lowered in Gen IX. GO uses Gen VII stats.
  const cresseliaNow: MsStats = { hp: 120, atk: 70, def: 110, spa: 75, spd: 120, spe: 85 };
  const cresseliaPast: PastStat[] = [
    { generation: 8, stat: "def", value: 120 },
    { generation: 8, stat: "spd", value: 130 },
  ];

  it("restores Cresselia's pre-Gen IX defenses and converts to 152/258/260", () => {
    const basis = statsInGeneration(cresseliaNow, cresseliaPast, goBasisGeneration(4));
    const go = toGo(basis);
    assert.deepEqual([go.atk, go.def, go.sta], [152, 258, 260]);
  });

  it("ignores past values from before the target generation", () => {
    const past: PastStat[] = [{ generation: 5, stat: "atk", value: 1 }];
    assert.equal(statsInGeneration(arbokNow, past, 6).atk, 95);
  });

  it("takes the earliest past value at or after the target", () => {
    const past: PastStat[] = [
      { generation: 8, stat: "atk", value: 2 },
      { generation: 6, stat: "atk", value: 1 },
    ];
    assert.equal(statsInGeneration(arbokNow, past, 6).atk, 1);
    assert.equal(statsInGeneration(arbokNow, past, 7).atk, 2);
  });

  it("returns null when nothing differs", () => {
    assert.equal(statDiff(arbokNow, { ...arbokNow }), null);
  });
});
