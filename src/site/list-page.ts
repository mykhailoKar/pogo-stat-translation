// Runs the list page: reads the rows embedded in the HTML, then renders them from the current state.
import {
  COLUMNS,
  filterRows,
  nextSort,
  pageCount,
  pageLinks,
  pageRows,
  paramsFromState,
  sortRows,
  stateFromParams,
  type CategoryId,
  type ListRow,
  type ListState,
  type SortKey,
} from "../lib/list.ts";
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

const number = new Intl.NumberFormat("en");

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
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
  if (row.adjustment < 1) notes.push(`GO multiplies this form's stats by ${row.adjustment}, and its best shape keeps that cut.`);
  else if (row.idealAdjustment < 1) notes.push(`The best shape would cross GO's 4,000 CP line, so its GO stats and CP ideal include the ×${row.idealAdjustment} cut. GO Fit leaves that cut out.`);
  if (row.msGen !== null) notes.push(`GO still uses this form's Gen ${row.msGen} stats, so they differ from the current games.`);
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

function rowHtml(row: ListRow): string {
  const isOpen = open.has(row.id);
  const types = row.types.map(capitalize).join(" / ");
  const predicted = row.predicted ? `<span class="badge" title="Not in GO data yet; GO stats are predicted">Predicted</span>` : "";
  const line = `<tr class="row" data-id="${row.id}">
    <td class="col-dex">${row.dex}</td>
    <th scope="row" class="col-name"><button type="button" class="name" aria-expanded="${isOpen}"><span class="chevron" aria-hidden="true"></span><span class="name-text">${escapeHtml(row.name)}</span></button><span class="types">${types}</span>${predicted}</th>
    <td class="col-fit" data-label="GO Fit">${percent(row.goFit)}</td>
    <td data-label="Percentile">${row.percentile.toFixed(1)}</td>
    <td data-label="Attack Fit">${percent(row.attackFit)}</td>
    <td data-label="Defense Fit">${percent(row.defenseFit)}</td>
    <td data-label="Speed Fit">${percent(row.speedFit)}</td>
    <td data-label="L50 CP now">${number.format(row.cpNow)}${cutBadge(row.adjustment)}</td>
    <td data-label="L50 CP ideal">${number.format(row.cpIdeal)}${cutBadge(row.idealAdjustment)}</td>
  </tr>`;
  return isOpen ? line + detailHtml(row) : line;
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
  directionButton.setAttribute("aria-label", `Sort direction: ${ascending ? "ascending" : "descending"}. Select to reverse.`);
}

function pageLinkHtml(link: number | null, page: number): string {
  if (link === null) return `<li class="gap" aria-hidden="true">…</li>`;
  const current = link === page ? ` aria-current="page"` : "";
  return `<li><button type="button" data-page="${link}" aria-label="Page ${link}"${current}>${link}</button></li>`;
}

function renderPager(page: number, pages: number): void {
  pager.hidden = pages === 1;
  pager.innerHTML = `<button type="button" data-page="${page - 1}" data-step="prev"${page === 1 ? " disabled" : ""}>Previous</button>
    <ol class="pages">${pageLinks(page, pages).map((link) => pageLinkHtml(link, page)).join("")}</ol>
    <p class="page-status">Page ${page} of ${pages}</p>
    <button type="button" data-page="${page + 1}" data-step="next"${page === pages ? " disabled" : ""}>Next</button>`;
}

function urlOf(next: ListState): string {
  const query = paramsFromState(next).toString();
  return query ? `${location.pathname}?${query}` : location.pathname;
}

function render(): void {
  const visible = sortRows(filterRows(rows, state), state);
  const pages = pageCount(visible.length);
  state = { ...state, page: Math.min(state.page, pages) };
  body.innerHTML = pageRows(visible, state.page).map(rowHtml).join("");
  empty.hidden = visible.length > 0;
  count.textContent = `${number.format(visible.length)} ${visible.length === 1 ? "form" : "forms"}`;
  renderHead();
  renderPager(state.page, pages);
  history.replaceState(null, "", urlOf(state));
}

function update(next: Partial<ListState>): void {
  state = { ...state, ...next };
  render();
}

function toggle(id: string, tr: HTMLTableRowElement): void {
  const row = rows.find((candidate) => candidate.id === id);
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
}

categories.addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  update({ category: input.value as CategoryId, page: 1 });
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
  const same = step ? pager.querySelector<HTMLButtonElement>(`[data-step="${step}"]:not(:disabled)`) : pager.querySelector<HTMLButtonElement>('[aria-current="page"]');
  (same ?? pager.querySelector<HTMLButtonElement>("button:not(:disabled)"))?.focus({ preventScroll: true });
  if (table.getBoundingClientRect().top < 0) table.scrollIntoView();
});

window.addEventListener("popstate", () => {
  state = stateFromParams(new URLSearchParams(location.search));
  search.value = state.query;
  syncCategoryInput();
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
  update({ query: "", category: "all", page: 1 });
  syncCategoryInput();
  search.focus();
});

function syncCategoryInput(): void {
  const input = categories.querySelector<HTMLInputElement>(`input[value="${state.category}"]`);
  if (input) input.checked = true;
}

search.value = state.query;
syncCategoryInput();
render();
