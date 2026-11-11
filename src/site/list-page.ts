// Runs the list page: reads the rows embedded in the HTML, then renders them from the current state.
import {
  COLUMNS,
  PAGE_JUMP,
  PAGE_SIZE,
  categoryStatus,
  excludeCategory,
  filterRows,
  jumpPage,
  nextSort,
  pageCount,
  pageLinks,
  pageRows,
  paramsFromState,
  selectCategory,
  sortRows,
  stateFromParams,
  widestPageLinks,
  type CategoryId,
  type FilterId,
  type ListRow,
  type ListState,
  type SortKey,
} from "../lib/list.ts";
import { isTypeName } from "../lib/type-icons.ts";
import type { GoStats, MsStats } from "../lib/types.ts";

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id}`);
  return found as T;
}

const rows = JSON.parse(element("list-data").textContent ?? "[]") as ListRow[];
const table = element<HTMLTableElement>("list-table");
const body = element<HTMLTableSectionElement>("list-body");
const head = element<HTMLTableSectionElement>("list-head");
const count = element("list-count");
const pager = element("list-pager");
const empty = element("list-empty");
const search = element<HTMLInputElement>("list-search");
const sortSelect = element<HTMLSelectElement>("list-sort");
const directionButton = element<HTMLButtonElement>("list-direction");
const categories = element("list-categories");
const baseUrl = body.dataset.base ?? "/";

let state: ListState = stateFromParams(new URLSearchParams(location.search));
const open = new Set<string>();
const rowById = new Map(rows.map((row) => [row.id, row]));
/** The page on screen, so render() can tell when the page changes. */
let shownPage = 0;

const number = new Intl.NumberFormat("en");

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** A type's name with its icon, which points into the sprite in the page. Screen readers get the name alone. */
function typeHtml(type: string): string {
  const icon = isTypeName(type)
    ? `<svg class="type-icon" aria-hidden="true" focusable="false"><use href="#type-${type}"></use></svg>`
    : "";
  return `<span class="type">${icon}${capitalize(type)}</span>`;
}

function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function spreadRow(label: string, ms: MsStats): string {
  const cells = [ms.hp, ms.atk, ms.def, ms.spa, ms.spd, ms.spe].map((value) => `<td>${value}</td>`).join("");
  return `<tr><th scope="row">${label}</th>${cells}</tr>`;
}

function goRow(label: string, go: GoStats): string {
  return `<tr><th scope="row">${label}</th><td>${go.atk}</td><td>${go.def}</td><td>${go.sta}</td></tr>`;
}

function detailNotes(row: ListRow): string {
  const notes: string[] = [];
  if (row.adjustment < 1)
    notes.push(`GO multiplies this form's stats by ${row.adjustment}, and its best shape keeps that cut.`);
  else if (row.idealAdjustment < 1)
    notes.push(
      `The best shape would cross GO's 4,000 CP line, so its GO stats and CP ideal include the ×${row.idealAdjustment} cut. GO Fit leaves that cut out.`,
    );
  if (row.msGen !== null)
    notes.push(`GO still uses this form's Gen ${row.msGen} stats, so they differ from the current games.`);
  if (row.predicted) notes.push("This form isn't in GO data yet, so its GO stats are the formula's prediction.");
  if (row.note) notes.push(escapeHtml(row.note));
  return notes.map((note) => `<li>${note}</li>`).join("");
}

function detailHtml(row: ListRow): string {
  const notes = detailNotes(row);
  return `<tr class="detail" id="detail-${row.id}"><td colspan="${COLUMNS.length}"><div class="detail-grid">
    <div class="scroll-x">
      <table class="mini">
        <caption>Main-series stats</caption>
        <thead><tr><th scope="col"><span class="sr-only">Spread</span></th><th scope="col">HP</th><th scope="col">Atk</th><th scope="col">Def</th><th scope="col">SpA</th><th scope="col">SpD</th><th scope="col">Spe</th></tr></thead>
        <tbody>${spreadRow("Now", row.ms)}${spreadRow("Best shape", row.best)}</tbody>
      </table>
    </div>
    <div class="scroll-x">
      <table class="mini">
        <caption>GO stats</caption>
        <thead><tr><th scope="col"><span class="sr-only">Spread</span></th><th scope="col">Attack</th><th scope="col">Defense</th><th scope="col">Stamina</th></tr></thead>
        <tbody>${goRow("Now", row.go)}${goRow("Ideal", row.ideal)}</tbody>
      </table>
    </div>
  </div>${notes ? `<ul class="detail-notes">${notes}</ul>` : ""}<a class="detail-link" href="${baseUrl}about/#go-fit">How this is calculated</a></td></tr>`;
}

