// What the site's list shows: its rows, categories, sorting, search, pages and URL state. Pure, so the same
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
  /** GO's multiplier on this form's stats. Below 1 means GO cuts the form. */
  adjustment: number;
  /** GO's multiplier on the best shape, which can be cut even when the form isn't. */
  idealAdjustment: number;
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

/** A category that can be selected or left out. "all" is neither: it's what the list shows with no choice made. */
export type FilterId = Exclude<CategoryId, "all">;

const FILTER_IDS = CATEGORIES.map((category) => category.id).filter((id): id is FilterId => id !== "all");

export type Direction = "asc" | "desc";

/** Everything the list can sort by, in display order. */
export const COLUMNS = [
  { key: "dex", label: "Dex number", short: "#", first: "asc", hint: "National Pokédex number." },
  { key: "name", label: "Name", short: "Pokémon", first: "asc", hint: "Select a row to see its stats and best shape." },
  {
    key: "goFit",
    label: "GO Fit",
    short: "GO Fit",
    first: "desc",
    hint: "How close this form comes to the best spread of its own stat points.",
  },
  {
    key: "percentile",
    label: "Percentile",
    short: "Percentile",
    first: "desc",
    hint: "Share of forms with a lower GO Fit. Megas and Primals are ranked among themselves.",
  },
  {
    key: "attackFit",
    label: "Attack Fit",
    short: "Attack Fit",
    first: "desc",
    hint: "GO Attack compared with having all attack points in one stat.",
  },
  {
    key: "defenseFit",
    label: "Defense Fit",
    short: "Defense Fit",
    first: "desc",
    hint: "GO Defense compared with having all defense points in one stat.",
  },
  {
    key: "speedFit",
    label: "Speed Fit",
    short: "Speed Fit",
    first: "desc",
    hint: "How close this form's Speed is to the best use of those points.",
  },
  { key: "cpNow", label: "L50 CP now", short: "L50 CP now", first: "desc", hint: "CP at level 50 with perfect IVs." },
  {
    key: "cpIdeal",
    label: "L50 CP ideal",
    short: "L50 CP ideal",
    first: "desc",
    hint: "CP of the best shape at level 50 with perfect IVs, after GO's own cut.",
  },
] as const;

export type SortKey = (typeof COLUMNS)[number]["key"];

export interface ListState {
  /** Categories to show: a form shows if it's in any of them. Empty shows every form. */
  include: FilterId[];
  /** Categories to leave out, even when the form is also in an included one. */
  exclude: FilterId[];
  sort: SortKey;
  direction: Direction;
  query: string;
  page: number;
}

export const DEFAULT_STATE: ListState = {
  include: [],
  exclude: [],
  sort: "goFit",
  direction: "desc",
  query: "",
  page: 1,
};

export const PAGE_SIZE = 10;

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
    adjustment: p.goPredicted.steps.adjustment,
    idealAdjustment: ideal.adjustment,
    ms: { hp, atk, def, spa, spd, spe },
    msGen: gen,
    best: best.ms,
    go: { atk: goAtk, def: goDef, sta },
    ideal: { atk: ideal.atk, def: ideal.def, sta: ideal.sta },
    note: p.exception?.reason ?? null,
  };
}

/** Megas and Primals keep their species' tags, so they appear in those categories as well as their own. */
export function inCategory(row: ListRow, category: CategoryId): boolean {
  if (category === "all") return true;
  if (category === "mega") return row.pool === "mega";
  return row.tags.includes(category);
}

/** In any included category, or every form when none is included, and in no excluded category. */
export function inCategories(row: ListRow, state: Pick<ListState, "include" | "exclude">): boolean {
  if (state.exclude.some((id) => inCategory(row, id))) return false;
  return state.include.length === 0 || state.include.some((id) => inCategory(row, id));
}

export type CategoryStatus = "on" | "off" | "excluded";

/** How a category's pill shows. All species is on only when no category is selected or left out. */
export function categoryStatus(state: Pick<ListState, "include" | "exclude">, id: CategoryId): CategoryStatus {
  if (id === "all") return state.include.length === 0 && state.exclude.length === 0 ? "on" : "off";
  if (state.exclude.includes(id)) return "excluded";
  return state.include.includes(id) ? "on" : "off";
}

/** Keeps categories in the pills' order, once each, so equal choices give equal URLs. */
function ordered(ids: readonly FilterId[]): FilterId[] {
  return FILTER_IDS.filter((id) => ids.includes(id));
}

const without = (ids: readonly FilterId[], id: FilterId) => ids.filter((other) => other !== id);

/**
 * A click on a category. All species clears every choice. A selected or left-out category goes back to neither,
 * and any other is added to the selection. The list starts over at page 1.
 */
