// The list's categories, search, sorting and URL state. Fixtures are built by hand so each rule is visible.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_STATE,
  categoryCounts,
  filterRows,
  inCategory,
  matchesQuery,
  nextSort,
  paramsFromState,
  sortRows,
  stateFromParams,
  type ListRow,
  type ListState,
} from "../src/lib/list.ts";

const stats = { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 };
const go = { atk: 1, def: 1, sta: 1 };

function row(id: string, dex: number, name: string, opts: Partial<ListRow> = {}): ListRow {
  return {
    id, dex, name, species: name,
    types: ["normal"], tags: [], pool: "standard", predicted: false,
    goFit: 50, percentile: 50, attackFit: 50, defenseFit: 50, speedFit: 50,
    cpNow: 1000, cpIdeal: 2000, adjustment: 1, idealAdjustment: 1,
    ms: stats, msGen: null, best: stats, go, ideal: go, note: null,
    ...opts,
  };
}

const charizard = row("charizard", 6, "Charizard", { tags: ["starter", "fully-evolved"], goFit: 60, cpNow: 3000 });
const megaCharizard = row("charizard-mega-x", 6, "Mega Charizard X", { species: "Charizard", tags: ["mega", "starter", "fully-evolved"], pool: "mega", goFit: 70, cpNow: 4000 });
const mewtwo = row("mewtwo", 150, "Mewtwo", { tags: ["legendary", "fully-evolved"], goFit: 55, cpNow: 4700 });
const mew = row("mew", 151, "Mew", { tags: ["mythical", "fully-evolved"], goFit: 45, cpNow: 3700 });
const primal = row("kyogre-primal", 382, "Primal Kyogre", { species: "Kyogre", tags: ["legendary", "primal", "fully-evolved"], pool: "mega", goFit: 65 });
const charmander = row("charmander", 4, "Charmander", { tags: ["starter"], goFit: 55 });
const flabebe = row("flabebe", 669, "Flabébé", { goFit: 40 });
const farfetchd = row("farfetchd", 83, "Farfetch’d", { goFit: 40 });
const rows = [charizard, megaCharizard, mewtwo, mew, primal, charmander, flabebe, farfetchd];

const state = (next: Partial<ListState>): ListState => ({ ...DEFAULT_STATE, ...next });
const ids = (list: ListRow[]): string[] => list.map((r) => r.id);

describe("categories", () => {
  it("shows every form under All species", () => {
    assert.equal(filterRows(rows, state({ category: "all" })).length, rows.length);
  });

  it("gives Megas and Primals a category of their own", () => {
    assert.deepEqual(ids(filterRows(rows, state({ category: "mega" }))), ["charizard-mega-x", "kyogre-primal"]);
  });

  it("also lists Megas and Primals under their species' categories", () => {
    assert.ok(inCategory(primal, "legendary"));
    assert.ok(inCategory(megaCharizard, "starter"));
    assert.ok(inCategory(megaCharizard, "fully-evolved"));
    assert.equal(inCategory(megaCharizard, "legendary"), false);
  });

  it("selects by tag for the rest", () => {
    assert.deepEqual(ids(filterRows(rows, state({ category: "legendary" }))), ["mewtwo", "kyogre-primal"]);
    assert.deepEqual(ids(filterRows(rows, state({ category: "mythical" }))), ["mew"]);
    assert.deepEqual(ids(filterRows(rows, state({ category: "starter" }))), ["charizard", "charizard-mega-x", "charmander"]);
    assert.deepEqual(ids(filterRows(rows, state({ category: "fully-evolved" }))), ["charizard", "charizard-mega-x", "mewtwo", "mew", "kyogre-primal"]);
  });

  it("counts each category", () => {
    assert.deepEqual(categoryCounts(rows), { all: 8, legendary: 2, mega: 2, mythical: 1, starter: 3, "fully-evolved": 5 });
  });
});

