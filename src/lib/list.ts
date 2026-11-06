// What the site's list shows: its rows, categories, sorting, search and URL state. Pure, so the same
// code runs in the build, the browser and the tests.
import type { DatasetEntry, GoStats, MsStats, Pool } from "./types.ts";

export interface ListRow {
  id: string;
  dex: number;
  /** Full display name, e.g. "Mega Charizard X". */
  name: string;
  /** Species name, e.g. "Charizard". Sorting by name uses this so a species' forms stay together. */
  species: string;
  types: string[];
  tags: string[];
  pool: Pool;
  /** True when the form has no GO data yet, so its GO stats are the formula's prediction. */
  predicted: boolean;
  goFit: number;
  percentile: number;
  attackFit: number;
  defenseFit: number;
  speedFit: number;
  cpNow: number;
  cpIdeal: number;
  /** True when GO's ×0.91 cut applies to the best shape but not to the form. */
  idealCut: boolean;
  /** The stats GO converts from. */
  ms: MsStats;
  /** The generation of those stats, when GO uses an older era than the current games. */
  msGen: number | null;
  best: MsStats;
  go: GoStats;
  ideal: GoStats;
  /** Why GO's stats differ from the formula, for the few listed exceptions. */
  note: string | null;
}

export const CATEGORIES = [
  { id: "all", label: "All species" },
  { id: "legendary", label: "Legendaries" },
  { id: "mega", label: "Megas + Primals" },
  { id: "mythical", label: "Mythicals" },
  { id: "starter", label: "Starters" },
  { id: "fully-evolved", label: "Fully evolved" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export type Direction = "asc" | "desc";

/** Everything the list can sort by, in display order. */
export const COLUMNS = [
  { key: "dex", label: "Dex number", short: "#", first: "asc", hint: "National Pokédex number." },
  { key: "name", label: "Name", short: "Pokémon", first: "asc", hint: "Select a row to see its stats and best shape." },
  { key: "goFit", label: "GO Fit", short: "GO Fit", first: "desc", hint: "How close this form comes to the best spread of its own stat points." },
  { key: "percentile", label: "Percentile", short: "Percentile", first: "desc", hint: "Share of forms with a lower GO Fit. Megas and Primals are ranked among themselves." },
  { key: "attackFit", label: "Attack Fit", short: "Attack Fit", first: "desc", hint: "GO Attack compared with having all attack points in one stat." },
  { key: "defenseFit", label: "Defense Fit", short: "Defense Fit", first: "desc", hint: "GO Defense compared with having all defense points in one stat." },
  { key: "speedFit", label: "Speed Fit", short: "Speed Fit", first: "desc", hint: "How close this form's Speed is to the best use of those points." },
  { key: "cpNow", label: "L50 CP now", short: "L50 CP now", first: "desc", hint: "CP at level 50 with perfect IVs." },
  { key: "cpIdeal", label: "L50 CP ideal", short: "L50 CP ideal", first: "desc", hint: "CP of the best shape at level 50 with perfect IVs, after GO's own cut." },
] as const;

export type SortKey = (typeof COLUMNS)[number]["key"];

export interface ListState {
  category: CategoryId;
  sort: SortKey;
  direction: Direction;
  query: string;
}

export const DEFAULT_STATE: ListState = { category: "all", sort: "goFit", direction: "desc", query: "" };

export function toListRow(p: DatasetEntry): ListRow {
  const { gen, ...older } = p.msGoBasis ?? { gen: null };
  const { hp, atk, def, spa, spd, spe } = { ...p.ms, ...older };
  const { atk: goAtk, def: goDef, sta } = p.go;
  const { ideal, best } = p.goFit;
  return {
    id: p.id,
    dex: p.dex,
    name: p.displayName,
    species: p.name,
    types: p.types,
    tags: p.tags,
    pool: p.ranks.pool,
    predicted: p.go.status === "predicted",
    goFit: p.goFit.score,
    percentile: p.ranks.goFitPct,
    attackFit: p.goFit.attackFit,
    defenseFit: p.goFit.defenseFit,
    speedFit: p.goFit.speedFit,
    cpNow: p.metrics.cp.l50,
    cpIdeal: ideal.cpL50,
    idealCut: ideal.cut,
    ms: { hp, atk, def, spa, spd, spe },
    msGen: gen,
    best: best.ms,
    go: { atk: goAtk, def: goDef, sta },
    ideal: { atk: ideal.atk, def: ideal.def, sta: ideal.sta },
    note: p.exception?.reason ?? null,
  };
}

/** Megas and Primals only appear under All species and their own category. */
export function inCategory(row: ListRow, category: CategoryId): boolean {
  if (category === "all") return true;
  if (category === "mega") return row.pool === "mega";
  return row.pool === "standard" && row.tags.includes(category);
}

export function categoryCounts(rows: readonly ListRow[]): Record<CategoryId, number> {
  const counts = {} as Record<CategoryId, number>;
  for (const { id } of CATEGORIES) counts[id] = rows.filter((row) => inCategory(row, id)).length;
  return counts;
}

/** Lower case with accents and punctuation removed, so "flabebe" finds Flabébé and "farfetchd" Farfetch'd. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Matches on the name, or on the exact dex number when the query is a number such as "6" or "#6". */
export function matchesQuery(row: ListRow, query: string): boolean {
  const needle = normalize(query);
  if (needle === "") return true;
  if (/^\d+$/.test(needle) && row.dex === Number(needle)) return true;
  return normalize(row.name).includes(needle);
}

export function filterRows(rows: readonly ListRow[], state: ListState): ListRow[] {
  return rows.filter((row) => inCategory(row, state.category) && matchesQuery(row, state.query));
}

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

/**
 * Sorts a copy. Names sort by species, so Mega Charizard X sits next to Charizard rather than under M.
 * Ties always fall back to dex number, then to the rows' original order, which puts a species' default form first.
 */
export function sortRows(rows: readonly ListRow[], state: Pick<ListState, "sort" | "direction">): ListRow[] {
  const { sort, direction } = state;
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const order = sort === "name" ? collator.compare(a.species, b.species) : a[sort] - b[sort];
    return sign * order || a.dex - b.dex;
  });
}

