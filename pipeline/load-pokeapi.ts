// Reads the pinned PokéAPI CSVs into one record per PokéAPI `pokemon` (species default forms and alternate forms).
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import type { PastStat } from "../src/lib/stat-basis.ts";
import type { MsStatKey, MsStats } from "../src/lib/types.ts";
import { pinnedFile } from "./sources.ts";

const ENGLISH = "9";

/** PokéAPI stat ids → our keys. Id 9 ("special", Gen I only) is ignored. */
const STAT_KEYS: Record<string, MsStatKey> = {
  "1": "hp",
  "2": "atk",
  "3": "def",
  "4": "spa",
  "5": "spd",
  "6": "spe",
};

const REGIONAL = /-(alola|galar|hisui|paldea)(-|$)/;
const MEGA = /-mega(-[a-z])?$/;
const PRIMAL = /-primal$/;

export interface MsForm {
  pokemonId: number;
  /** PokéAPI identifier, e.g. "rattata-alola". */
  id: string;
  dex: number;
  isDefault: boolean;
  /** PokéAPI's global sort order (or 1,000,000 + row id where PokéAPI has none). */
  order: number;
  name: string;
  displayName: string;
  form: string | null;
  /** Generation the species was introduced in. */
  gen: number;
  /** Generation this form was introduced in (drives the GO stat era). */
  formGen: number;
  types: string[];
  isLegendary: boolean;
  isMythical: boolean;
  isBaby: boolean;
  isMega: boolean;
  isPrimal: boolean;
  isRegional: boolean;
  /** PokéAPI's evolution chain id, shared by every species in a line. */
  evolutionChain: number;
  /** Whether any species evolves from this one. Evolution is per species, so a form can differ. */
  speciesEvolves: boolean;
  ms: MsStats;
  past: PastStat[];
}

type Row = Record<string, string>;

function readCsv(basename: string): Row[] {
  return parse(readFileSync(pinnedFile("pokeapi", basename), "utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as Row[];
}

function num(row: Row, key: string): number {
  const v = row[key];
  const n = Number(v);
  if (v === undefined || v === "" || !Number.isFinite(n)) {
    throw new Error(`Expected a number in column "${key}", got ${JSON.stringify(v)}`);
  }
  return n;
}

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  }
  return m;
}

export function loadPokeapi(): MsForm[] {
  const pokemon = readCsv("pokemon.csv");
  const speciesRows = readCsv("pokemon_species.csv");
  const species = new Map(speciesRows.map((r) => [r.id as string, r]));
  const evolvingSpecies = new Set(speciesRows.map((r) => r.evolves_from_species_id).filter(Boolean));
  const speciesNames = new Map(
    readCsv("pokemon_species_names.csv")
      .filter((r) => r.local_language_id === ENGLISH)
      .map((r) => [r.pokemon_species_id as string, r.name as string]),
  );
  const versionGroupGen = new Map(readCsv("version_groups.csv").map((r) => [r.id as string, num(r, "generation_id")]));
  // The default form row of each pokemon carries its introduction version group. A few newer
  // pokemon (e.g. koraidon-limited-build) have no row flagged default, so fall back to their first row.
  const defaultFormByPokemon = new Map<string, Row>();
  for (const [pid, rows] of groupBy(readCsv("pokemon_forms.csv"), (r) => r.pokemon_id as string)) {
    const pick = rows.find((r) => r.is_default === "1") ?? [...rows].sort((a, b) => num(a, "id") - num(b, "id"))[0];
    if (pick) defaultFormByPokemon.set(pid, pick);
  }
  const formNames = new Map(
    readCsv("pokemon_form_names.csv")
      .filter((r) => r.local_language_id === ENGLISH)
      .map((r) => [r.pokemon_form_id as string, r]),
  );
  const typeNames = new Map(readCsv("types.csv").map((r) => [r.id as string, r.identifier as string]));
  const typesByPokemon = groupBy(readCsv("pokemon_types.csv"), (r) => r.pokemon_id as string);
  const statsByPokemon = groupBy(readCsv("pokemon_stats.csv"), (r) => r.pokemon_id as string);
  const pastByPokemon = groupBy(readCsv("pokemon_stats_past.csv"), (r) => r.pokemon_id as string);

  return pokemon.map((p): MsForm => {
    const pid = p.id as string;
    const id = p.identifier as string;
    const sp = species.get(p.species_id as string);
    if (!sp) throw new Error(`No species row for ${id}`);
    const name = speciesNames.get(sp.id as string);
    if (!name) throw new Error(`No English name for species ${sp.identifier}`);

    const statRows = statsByPokemon.get(pid) ?? [];
    const ms = {} as MsStats;
    for (const r of statRows) {
      const key = STAT_KEYS[r.stat_id as string];
      if (key) ms[key] = num(r, "base_stat");
    }
    for (const key of Object.values(STAT_KEYS)) {
      if (ms[key] === undefined) throw new Error(`${id} is missing stat ${key}`);
    }

    const past: PastStat[] = [];
    for (const r of pastByPokemon.get(pid) ?? []) {
      const key = STAT_KEYS[r.stat_id as string];
      if (key) past.push({ generation: num(r, "generation_id"), stat: key, value: num(r, "base_stat") });
    }

    const formRow = defaultFormByPokemon.get(pid);
    if (!formRow) throw new Error(`No default form row for ${id}`);
    const formGen = versionGroupGen.get(formRow.introduced_in_version_group_id as string);
    if (formGen === undefined) throw new Error(`Unknown version group for ${id}`);
    const fname = formNames.get(formRow.id as string);

    const types = (typesByPokemon.get(pid) ?? [])
      .sort((a, b) => num(a, "slot") - num(b, "slot"))
      .map((r) => {
        const t = typeNames.get(r.type_id as string);
        if (!t) throw new Error(`Unknown type id ${r.type_id} for ${id}`);
        return t;
      });

    return {
      pokemonId: Number(pid),
      id,
      dex: num(sp, "id"),
      isDefault: p.is_default === "1",
      // PokéAPI leaves `order` empty for newer rows; sort those after the rest by row id.
      order: p.order ? num(p, "order") : 1_000_000 + Number(pid),
      name,
      displayName: fname?.pokemon_name || name,
      form: fname?.form_name || null,
      gen: num(sp, "generation_id"),
      formGen,
      types,
      isLegendary: sp.is_legendary === "1",
      isMythical: sp.is_mythical === "1",
      isBaby: sp.is_baby === "1",
      isMega: MEGA.test(id),
      isPrimal: PRIMAL.test(id),
      isRegional: REGIONAL.test(id),
      evolutionChain: num(sp, "evolution_chain_id"),
      speciesEvolves: evolvingSpecies.has(sp.id),
      ms,
      past,
    };
  });
}