/** Sits beside any CP that includes one of GO's reductions. */
function cutBadge(adjustment: number): string {
  return adjustment < 1 ? `<span class="badge" title="Includes GO's ×${adjustment} cut">Cut</span>` : "";
}

/**
 * A row's cells. The name and the types each keep to one line and end in "…" if they don't fit, so every row is as
 * tall as the next and the pager stays in one place (#14). Opening a row shows them whole.
 */
function cellsHtml(row: ListRow, isOpen: boolean): string {
  const types = row.types.map(typeHtml).join(" ");
  const predicted = row.predicted
    ? `<span class="badge" title="Not in GO data yet; GO stats are predicted">Predicted</span>`
    : "";
  return `<td class="col-dex">${row.dex}</td>
    <th scope="row" class="col-name"><div class="name-cell"><button type="button" class="name" aria-expanded="${isOpen}"><span class="chevron" aria-hidden="true"></span><span class="name-text">${escapeHtml(row.name)}</span></button><span class="tags"><span class="types">${types}</span>${predicted}</span></div></th>
    <td class="col-fit" data-label="GO Fit">${percent(row.goFit)}</td>
    <td data-label="Percentile">${row.percentile.toFixed(1)}</td>
    <td data-label="Attack Fit">${percent(row.attackFit)}</td>
    <td data-label="Defense Fit">${percent(row.defenseFit)}</td>
    <td data-label="Speed Fit">${percent(row.speedFit)}</td>
    <td data-label="L50 CP now">${number.format(row.cpNow)}${cutBadge(row.adjustment)}</td>
    <td data-label="L50 CP ideal">${number.format(row.cpIdeal)}${cutBadge(row.idealAdjustment)}</td>`;
}

function rowHtml(row: ListRow): string {
  const isOpen = open.has(row.id);
  const line = `<tr class="row${isOpen ? " open" : ""}" data-id="${row.id}">${cellsHtml(row, isOpen)}</tr>`;
  return isOpen ? line + detailHtml(row) : line;
}

/**
 * Hidden copies of a row that fill a short page, such as the last page of a category, to the height of a full one.
 * Every row is one line, so a copy of any row is exactly as tall as the rows it stands in for, in the table and as
 * cards. They're hidden from screen readers and can't be clicked or focused.
 */
function fillerHtml(row: ListRow, count: number): string {
  return `<tr class="row filler" aria-hidden="true">${cellsHtml(row, false)}</tr>`.repeat(count);
}

/**
 * A name or types cut short by the row's one line get a tooltip with the whole text. Types left less room than one
 * icon and its "…" are hidden rather than shown as a sliver.
 */
function fitNames(): void {
  for (const tr of body.querySelectorAll<HTMLTableRowElement>("tr.row[data-id]")) {
    const row = rowById.get(tr.dataset.id ?? "");
    const cell = tr.querySelector<HTMLElement>(".name-cell");
    const types = tr.querySelector<HTMLElement>(".types");
    if (!row || !cell || !types) continue;
    const cut = [...cell.querySelectorAll<HTMLElement>(".name-text, .types")].some(
      (part) => part.scrollWidth > part.clientWidth,
    );
    if (cut) cell.title = `${row.name}: ${row.types.map(capitalize).join(", ")}`;
    else cell.removeAttribute("title");
    const room = types.clientWidth / parseFloat(getComputedStyle(types).fontSize);
    types.classList.toggle("squeezed", types.scrollWidth > types.clientWidth && room < 2.5);
  }
}