function firstDirection(key: SortKey): Direction {
  return COLUMNS.find((column) => column.key === key)?.first ?? "desc";
}

/** Selecting the sorted column flips it. A new column starts in its natural direction. */
export function nextSort(state: ListState, key: SortKey): ListState {
  if (state.sort === key) return { ...state, direction: state.direction === "asc" ? "desc" : "asc" };
  return { ...state, sort: key, direction: firstDirection(key) };
}

function isCategory(value: string | null): value is CategoryId {
  return CATEGORIES.some((category) => category.id === value);
}

function isSortKey(value: string | null): value is SortKey {
  return COLUMNS.some((column) => column.key === value);
}

/** Reads the list's state from the URL. Anything missing or unknown keeps its default. */
export function stateFromParams(params: URLSearchParams): ListState {
  const category = params.get("category");
  const sort = params.get("sort");
  const direction = params.get("direction");
  const key = isSortKey(sort) ? sort : DEFAULT_STATE.sort;
  return {
    category: isCategory(category) ? category : DEFAULT_STATE.category,
    sort: key,
    direction: direction === "asc" || direction === "desc" ? direction : isSortKey(sort) ? firstDirection(key) : DEFAULT_STATE.direction,
    query: params.get("q") ?? "",
  };
}

/** Writes only what differs from the defaults, so the plain list keeps a clean URL. */
export function paramsFromState(state: ListState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.category !== DEFAULT_STATE.category) params.set("category", state.category);
  if (state.sort !== DEFAULT_STATE.sort) params.set("sort", state.sort);
  if (state.direction !== firstDirection(state.sort)) params.set("direction", state.direction);
  if (state.query !== "") params.set("q", state.query);
  return params;
}
