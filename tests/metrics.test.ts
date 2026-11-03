// Golden values from docs/research/custom-build-stat-product-study.md (15/15/15 IVs).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bulk, cp, percentileRanks, statProduct } from "../src/lib/metrics.ts";

const megaZygarde = { atk: 403, def: 181, sta: 415 };
const crownedZacian = { atk: 332, def: 240, sta: 192 };
const attackMax680 = { atk: 356, def: 215, sta: 358 };

describe("cp", () => {
  it("matches Mega Zygarde at L40, L50 and L51", () => {
    assert.equal(cp(megaZygarde, 40), 7579);
    assert.equal(cp(megaZygarde, 50), 8568);
    assert.equal(cp(megaZygarde, 51), 8670);
  });

  it("matches Crowned Zacian's max CP of 5629 at L50", () => {
    assert.equal(cp(crownedZacian, 50), 5629);
  });

  it("matches the BST 680 attack-max build", () => {
    assert.equal(cp(attackMax680, 40), 6786);
    assert.equal(cp(attackMax680, 50), 7672);
    assert.equal(cp(attackMax680, 51), 7764);
  });

  it("never returns less than 10", () => {
    assert.equal(cp({ atk: 1, def: 1, sta: 1 }, 40, 0), 10);
  });
});

describe("stat product and bulk", () => {
  it("matches Mega Zygarde at L40 and L50", () => {
    assert.equal(statProduct(megaZygarde, 40), 17_346_666);
    assert.equal(bulk(megaZygarde, 40), 52_511);
    assert.equal(statProduct(megaZygarde, 50), 20_883_740);
    assert.equal(bulk(megaZygarde, 50), 59_456);
  });

  it("matches Crowned Zacian at L50", () => {
    assert.equal(statProduct(crownedZacian, 50), 10_808_974);
    assert.equal(bulk(crownedZacian, 50), 37_070);
  });

  it("matches the BST 680 attack-max build at L50", () => {
    assert.equal(statProduct(attackMax680, 50), 18_858_832);
    assert.equal(bulk(attackMax680, 50), 60_493);
  });
});

describe("percentileRanks", () => {
  it("spreads distinct values from 0 to 100", () => {
    assert.deepEqual(percentileRanks([30, 10, 20]), [100, 0, 50]);
  });

  it("gives ties the midpoint of their ranks", () => {
    assert.deepEqual(percentileRanks([1, 2, 2, 3]), [0, 50, 50, 100]);
  });

  it("handles empty and single-item lists", () => {
    assert.deepEqual(percentileRanks([]), []);
    assert.deepEqual(percentileRanks([7]), [50]);
  });
});