describe("search", () => {
  it("ignores case, accents and punctuation", () => {
    assert.ok(matchesQuery(charizard, "CHARI"));
    assert.ok(matchesQuery(flabebe, "flabebe"));
    assert.ok(matchesQuery(farfetchd, "farfetchd"));
  });

  it("finds a dex number exactly", () => {
    assert.ok(matchesQuery(charizard, "6"));
    assert.ok(matchesQuery(charizard, "#6"));
    assert.equal(matchesQuery(mewtwo, "6"), false);
  });

  it("treats a blank query as no filter", () => {
    assert.ok(matchesQuery(mew, "   "));
  });

  it("searches within the selected category", () => {
    assert.deepEqual(ids(filterRows(rows, state({ category: "mega", query: "char" }))), ["charizard-mega-x"]);
  });
});

describe("sorting", () => {
  it("sorts by a stat in either direction, without touching the input", () => {
    const input = [mew, mewtwo, charizard];
    assert.deepEqual(ids(sortRows(input, { sort: "goFit", direction: "desc" })), ["charizard", "mewtwo", "mew"]);
    assert.deepEqual(ids(sortRows(input, { sort: "goFit", direction: "asc" })), ["mew", "mewtwo", "charizard"]);
    assert.deepEqual(ids(input), ["mew", "mewtwo", "charizard"]);
  });

  it("sorts names alphabetically, treating accents as plain letters", () => {
    assert.deepEqual(ids(sortRows([mewtwo, flabebe, charizard], { sort: "name", direction: "asc" })), ["charizard", "flabebe", "mewtwo"]);
    assert.deepEqual(ids(sortRows([mewtwo, flabebe, charizard], { sort: "name", direction: "desc" })), ["mewtwo", "flabebe", "charizard"]);
  });

  it("keeps a species' forms together when sorting by name", () => {
    const sorted = sortRows([mewtwo, megaCharizard, charizard, primal], { sort: "name", direction: "asc" });
    assert.deepEqual(ids(sorted), ["charizard-mega-x", "charizard", "kyogre-primal", "mewtwo"]);
    const zygarde = row("zygarde-10", 718, "10% Zygarde", { species: "Zygarde" });
    assert.deepEqual(ids(sortRows([zygarde, mewtwo], { sort: "name", direction: "asc" })), ["mewtwo", "zygarde-10"]);
  });

  it("sorts by dex number", () => {
    assert.deepEqual(ids(sortRows([mew, charmander, mewtwo], { sort: "dex", direction: "asc" })), ["charmander", "mewtwo", "mew"]);
  });

  it("breaks ties by dex number, then keeps the rows' order", () => {
    const sameScore = [row("b", 20, "B"), row("c", 10, "C2"), row("a", 10, "C1")];
    assert.deepEqual(ids(sortRows(sameScore, { sort: "goFit", direction: "desc" })), ["c", "a", "b"]);
  });

  it("flips the sorted column and starts new columns in their natural direction", () => {
    assert.equal(nextSort(state({ sort: "goFit", direction: "desc" }), "goFit").direction, "asc");
    assert.deepEqual(nextSort(state({ sort: "goFit", direction: "asc" }), "name"), state({ sort: "name", direction: "asc" }));
    assert.deepEqual(nextSort(state({ sort: "name", direction: "asc" }), "cpIdeal"), state({ sort: "cpIdeal", direction: "desc" }));
  });
});

describe("URL state", () => {
  it("keeps the default list's URL empty", () => {
    assert.equal(paramsFromState(DEFAULT_STATE).toString(), "");
    assert.deepEqual(stateFromParams(new URLSearchParams("")), DEFAULT_STATE);
  });

  it("round-trips every setting", () => {
    const shared = state({ category: "starter", sort: "name", direction: "desc", query: "char" });
    assert.deepEqual(stateFromParams(paramsFromState(shared)), shared);
  });

  it("omits a direction that matches the column's natural one", () => {
    assert.equal(paramsFromState(state({ sort: "name", direction: "asc" })).toString(), "sort=name");
    assert.deepEqual(stateFromParams(new URLSearchParams("sort=name")), state({ sort: "name", direction: "asc" }));
  });

  it("falls back to defaults for unknown values", () => {
    assert.deepEqual(stateFromParams(new URLSearchParams("category=nope&sort=nope&direction=sideways")), DEFAULT_STATE);
  });
});