function renderHead(): void {
  for (const th of head.querySelectorAll<HTMLElement>("th[data-key]")) {
    const active = th.dataset.key === state.sort;
    if (active) th.setAttribute("aria-sort", state.direction === "asc" ? "ascending" : "descending");
    else th.removeAttribute("aria-sort");
  }
  sortSelect.value = state.sort;
  const ascending = state.direction === "asc";
  directionButton.textContent = ascending ? "Ascending" : "Descending";
  directionButton.setAttribute(
    "aria-label",
    `Sort direction: ${ascending ? "ascending" : "descending"}. Select to reverse.`,
  );
}

function pageLinkHtml(link: number | null, page: number): string {
  if (link === null) return `<li class="gap" aria-hidden="true">…</li>`;
  const current = link === page ? ` aria-current="page"` : "";
  return `<li><button type="button" data-page="${link}" aria-label="Page ${link}"${current}>${link}</button></li>`;
}

/** A stand-in for a page link, as wide as the real one, for the hidden run that holds the pager's width. */
function sizerLinkHtml(link: number | null): string {
  return link === null
    ? `<li class="gap">…</li>`
    : `<li><button type="button" tabindex="-1" disabled>${link}</button></li>`;
}

/**
 * A Previous, Next, <5 or 5> button. `data-step` lets focus return to the same button once the pager is redrawn.
 * A jump shows symbols, so its name and its title spell out what it does.
 */
function stepHtml(step: string, target: number, disabled: boolean, text: string, hint = ""): string {
  const name = hint ? ` aria-label="${hint}" title="${hint}"` : "";
  return `<button type="button" data-page="${target}" data-step="${step}"${name}${disabled ? " disabled" : ""}>${text}</button>`;
}

function renderPager(page: number, pages: number): void {
  const first = page === 1;
  const last = page === pages;
  pager.hidden = pages === 1;
  pager.innerHTML = `<div class="pager-group">
      ${stepHtml("prev5", jumpPage(page, pages, -PAGE_JUMP), first, `&lt;${PAGE_JUMP}`, `Back ${PAGE_JUMP} pages`)}
      ${stepHtml("prev", page - 1, first, "Previous")}
    </div>
    <div class="pages-box">
      <ol class="pages">${pageLinks(page, pages)
        .map((link) => pageLinkHtml(link, page))
        .join("")}</ol>
      <ol class="pages-sizer" aria-hidden="true">${widestPageLinks(pages).map(sizerLinkHtml).join("")}</ol>
    </div>
    <p class="page-status">Page ${page} of ${pages}</p>
    <div class="pager-group">
      ${stepHtml("next", page + 1, last, "Next")}
      ${stepHtml("next5", jumpPage(page, pages, PAGE_JUMP), last, `${PAGE_JUMP}&gt;`, `Forward ${PAGE_JUMP} pages`)}
    </div>`;
}

/** Shows each category as selected, left out or neither. */
function renderCategories(): void {
  for (const pill of categories.querySelectorAll<HTMLButtonElement>("button[data-category]")) {
    const status = categoryStatus(state, pill.dataset.category as CategoryId);
    pill.dataset.state = status;
    pill.setAttribute("aria-pressed", String(status === "on"));
    const note = pill.querySelector<HTMLElement>(".pill-excluded");
    if (note) note.hidden = status !== "excluded";
  }
}

function urlOf(next: ListState): string {
  const query = paramsFromState(next).toString();
  return query ? `${location.pathname}?${query}` : location.pathname;
}

function render(): void {
  const visible = sortRows(filterRows(rows, state), state);
  const pages = pageCount(visible.length);
  state = { ...state, page: Math.min(state.page, pages) };
  // Every page starts with its rows closed, so each one is as tall as the last and the pager stays put.
  if (state.page !== shownPage) open.clear();
  shownPage = state.page;
  const shown = pageRows(visible, state.page);
  const short = pages > 1 && shown[0] ? fillerHtml(shown[0], PAGE_SIZE - shown.length) : "";
  body.innerHTML = shown.map(rowHtml).join("") + short;
  fitNames();
  empty.hidden = visible.length > 0;
  count.textContent = `${number.format(visible.length)} ${visible.length === 1 ? "form" : "forms"}`;
  renderHead();
  renderCategories();
  renderPager(state.page, pages);
  history.replaceState(null, "", urlOf(state));
}