export function selectCategory(state: ListState, id: CategoryId): ListState {
  const page = DEFAULT_STATE.page;
  if (id === "all") return { ...state, include: [], exclude: [], page };
  if (state.include.includes(id)) return { ...state, include: without(state.include, id), page };
  if (state.exclude.includes(id)) return { ...state, exclude: without(state.exclude, id), page };
  return { ...state, include: ordered([...state.include, id]), page };
}

/** A double-click on a category: leaves it out, or brings it back if it was left out. All species can't be. */
export function excludeCategory(state: ListState, id: CategoryId): ListState {
  if (id === "all") return state;
  const page = DEFAULT_STATE.page;
  if (state.exclude.includes(id)) return { ...state, exclude: without(state.exclude, id), page };
  return { ...state, include: without(state.include, id), exclude: ordered([...state.exclude, id]), page };
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
  return rows.filter((row) => inCategories(row, state) && matchesQuery(row, state.query));
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

/** At least 1, so an empty list still has a page to be on. */
export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

/** The rows on one page. A page past the end gives the last page. */
export function pageRows<T>(rows: readonly T[], page: number): T[] {
  const start = (Math.min(page, pageCount(rows.length)) - 1) * PAGE_SIZE;
  return rows.slice(start, start + PAGE_SIZE);
}

/** How many pages the pager's −5 and +5 buttons move. */
export const PAGE_JUMP = 5;

/** The page `delta` pages away, kept between the first page and the last, so −5 from page 3 lands on page 1. */
export function jumpPage(page: number, pages: number, delta: number): number {
  return Math.min(pages, Math.max(1, page + delta));
}

/** The pages a pager offers: the ends and the current page's neighbours, with null for each gap, as in 1 … 4 5 6 … 125. */
export function pageLinks(page: number, pages: number): (number | null)[] {
  const from = Math.max(1, Math.min(page - 1, pages - 2));
  const to = Math.min(pages, Math.max(page + 1, 3));
  const wanted = new Set([1, pages]);
  for (let n = from; n <= to; n++) wanted.add(n);

  const links: (number | null)[] = [];
  let previous = 0;
  for (const n of [...wanted].sort((a, b) => a - b)) {
    // A gap of a single page shows that page, since "…" would take the same room.
    if (n - previous === 2) links.push(n - 1);
    else if (n - previous > 2) links.push(null);
    links.push(n);
    previous = n;
  }
  return links;
}

function firstDirection(key: SortKey): Direction {
  return COLUMNS.find((column) => column.key === key)?.first ?? "desc";
}

/** Selecting the sorted column flips it. A new column starts in its natural direction. Either way the list starts over. */
export function nextSort(state: ListState, key: SortKey): ListState {
  if (state.sort === key)
    return { ...state, direction: state.direction === "asc" ? "desc" : "asc", page: DEFAULT_STATE.page };
  return { ...state, sort: key, direction: firstDirection(key), page: DEFAULT_STATE.page };
}

function isFilterId(value: string): value is FilterId {
  return FILTER_IDS.some((id) => id === value);
}

/** Every value of a repeated parameter, also split at commas, keeping the known categories. */
function filterIds(params: URLSearchParams, name: string): FilterId[] {
  return ordered(
    params
      .getAll(name)
      .flatMap((value) => value.split(","))
      .filter(isFilterId),
  );
}

function isSortKey(value: string | null): value is SortKey {
  return COLUMNS.some((column) => column.key === value);
}

/**
 * Reads the list's state from the URL. Anything missing or unknown keeps its default. Categories repeat, as in
 * `?category=legendary&category=mythical&exclude=mega`, so a link from before they could combine still works.
 */
export function stateFromParams(params: URLSearchParams): ListState {
  const exclude = filterIds(params, "exclude");
  const sort = params.get("sort");
  const direction = params.get("direction");
  const page = Number(params.get("page"));
  const key = isSortKey(sort) ? sort : DEFAULT_STATE.sort;
  return {
    include: filterIds(params, "category").filter((id) => !exclude.includes(id)),
    exclude,
    sort: key,
    direction:
      direction === "asc" || direction === "desc"
        ? direction
        : isSortKey(sort)
          ? firstDirection(key)
          : DEFAULT_STATE.direction,
    query: params.get("q") ?? "",
    page: Number.isInteger(page) && page >= 1 ? page : DEFAULT_STATE.page,
  };
}

/** Writes only what differs from the defaults, so the plain list keeps a clean URL. */
export function paramsFromState(state: ListState): URLSearchParams {
  const params = new URLSearchParams();
  for (const id of ordered(state.include)) params.append("category", id);
  for (const id of ordered(state.exclude)) params.append("exclude", id);
  if (state.sort !== DEFAULT_STATE.sort) params.set("sort", state.sort);
  if (state.direction !== firstDirection(state.sort)) params.set("direction", state.direction);
  if (state.query !== "") params.set("q", state.query);
  if (state.page !== DEFAULT_STATE.page) params.set("page", String(state.page));
  return params;
}
