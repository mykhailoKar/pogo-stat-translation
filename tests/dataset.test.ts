// Checks the real dataset built from the pinned sources. Needs `npm run fetch` first.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { before, describe, it } from "node:test";
import { buildDataset, serializeDataset, type BuildResult } from "../pipeline/dataset.ts";
import { ROOT, SOURCES, pinnedFile, type SourceName } from "../pipeline/sources.ts";
import type { DatasetEntry } from "../src/lib/types.ts";

let result: BuildResult;
let byId: Map<string, DatasetEntry>;

before(() => {
  for (const name of Object.keys(SOURCES) as SourceName[]) {
    for (const file of SOURCES[name].files) {
      const local = pinnedFile(name, path.basename(file));
      if (!existsSync(local)) throw new Error(`${local} is missing. Run "npm run fetch" first.`);
    }
  }
  result = buildDataset();
  byId = new Map(result.dataset.pokemon.map((p) => [p.id, p]));
});

describe("validation", () => {
  it("has no unexplained formula mismatches", () => {
    const rows = result.validation.unexplained.map((r) => `${r.id}: GO ${r.actual.atk}/${r.actual.def}/${r.actual.sta}`);
    assert.deepEqual(rows, [], "see data/reports/validation.md");
  });

  it("matches or deliberately ignores every PvPoke entry", () => {
    assert.deepEqual(result.coverage.join.unmatched.map((g) => g.goId), []);
    assert.deepEqual(result.coverage.join.conflicts.map((k) => k.go.goId), []);
  });

  it("has no stale overrides", () => {
    assert.deepEqual(result.staleOverrides, []);
  });

  it("matches the formula exactly for the vast majority of entries", () => {
    const total = result.validation.exact.length + result.validation.exceptions.length;
    assert.ok(result.validation.exact.length / total > 0.99);
  });
});

describe("committed dataset", () => {
  it("is exactly what the pipeline produces (run npm run build:data and commit)", () => {
    const committed = readFileSync(path.join(ROOT, "public", "data", "pokemon.json"), "utf8");
    assert.ok(committed === serializeDataset(result.dataset), "public/data/pokemon.json is out of date");
  });
});

describe("dataset shape", () => {
  it("has unique ids, sorted by dex", () => {
    const ids = result.dataset.pokemon.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
    const dexes = result.dataset.pokemon.map((p) => p.dex);
    assert.deepEqual(dexes, [...dexes].sort((a, b) => a - b));
  });

  it("covers every species from #1 to the latest", () => {
    const dexes = new Set(result.dataset.pokemon.map((p) => p.dex));
    const max = Math.max(...dexes);
    assert.ok(max >= 1025);
    for (let d = 1; d <= max; d++) assert.ok(dexes.has(d), `dex ${d} missing`);
  });

  it("has sane stats, metrics and ranks on every entry", () => {
    for (const p of result.dataset.pokemon) {
      for (const k of ["atk", "def", "sta"] as const) assert.ok(Number.isInteger(p.go[k]) && p.go[k] > 0, `${p.id} ${k}`);
      assert.ok(p.metrics.cp.l40 <= p.metrics.cp.l50 && p.metrics.cp.l50 <= p.metrics.cp.l51, p.id);
      for (const k of ["bstPct", "cpL50Pct", "spL50Pct", "goFitPct"] as const) assert.ok(p.ranks[k] >= 0 && p.ranks[k] <= 100, `${p.id} ${k}`);
      assert.equal(p.go.status === "actual", p.go.goId !== null, p.id);
      assert.equal(p.exception !== null, p.go.status === "actual" && (p.go.atk !== p.goPredicted.atk || p.go.def !== p.goPredicted.def || p.go.sta !== p.goPredicted.sta), p.id);
    }
  });

  it("separates Megas and Primals into their own pool", () => {
    assert.equal(byId.get("rayquaza-mega")?.ranks.pool, "mega");
    assert.equal(byId.get("kyogre-primal")?.ranks.pool, "mega");
    assert.equal(byId.get("rayquaza")?.ranks.pool, "standard");
  });
});

