// The list's categories, search, sorting and URL state. Fixtures are built by hand so each rule is visible.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_STATE,
  PAGE_SIZE,
  categoryCounts,
  filterRows,
  inCategory,
  matchesQuery,
  nextSort,
  pageCount,
  pageLinks,
  pageRows,
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

  it("goes back to the first page whenever the order changes", () => {
    assert.equal(nextSort(state({ sort: "goFit", page: 7 }), "goFit").page, 1);
    assert.equal(nextSort(state({ sort: "goFit", page: 7 }), "name").page, 1);
  });
});

describe("pages", () => {
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1);

  it("shows ten rows a page", () => {
    assert.equal(PAGE_SIZE, 10);
    assert.deepEqual(pageRows(numbers, 1), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.deepEqual(pageRows(numbers, 2), [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it("leaves the remainder on the last page", () => {
    assert.deepEqual(pageRows(numbers, 3), [21, 22, 23, 24, 25]);
  });

  it("treats a page past the end as the last page", () => {
    assert.deepEqual(pageRows(numbers, 99), [21, 22, 23, 24, 25]);
  });

  it("counts pages, with one for an empty list", () => {
    assert.equal(pageCount(0), 1);
    assert.equal(pageCount(10), 1);
    assert.equal(pageCount(11), 2);
    assert.equal(pageCount(1250), 125);
    assert.deepEqual(pageRows([], 1), []);
  });

  it("offers the ends and the current page's neighbours", () => {
    assert.deepEqual(pageLinks(60, 125), [1, null, 59, 60, 61, null, 125]);
    assert.deepEqual(pageLinks(1, 125), [1, 2, 3, null, 125]);
    assert.deepEqual(pageLinks(125, 125), [1, null, 123, 124, 125]);
  });

  it("shows a lone skipped page rather than a gap", () => {
    assert.deepEqual(pageLinks(4, 125), [1, 2, 3, 4, 5, null, 125]);
    assert.deepEqual(pageLinks(122, 125), [1, null, 121, 122, 123, 124, 125]);
  });

  it("lists every page of a short list", () => {
    assert.deepEqual(pageLinks(1, 2), [1, 2]);
    assert.deepEqual(pageLinks(2, 3), [1, 2, 3]);
    assert.deepEqual(pageLinks(3, 5), [1, 2, 3, 4, 5]);
  });
});

describe("URL state", () => {
  it("keeps the default list's URL empty", () => {
    assert.equal(paramsFromState(DEFAULT_STATE).toString(), "");
    assert.deepEqual(stateFromParams(new URLSearchParams("")), DEFAULT_STATE);
  });

  it("round-trips every setting", () => {
    const shared = state({ category: "starter", sort: "name", direction: "desc", query: "char", page: 3 });
    assert.deepEqual(stateFromParams(paramsFromState(shared)), shared);
  });

  it("leaves the first page out of the URL", () => {
    assert.equal(paramsFromState(state({ page: 1 })).toString(), "");
    assert.equal(paramsFromState(state({ page: 2 })).toString(), "page=2");
  });

  it("falls back to the first page for anything that isn't a page", () => {
    for (const value of ["0", "-3", "2.5", "two", ""]) {
      assert.equal(stateFromParams(new URLSearchParams(`page=${value}`)).page, 1, value);
    }
  });

  it("omits a direction that matches the column's natural one", () => {
    assert.equal(paramsFromState(state({ sort: "name", direction: "asc" })).toString(), "sort=name");
    assert.deepEqual(stateFromParams(new URLSearchParams("sort=name")), state({ sort: "name", direction: "asc" }));
  });

  it("falls back to defaults for unknown values", () => {
    assert.deepEqual(stateFromParams(new URLSearchParams("category=nope&sort=nope&direction=sideways")), DEFAULT_STATE);
  });
});
