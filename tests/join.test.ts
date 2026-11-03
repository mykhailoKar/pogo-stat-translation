import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { joinGo, normalizeGoId } from "../pipeline/join.ts";
import type { MsForm } from "../pipeline/load-pokeapi.ts";
import type { GoEntry } from "../pipeline/load-pvpoke.ts";
import { parseOverrides } from "../pipeline/overrides.ts";
import { excludeForms, selectForms } from "../pipeline/select-forms.ts";

function ms(id: string, dex: number, opts: Partial<MsForm> = {}): MsForm {
  return {
    pokemonId: dex,
    id,
    dex,
    isDefault: true,
    order: dex,
    name: id,
    displayName: id,
    form: null,
    gen: 1,
    formGen: 1,
    types: ["normal"],
    isLegendary: false,
    isMythical: false,
    isBaby: false,
    isMega: false,
    isPrimal: false,
    isRegional: /-(alola|galar|hisui|paldea)/.test(id),
    ms: { hp: 50, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 },
    past: [],
    ...opts,
  };
}

function go(goId: string, dex: number): GoEntry {
  return { goId, dex, name: goId, atk: 100, def: 100, sta: 100, tags: [], pvpReleased: true, shadowAvailable: false };
}

const noOverrides = parseOverrides("");

describe("normalizeGoId", () => {
  it("swaps underscores for hyphens and regional adjectives for PokéAPI's region names", () => {
    assert.equal(normalizeGoId("rattata_alolan"), "rattata-alola");
    assert.equal(normalizeGoId("darmanitan_galarian_standard"), "darmanitan-galar-standard");
    assert.equal(normalizeGoId("typhlosion_hisuian"), "typhlosion-hisui");
    assert.equal(normalizeGoId("wooper_paldean"), "wooper-paldea");
    assert.equal(normalizeGoId("charizard_mega_x"), "charizard-mega-x");
  });
});

describe("joinGo", () => {
  const forms = [
    ms("rattata", 19),
    ms("rattata-alola", 19, { isDefault: false }),
    ms("deoxys-normal", 386),
    ms("nidoran-f", 29),
  ];

  it("matches exact ids after normalization", () => {
    const r = joinGo(forms, [go("rattata", 19), go("rattata_alolan", 19)], noOverrides);
    assert.deepEqual(
      r.matches.map((m) => [m.go.goId, m.msId, m.method]),
      [
        ["rattata", "rattata", "exact"],
        ["rattata_alolan", "rattata-alola", "exact"],
      ],
    );
  });

  it("matches a bare id to the species' default form", () => {
    const r = joinGo(forms, [go("deoxys", 386)], noOverrides);
    assert.equal(r.matches[0]?.msId, "deoxys-normal");
    assert.equal(r.matches[0]?.method, "default-form");
  });

  it("uses idMap before anything else", () => {
    const overrides = parseOverrides("idMap:\n  nidoran_female: nidoran-f\n");
    const r = joinGo(forms, [go("nidoran_female", 29)], overrides);
    assert.equal(r.matches[0]?.msId, "nidoran-f");
    assert.equal(r.matches[0]?.method, "idMap");
  });

  it("rejects an idMap target that isn't a candidate form", () => {
    const overrides = parseOverrides("idMap:\n  nidoran_female: nidoran-female\n");
    assert.throws(() => joinGo(forms, [go("nidoran_female", 29)], overrides), /not a selectable PokéAPI form/);
  });

  it("ignores entries matched by ignoreGo patterns", () => {
    const overrides = parseOverrides('ignoreGo:\n  - pattern: "^mewtwo_armored$"\n    reason: GO-only form\n');
    const r = joinGo(forms, [go("mewtwo_armored", 150)], overrides);
    assert.equal(r.ignored.length, 1);
    assert.equal(r.unmatched.length, 0);
  });

  it("reports unmatched entries instead of guessing", () => {
    const r = joinGo(forms, [go("greattusk", 984)], noOverrides);
    assert.deepEqual(
      r.unmatched.map((g) => g.goId),
      ["greattusk"],
    );
  });

  it("reports a second entry that matches an already matched form", () => {
    const r = joinGo(forms, [go("deoxys", 386), go("deoxys_normal", 386)], noOverrides);
    assert.equal(r.matches.length, 1);
    assert.deepEqual(r.conflicts.map((k) => [k.go.goId, k.msId, k.takenBy]), [["deoxys_normal", "deoxys-normal", "deoxys"]]);
  });

  it("refuses a match across different dex numbers", () => {
    const overrides = parseOverrides("idMap:\n  pikachu: rattata\n");
    assert.throws(() => joinGo(forms, [go("pikachu", 25)], overrides), /dex/);
  });
});

describe("form selection", () => {
  const base = { hp: 50, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 };
  const forms = [
    ms("castform", 351),
    ms("castform-sunny", 351, { isDefault: false, order: 352 }),
    ms("minior-red-meteor", 774),
    ms("minior-orange-meteor", 774, { isDefault: false, order: 775 }),
    ms("minior-red", 774, { isDefault: false, order: 776, ms: { ...base, atk: 100 } }),
    ms("minior-orange", 774, { isDefault: false, order: 777, ms: { ...base, atk: 100 } }),
    ms("rattata-alola", 19, { isDefault: false }),
    ms("venusaur-gmax", 3, { isDefault: false }),
  ];
  const overrides = parseOverrides('excludeForms:\n  - pattern: "-gmax$"\n    reason: same stats\n');

  it("drops excluded patterns before the join", () => {
    const { candidates, excluded } = excludeForms(forms, overrides);
    assert.deepEqual(excluded.map((e) => e.id), ["venusaur-gmax"]);
    assert.ok(!candidates.some((f) => f.id === "venusaur-gmax"));
  });

  it("keeps defaults, regional forms, GO-matched forms and forms with new stats; drops duplicates", () => {
    const { candidates } = excludeForms(forms, overrides);
    const { kept, dropped } = selectForms(candidates, new Set(["castform-sunny"]), overrides);
    assert.deepEqual(kept.map((f) => f.id).sort(), ["castform", "castform-sunny", "minior-red", "minior-red-meteor", "rattata-alola"]);
    assert.deepEqual(dropped.map((f) => f.id).sort(), ["minior-orange", "minior-orange-meteor"]);
  });
});