describe("GO Fit on real data", () => {
  const fitOf = (id: string): DatasetEntry["goFit"] => {
    const fit = byId.get(id)?.goFit;
    assert.ok(fit, `${id} not in dataset`);
    return fit;
  };
  const sum = (ms: DatasetEntry["goFit"]["best"]["ms"]): number => ms.hp + ms.atk + ms.def + ms.spa + ms.spd + ms.spe;

  it("is a sane reshape on every entry", () => {
    for (const p of result.dataset.pokemon) {
      const { score, attackFit, defenseFit, speedFit, best } = p.goFit;
      for (const value of [score, attackFit, defenseFit, speedFit]) assert.ok(value > 0 && value <= 100, `${p.id} ${value}`);
      assert.ok(Math.abs((attackFit * defenseFit * speedFit) / 10_000 - score) < 0.2, `${p.id} parts don't multiply into the score`);
      for (const value of Object.values(best.ms)) assert.ok(value >= 1 && value <= 255, `${p.id} ${value}`);
      assert.equal(best.ms.hp, p.msGoBasis?.hp ?? p.ms.hp, p.id);
    }
  });

  it("matches the worked examples", () => {
    const { score, attackFit, defenseFit, speedFit } = fitOf("garchomp");
    assert.deepEqual([score, attackFit, defenseFit, speedFit], [54.3, 68.8, 82.5, 95.5]);
    assert.equal(fitOf("blissey").score, 76);
    assert.equal(fitOf("mew").score, 46.1);
  });

  it("reshapes the stats GO uses, not the current ones", () => {
    assert.equal(byId.get("cresselia")?.ms.bst, 580);
    assert.equal(sum(fitOf("cresselia").best.ms), 600);
  });

  it("uses the formula's stats for listed exceptions", () => {
    assert.equal(byId.get("shedinja")?.go.sta, 1);
    assert.equal(fitOf("shedinja").best.go.sta, 51);
  });

  it("ranks within each pool", () => {
    assert.equal(byId.get("bonsly")?.ranks.goFitPct, 100);
    const megas = result.dataset.pokemon.filter((p) => p.ranks.pool === "mega");
    assert.equal(Math.max(...megas.map((p) => p.ranks.goFitPct)), 100);
  });

  it("applies GO's real cut to the ideal, which GO Fit leaves out", () => {
    // Garchomp's best shape is 395/243/239 uncut. That's over the line, so GO would cut it to 359/221/217.
    const { best, ideal } = fitOf("garchomp");
    assert.deepEqual(best.go, { atk: 395, def: 243, sta: 239 });
    assert.deepEqual(ideal, { atk: 359, def: 221, sta: 217, cpL50: 6179, cut: true });
  });

  it("doesn't flag forms that are already cut, or re-test Megas", () => {
    assert.deepEqual(fitOf("slaking").ideal, { atk: 425, def: 197, sta: 284, cpL50: 7822, cut: false });
    assert.equal(fitOf("rayquaza-mega").ideal.cut, false);
    assert.equal(fitOf("rayquaza-mega").ideal.cpL50, 10815);
  });

  it("never puts the ideal below a form's current CP", () => {
    for (const p of result.dataset.pokemon) assert.ok(p.goFit.ideal.cpL50 > p.metrics.cp.l50, p.id);
  });
});

describe("category tags", () => {
  const tagged = (tag: string): DatasetEntry[] =>
    result.dataset.pokemon.filter((p) => p.ranks.pool === "standard" && p.tags.includes(tag));

  it("covers all 27 starter lines and their regional forms", () => {
    assert.equal(tagged("starter").length, 85);
    for (const id of ["bulbasaur", "ivysaur", "venusaur", "quaxly", "quaquaval", "typhlosion-hisui"]) {
      assert.ok(byId.get(id)?.tags.includes("starter"), id);
    }
    for (const id of ["pikachu", "eevee"]) assert.equal(byId.get(id)?.tags.includes("starter"), false, id);
  });

  it("treats a species with no evolution as fully evolved", () => {
    for (const id of ["charizard", "tauros", "mewtwo", "slowbro-galar"]) assert.ok(byId.get(id)?.tags.includes("fully-evolved"), id);
    for (const id of ["charmander", "pichu", "stantler"]) assert.equal(byId.get(id)?.tags.includes("fully-evolved"), false, id);
  });

  it("handles forms that evolve differently from their species", () => {
    for (const id of ["corsola", "linoone", "farfetchd", "mr-mime", "qwilfish", "floette-eternal"]) {
      assert.ok(byId.get(id)?.tags.includes("fully-evolved"), id);
    }
    for (const id of ["corsola-galar", "linoone-galar", "farfetchd-galar", "mr-mime-galar", "qwilfish-hisui", "floette"]) {
      assert.equal(byId.get(id)?.tags.includes("fully-evolved"), false, id);
    }
  });
});

describe("research spot checks on real data", () => {
  const line = (id: string): string => {
    const p = byId.get(id);
    assert.ok(p, `${id} not in dataset`);
    return `${p.go.atk}/${p.go.def}/${p.go.sta}`;
  };

  it("Arbok and Cresselia convert from their older stat eras", () => {
    assert.deepEqual(byId.get("arbok")?.msGoBasis, { atk: 85, gen: 6 });
    assert.deepEqual(byId.get("cresselia")?.msGoBasis, { def: 120, spd: 130, gen: 7 });
    assert.equal(line("cresselia"), "152/258/260");
  });

  it("Slaking reaches 5,010 CP at L50 and 5,069 at L51", () => {
    assert.equal(line("slaking"), "290/166/284");
    assert.equal(byId.get("slaking")?.metrics.cp.l50, 5010);
    assert.equal(byId.get("slaking")?.metrics.cp.l51, 5069);
  });

  it("Blissey, Mega Rayquaza and Crowned Zacian match their GO lines", () => {
    assert.equal(line("blissey"), "129/169/496");
    assert.equal(line("rayquaza-mega"), "377/210/227");
    assert.equal(line("zacian-crowned"), "332/240/192");
    assert.equal(byId.get("zacian-crowned")?.metrics.cp.l50, 5629);
  });

  it("predicts unreleased Mega Zygarde at 403/181/415", () => {
    assert.equal(line("zygarde-mega"), "403/181/415");
    assert.equal(byId.get("zygarde-mega")?.go.status, "predicted");
  });

  it("keeps Shedinja's hand-set Stamina as a listed exception", () => {
    assert.equal(line("shedinja"), "153/73/1");
    assert.ok(byId.get("shedinja")?.exception);
    assert.equal(byId.get("shedinja")?.go.pvpReleased, false);
  });
});
