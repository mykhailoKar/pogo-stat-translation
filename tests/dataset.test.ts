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
      for (const k of ["bstPct", "cpL50Pct", "spL50Pct"] as const) assert.ok(p.ranks[k] >= 0 && p.ranks[k] <= 100, `${p.id} ${k}`);
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