function update(next: Partial<ListState>): void {
  state = { ...state, ...next };
  render();
}

function toggle(id: string, tr: HTMLTableRowElement): void {
  const row = rowById.get(id);
  if (!row) return;
  const button = tr.querySelector<HTMLButtonElement>("button.name");
  if (open.delete(id)) {
    tr.nextElementSibling?.remove();
    button?.setAttribute("aria-expanded", "false");
  } else {
    open.add(id);
    tr.insertAdjacentHTML("afterend", detailHtml(row));
    button?.setAttribute("aria-expanded", "true");
  }
  tr.classList.toggle("open", open.has(id));
  fitNames();
}

/** The categories just before the latest single click, so a double-click can undo that click before it acts. */
let beforeClick: { id: CategoryId; include: FilterId[]; exclude: FilterId[] } | null = null;

function pillOf(event: Event): CategoryId | null {
  const pill = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-category]");
  return (pill?.dataset.category as CategoryId | undefined) ?? null;
}

// A click selects a category. Shift+click, Shift+Enter or Shift+Space leaves it out instead.
categories.addEventListener("click", (event) => {
  const id = pillOf(event);
  // The second click of a double-click. The dblclick event that follows does the work.
  if (!id || event.detail >= 2) return;
  beforeClick = { id, include: state.include, exclude: state.exclude };
  state = event.shiftKey ? excludeCategory(state, id) : selectCategory(state, id);
  render();
});

// The first click already toggled the category, so start from before it: a double-click always leaves a
// category out, or brings back one that was left out.
categories.addEventListener("dblclick", (event) => {
  const id = pillOf(event);
  if (!id) return;
  const before = beforeClick?.id === id ? beforeClick : null;
  const base = before ? { ...state, include: before.include, exclude: before.exclude } : state;
  state = excludeCategory(base, id);
  beforeClick = null;
  render();
});

search.addEventListener("input", () => update({ query: search.value, page: 1 }));

pager.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-page]");
  if (!button) return;
  const { step } = button.dataset;
  const page = Number(button.dataset.page);
  // Each page gets a history entry, so Back returns to the page before rather than leaving the site.
  history.pushState(null, "", urlOf({ ...state, page }));
  update({ page });
  // The buttons were just redrawn, so put focus back. Next is disabled on the last page, and vice versa.
  const same = step
    ? pager.querySelector<HTMLButtonElement>(`[data-step="${step}"]:not(:disabled)`)
    : pager.querySelector<HTMLButtonElement>('[aria-current="page"]');
  (same ?? pager.querySelector<HTMLButtonElement>("button:not(:disabled)"))?.focus({ preventScroll: true });
  if (table.getBoundingClientRect().top < 0) table.scrollIntoView();
});

// A new width can cut a name that fit, or give a cut one room.
let fitting = 0;
window.addEventListener("resize", () => {
  cancelAnimationFrame(fitting);
  fitting = requestAnimationFrame(fitNames);
});

window.addEventListener("popstate", () => {
  state = stateFromParams(new URLSearchParams(location.search));
  search.value = state.query;
  render();
});

head.addEventListener("click", (event) => {
  const th = (event.target as HTMLElement).closest<HTMLElement>("th[data-key]");
  if (th?.dataset.key) {
    state = nextSort(state, th.dataset.key as SortKey);
    render();
  }
});

sortSelect.addEventListener("change", () => {
  state = nextSort(state, sortSelect.value as SortKey);
  render();
});

directionButton.addEventListener("click", () => {
  state = nextSort(state, state.sort);
  render();
});

body.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const tr = target.closest<HTMLTableRowElement>("tr.row");
  // Dragging across a row to copy a number shouldn't open it.
  if (tr?.dataset.id && !window.getSelection()?.toString()) toggle(tr.dataset.id, tr);
});

element("list-clear").addEventListener("click", () => {
  search.value = "";
  update({ query: "", include: [], exclude: [], page: 1 });
  search.focus();
});

search.value = state.query;
render();
