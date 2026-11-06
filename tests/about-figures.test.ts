// The About page prints these numbers as arithmetic, so a reader can redo every line by hand.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aboutFigures } from "../src/lib/about-figures.ts";
import { loadDataset } from "../src/site/load-dataset.ts";

const figures = aboutFigures(loadDataset());
const { row, actual, concentrated, best } = figures.example;
const percent = (value: number): number => Math.round(value * 1000) / 10;

describe("About page worked example", () => {
  it("concentrates under the form's own multiplier, not a new cut", () => {
    assert.deepEqual(figures.example.concentratedGo, { atk: 386, def: 237, sta: 239 });
    assert.deepEqual(concentrated, { atk: 401, def: 252 });
    assert.deepEqual(best, { atk: 410, def: 258 });
  });

  it("prints arithmetic that gives the stored fits", () => {
    assert.equal(percent(actual.atk / concentrated.atk), row.attackFit);
    assert.equal(percent(actual.def / concentrated.def), row.defenseFit);
    assert.equal(percent((concentrated.atk * concentrated.def) / (best.atk * best.def)), row.speedFit);
    assert.equal(percent((actual.atk * actual.def) / (best.atk * best.def)), row.goFit);
  });

  it("uses a form the 255 limit doesn't touch", () => {
    assert.ok(figures.example.attackPoints <= 255 && figures.example.defensePoints <= 255);
  });
});

describe("About page figures", () => {
  it("orders the score range", () => {
    assert.ok(figures.lowestScore < figures.medianScore && figures.medianScore < figures.highestScore);
    assert.equal(figures.top.goFit, figures.highestScore);
  });

  it("accounts for every form with GO data", () => {
    assert.ok(figures.exact < figures.withGoData && figures.withGoData <= figures.forms);
  });

  it("supports the claims the page makes in words", () => {
    assert.ok(figures.weakMean < figures.strongMean, "weak forms lean low");
    assert.ok(figures.lowestRescore < 100 && figures.lowestRescore > 95, "rounding is small noise");
    assert.ok(figures.highestScore < 100, "no form reaches 100%");
    const capped = figures.speedCapped;
    assert.equal(Math.max(capped.best.atk, capped.best.spa), 255, "the example's main stat sits at the limit");
    assert.ok(capped.best.spe > capped.ms.spe, "the example wants more Speed than it has");
  });
});
