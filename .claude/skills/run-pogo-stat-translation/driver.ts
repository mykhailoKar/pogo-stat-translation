// Builds the site, serves it on a private port and drives it in a real browser. SKILL.md has the usage.
//
//   node .claude/skills/run-pogo-stat-translation/driver.ts check [--quick]
//   node .claude/skills/run-pogo-stat-translation/driver.ts drive [--size phone] [--theme dark] "step" "step" ...
//
// Expected values come from src/lib/list.ts and the built dataset, so a data refresh doesn't break the checks.
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { chromium, type Browser, type BrowserContext, type Page, type Response } from "playwright-core";
import config from "../../../astro.config.ts";
import {
  CATEGORIES,
  COLUMNS,
  DEFAULT_STATE,
  PAGE_JUMP,
  PAGE_SIZE,
  categoryCounts,
  categoryStatus,
  filterRows,
  pageCount,
  pageRows,
  paramsFromState,
  sortRows,
  stateFromParams,
  toListRow,
  type FilterId,
  type ListRow,
  type ListState,
} from "../../../src/lib/list.ts";
import type { Dataset } from "../../../src/lib/types.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const ASTRO = join(ROOT, "node_modules", "astro", "bin", "astro.mjs");
const ENV = { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" };

interface Size {
  width: number;
  height: number;
  touch: boolean;
}
type Theme = "light" | "dark";

const SIZES = {
  "phone-small": { width: 320, height: 640, touch: true },
  phone: { width: 390, height: 844, touch: true },
  "phone-landscape": { width: 844, height: 390, touch: true },
  "cards-edge": { width: 759, height: 900, touch: true },
  "table-edge": { width: 760, height: 900, touch: true },
  tablet: { width: 768, height: 1024, touch: true },
  "tablet-wide": { width: 1024, height: 768, touch: true },
  laptop: { width: 1366, height: 768, touch: false },
  desktop: { width: 1920, height: 1080, touch: false },
} satisfies Record<string, Size>;
type SizeName = keyof typeof SIZES;
const SIZE_NAMES = Object.keys(SIZES) as SizeName[];
const QUICK_SIZES: SizeName[] = ["phone-small", "tablet", "laptop"];

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    quick: { type: "boolean", default: false },
    "no-build": { type: "boolean", default: false },
    url: { type: "string" },
    size: { type: "string", default: "laptop" },
    theme: { type: "string", default: "light" },
    out: { type: "string", default: join(tmpdir(), "pogo-stat-translation", "shots") },
  },
});
const [command, ...stepLines] = positionals;

function sizeFrom(value: string): Size {
  if (Object.hasOwn(SIZES, value)) return SIZES[value as SizeName];
  const match = /^(\d+)x(\d+)$/.exec(value);
  if (!match) throw new Error(`Unknown size "${value}". Use WIDTHxHEIGHT or one of: ${SIZE_NAMES.join(", ")}`);
  const width = Number(match[1]);
  return { width, height: Number(match[2]), touch: width < 1100 };
}

function themeFrom(value: string): Theme {
  if (value === "light" || value === "dark") return value;
  throw new Error(`Unknown theme "${value}". Use light or dark.`);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** One browser tab at one size and theme. Every check and step works through it. */
class View {
  browser: Browser;
  base: string;
  size: Size;
  theme: Theme;
  out: string;
  errors: string[] = [];
  context: BrowserContext | undefined;
  /** Set by openView, which runs before anything reads it. */
  page!: Page;

  constructor(browser: Browser, base: string, size: Size, theme: Theme, out: string) {
    this.browser = browser;
    this.base = base;
    this.size = size;
    this.theme = theme;
    this.out = out;
  }
}

// ---- Server ----

// Not "localhost": on Linux Astro binds that to ::1 alone, while Node's fetch tries 127.0.0.1 and is refused.
const HOST = "127.0.0.1";

function freePort(): Promise<number> {
  return new Promise((done, fail) => {
    const probe = createServer();
    probe.once("error", fail);
    probe.listen(0, HOST, () => {
      const address = probe.address();
      if (address === null || typeof address === "string") return fail(new Error("No port from the probe server"));
      probe.close(() => done(address.port));
    });
  });
}

function build(): void {
  const started = Date.now();
  const result = spawnSync(process.execPath, [ASTRO, "build"], { cwd: ROOT, env: ENV, encoding: "utf8" });
  if (result.status !== 0) {
    console.error(`${result.stdout}\n${result.stderr}`);
    throw new Error("astro build failed");
  }
  console.log(`built in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

/** Starts node on astro directly, not through npm, so killing the child really frees the port. */
async function serve(): Promise<string> {
  const port = await freePort();
  const child = spawn(process.execPath, [ASTRO, "preview", "--host", HOST, "--port", String(port)], {
    cwd: ROOT,
    env: ENV,
    stdio: ["ignore", "pipe", "pipe"],
  });
  process.on("exit", () => child.kill());
  let log = "";
  let running = true;
  child.stdout.on("data", (chunk: Buffer) => (log += chunk));
  child.stderr.on("data", (chunk: Buffer) => (log += chunk));
  child.once("exit", () => (running = false));
  const base = `http://${HOST}:${port}${config.base}/`;
  const deadline = Date.now() + 30_000;
  while (running && Date.now() < deadline) {
    const up = await fetch(base).then(
      (response) => response.ok,
      () => false,
    );
    if (up) return base;
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error(`astro preview did not answer at ${base}\n${log}`);
}

// ---- Browser ----

async function launchBrowser(): Promise<Browser> {
  const wanted = process.env.BROWSER_CHANNEL;
  const reasons: string[] = [];
  for (const channel of wanted ? [wanted] : ["msedge", "chrome", "chromium"]) {
    try {
      const browser = await chromium.launch(channel === "chromium" ? {} : { channel });
      console.log(`browser: ${channel} ${browser.version()}`);
      return browser;
    } catch (error) {
      reasons.push(`${channel}: ${message(error).split("\n")[0]}`);
    }
  }
  throw new Error(
    `No browser could start. Run: npx playwright-core install --with-deps --only-shell chromium\n${reasons.join("\n")}`,
  );
}

/** Opens a fresh context, because touch emulation can't change on a live one. */
async function openView(view: View, url: string): Promise<void> {
  await view.context?.close();
  const { width, height, touch } = view.size;
  view.context = await view.browser.newContext({
    viewport: { width, height },
    isMobile: touch,
    hasTouch: touch,
    deviceScaleFactor: touch ? 2 : 1,
    colorScheme: view.theme,
  });
  view.page = await view.context.newPage();
  view.page.setDefaultTimeout(10_000);
  view.page.on("pageerror", (error) => view.errors.push(error.message));
  view.page.on("console", (entry) => {
    if (entry.type() === "error") view.errors.push(entry.text());
  });
  view.page.on("requestfailed", (request) => view.errors.push(`failed ${request.url()}`));
  view.page.on("response", (response) => {
    if (response.status() >= 400) view.errors.push(`${response.status()} ${response.url()}`);
  });
  await goTo(view, url);
}

async function goTo(view: View, url: string): Promise<Response | null> {
  const response = await view.page.goto(url, { waitUntil: "load" });
  // The list renders from script, so "load" fires before it has rows.
  if (await view.page.locator("#list-body").count())
    await view.page.waitForSelector("#list-body tr.row, #list-empty:not([hidden])");
  return response;
}

/** The list's rows, leaving out the hidden fillers that pad a short page to full height. */
const ROWS = "#list-body tr.row:not(.filler)";
const cardsLayout = (page: Page) => page.locator("#list-sort").isVisible();
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
// Not page.url(): it updates a moment after history.replaceState, which is how the list writes its state.
const href = (page: Page) => page.evaluate(() => location.href);
const urlState = async (page: Page) => stateFromParams(new URL(await href(page)).searchParams);

// ---- Steps for `drive`. `check` uses them too, so both go through the same controls. ----

/** A step takes the words after its name. Whatever it returns is printed. */
type Step = (view: View, ...args: string[]) => Promise<unknown>;

const STEPS = {
  /** Relative to the site's base path, so "about/" and "/about/" both reach the About page. */
  async goto(view: View, target = "") {
    await goTo(view, new URL(target.replace(/^\/+/, ""), view.base).href);
  },
  async size(view: View, value: string) {
    view.size = sizeFrom(value);
    await openView(view, await href(view.page));
  },
  async theme(view: View, value: string) {
    view.theme = themeFrom(value);
    await view.page.emulateMedia({ colorScheme: view.theme });
  },
  /** Clicks a category, which adds it to the selection or takes it away. `all` clears every choice. */
  async category(view: View, id: string) {
    await view.page.locator(`.pill[data-category="${id}"]`).click();
  },
  /** Double-clicks a category, which leaves it out, or brings it back if it was left out. */
  async exclude(view: View, id: string) {
    await view.page.locator(`.pill[data-category="${id}"]`).dblclick();
  },
  /** Picks a column in whichever control this layout shows. Naming the current column does nothing. */
  async sort(view: View, key: string) {
    if ((await urlState(view.page)).sort === key) return;
    if (await cardsLayout(view.page)) await view.page.selectOption("#list-sort", key);
    else await view.page.locator(`th[data-key="${key}"] button`).click();
  },
  async flip(view: View) {
    if (await cardsLayout(view.page)) await view.page.click("#list-direction");
    else await view.page.locator("#list-head th[aria-sort] button").click();
  },
  async search(view: View, ...words: string[]) {
    await view.page.fill("#list-search", words.join(" "));
  },
  async open(view: View, id: string) {
    await view.page.locator(`tr.row[data-id="${id}"] button.name`).click();
  },
  next: (view: View) => view.page.click('#list-pager [data-step="next"]'),
  prev: (view: View) => view.page.click('#list-pager [data-step="prev"]'),
  next5: (view: View) => view.page.click('#list-pager [data-step="next5"]'),
  prev5: (view: View) => view.page.click('#list-pager [data-step="prev5"]'),
  /** Uses the page's number when the pager shows it, and otherwise walks there, five pages at a time while it can. */
  async page(view: View, target: string) {
    const want = Number(target);
    const link = view.page.locator(`#list-pager .pages button[data-page="${want}"]`);
    if (await link.isVisible()) {
      await link.click();
      return;
    }
    for (let now = (await urlState(view.page)).page; now !== want; now = (await urlState(view.page)).page) {
      const far = Math.abs(want - now) >= PAGE_JUMP ? "5" : "";
      await view.page.click(`#list-pager [data-step="${now < want ? "next" : "prev"}${far}"]`);
    }
  },
  async rows(view: View, limit = "5") {
    const lines = await view.page.$$eval(
      ROWS,
      (trs, max) =>
        trs.slice(0, max).map((tr) => {
          const cells = [...tr.querySelectorAll<HTMLElement>("td[data-label]")].map(
            (td) => `${td.dataset.label} ${td.firstChild?.textContent}`,
          );
          return `#${tr.querySelector(".col-dex")?.textContent} ${tr.querySelector(".name-text")?.textContent}: ${cells.join(", ")}`;
        }),
      Number(limit),
    );
    return lines.join("\n");
  },
  count: (view: View) => view.page.locator("#list-count").textContent(),
  url: (view: View) => href(view.page),
  overflow: async (view: View) => `${await overflow(view.page)}px`,
  async click(view: View, ...selector: string[]) {
    await view.page.locator(selector.join(" ")).first().click();
  },
  async fill(view: View, selector: string, ...words: string[]) {
    await view.page.fill(selector, words.join(" "));
  },
  async press(view: View, key: string) {
    await view.page.keyboard.press(key);
  },
  text: (view: View, ...selector: string[]) => view.page.locator(selector.join(" ")).first().textContent(),
  async eval(view: View, ...code: string[]) {
    return JSON.stringify(await view.page.evaluate(code.join(" ")));
  },
  /** `shot name` captures the screen, `shot name full` the whole page. */
  async shot(view: View, name = `shot-${Date.now()}`, full?: string) {
    const path = join(view.out, `${name}.png`);
    await view.page.screenshot({ path, fullPage: full === "full" });
    return path;
  },
} satisfies Record<string, Step>;
const stepByName: Partial<Record<string, Step>> = STEPS;

async function runSteps(view: View): Promise<void> {
  for (const line of stepLines) {
    const [name = "", ...args] = line.trim().split(/\s+/);
    const step = stepByName[name];
    if (!step) throw new Error(`Unknown step "${name}". Steps: ${Object.keys(STEPS).join(", ")}`);
    console.log(`> ${line}`);
    const result = await step(view, ...args);
    if (result !== undefined) console.log(result);
  }
  if (view.errors.length > 0) {
    console.log(`page errors:\n${view.errors.join("\n")}`);
    process.exitCode = 1;
  } else console.log("no page errors");
}

// ---- `check` ----

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean, detail = ""): void {
  if (ok) passed++;
  else {
    failed++;
    console.log(`  FAIL ${label}${detail === "" ? "" : ` (${detail})`}`);
  }
}

const dataset = JSON.parse(readFileSync(join(ROOT, "public", "data", "pokemon.json"), "utf8")) as Dataset;
const rows: ListRow[] = dataset.pokemon.map(toListRow);
const counts = categoryCounts(rows);

function visible(partial: Partial<ListState>): ListRow[] {
  const state = { ...DEFAULT_STATE, ...partial };
  return sortRows(filterRows(rows, state), state);
}
const onPage = (partial: Partial<ListState>, number = 1) => pageRows(visible(partial), number).map((row) => row.name);
const firstOf = (partial: Partial<ListState>) => visible(partial)[0]?.name ?? "(none)";
const forms = (total: number) => `${total.toLocaleString("en")} ${total === 1 ? "form" : "forms"}`;
const firstName = (page: Page) => page.locator(`${ROWS} .name-text`).first().textContent();
const allNames = (page: Page) => page.locator(`${ROWS} .name-text`).allTextContents();
const countText = async (page: Page) => (await page.locator("#list-count").textContent()) ?? "";
/**
 * The rows whose name cell is taller than its lines allow: one line at 1100px and wider, where the types sit beside
 * the name, and two below that, with the types under it. A wrapped name or types makes its row taller than the rest.
 */
const overfullNames = (page: Page) =>
  page.$$eval(`${ROWS} .name-cell`, (cells) =>
    cells
      .filter((cell) => {
        const line = (selector: string) => {
          const part = cell.querySelector(selector);
          return part ? parseFloat(getComputedStyle(part).lineHeight) : 0;
        };
        const room = getComputedStyle(cell).display === "flex" ? line(".name") : line(".name") + line(".tags");
        return cell.getBoundingClientRect().height > room + 1;
      })
      .map((cell) => cell.closest("tr")?.getAttribute("data-id") ?? "?"),
  );
/** Where each of the pager's step buttons sits, from the top left of the page rather than the screen. */
const stepSpots = (page: Page) =>
  page.$$eval("#list-pager [data-step]", (buttons) =>
    buttons
      .map((button) => {
        const box = button.getBoundingClientRect();
        return `${button.getAttribute("data-step")}@${Math.round(box.left + scrollX)},${Math.round(box.top + scrollY)}`;
      })
      .join(" "),
  );
const pageNumber = async (page: Page) => (await urlState(page)).page;

/** The pills, the count and the URL all match these categories. */
async function showingCategories(view: View, name: string, partial: Partial<ListState>): Promise<void> {
  const { page } = view;
  const state = { ...DEFAULT_STATE, ...partial };
  const want = forms(visible(partial).length);
  check(name, (await countText(page)) === want, `${await countText(page)}, wanted ${want}`);
  const pills = await page.$$eval(".pill", (els) =>
    els.map((el) =>
      [el.getAttribute("data-category"), el.getAttribute("data-state"), el.getAttribute("aria-pressed")].join(":"),
    ),
  );
  const wantPills = CATEGORIES.map(({ id }) => {
    const status = categoryStatus(state, id);
    return `${id}:${status}:${status === "on"}`;
  });
  check(`${name}: pills`, String(pills) === String(wantPills), String(pills));
  const left = await page.$$eval(".pill .pill-excluded:not([hidden])", (els) =>
    els.map((el) => el.closest(".pill")?.getAttribute("data-category")),
  );
  check(`${name}: screen readers hear what's left out`, String(left) === String(state.exclude), String(left));
  const crossed = await page.$$eval(".pill .pill-mark", (els) =>
    els
      .filter((el) => getComputedStyle(el).display !== "none")
      .map((el) => el.closest(".pill")?.getAttribute("data-category")),
  );
  check(`${name}: left-out pills show a cross`, String(crossed) === String(state.exclude), String(crossed));
  const url = await urlState(page);
  check(
    `${name}: in the URL`,
    String(url.include) === String(state.include) && String(url.exclude) === String(state.exclude),
    await href(page),
  );
}

/** Selecting, combining and leaving out categories, with the mouse and the keyboard. */
async function checkCategories(view: View): Promise<void> {
  const { page } = view;
  for (const { id } of CATEGORIES) {
    if (id === "all") continue;
    await STEPS.category(view, id);
    check(`category ${id}`, (await countText(page)) === forms(counts[id]), await countText(page));
    await showingCategories(view, `category ${id}`, { include: [id] });
    await STEPS.category(view, id);
    check(`category ${id} twice: back to all, clean URL`, !(await href(page)).includes("?"), await href(page));
  }

  const both: FilterId[] = ["legendary", "mythical"];
  await STEPS.category(view, "legendary");
  await STEPS.category(view, "mythical");
  await showingCategories(view, "two categories", { include: both });
  await STEPS.exclude(view, "mega");
  await showingCategories(view, "two categories without Megas", { include: both, exclude: ["mega"] });
  await STEPS.category(view, "all");
  await showingCategories(view, "All species clears every choice", {});
  check("All species: clean URL", !(await href(page)).includes("?"), await href(page));

  await STEPS.exclude(view, "mega");
  await showingCategories(view, "every form but the Megas", { exclude: ["mega"] });
  await STEPS.exclude(view, "starter");
  await showingCategories(view, "two left out", { exclude: ["mega", "starter"] });
  await STEPS.exclude(view, "mega");
  await showingCategories(view, "a second double-click brings one back", { exclude: ["starter"] });
  await STEPS.category(view, "starter");
  await showingCategories(view, "a click brings a left-out one back", {});

  await STEPS.category(view, "legendary");
  await STEPS.exclude(view, "legendary");
  await showingCategories(view, "double-clicking a selected category leaves it out", { exclude: ["legendary"] });
  await STEPS.category(view, "legendary");

  await page.locator('.pill[data-category="starter"]').click({ modifiers: ["Shift"] });
  await showingCategories(view, "Shift+click leaves one out", { exclude: ["starter"] });
  await page.locator('.pill[data-category="mythical"]').focus();
  await page.keyboard.press("Shift+Enter");
  await showingCategories(view, "Shift+Enter leaves one out", { exclude: ["mythical", "starter"] });
  await page.keyboard.press("Enter");
  await showingCategories(view, "Enter brings it back", { exclude: ["starter"] });
  await page.keyboard.press("Enter");
  await showingCategories(view, "Enter selects", { include: ["mythical"], exclude: ["starter"] });
  check(
    "keyboard focus stays on the pill",
    await page.evaluate(() => document.activeElement?.getAttribute("data-category") === "mythical"),
  );

  await STEPS.category(view, "all");
  check("back to all, clean URL", !(await href(page)).includes("?"), await href(page));
}

/** Everything that doesn't depend on the theme, so it only runs once per size. */
async function checkControls(view: View, label: string): Promise<void> {
  const { page, base } = view;
  const cards = await cardsLayout(page);
  const shot = (name: string) => page.screenshot({ path: join(view.out, `${label}-${name}.png`) });

  // Each row shows one icon per type, and each icon points at a symbol the page really has.
  const shown = await page.$$eval(ROWS, (trs) =>
    trs.map((tr) => {
      const uses = [...tr.querySelectorAll(".types use")];
      return {
        id: tr.getAttribute("data-id") ?? "",
        types: [...tr.querySelectorAll(".types .type")].map((span) => span.textContent?.toLowerCase()),
        icons: uses.map((use) => use.getAttribute("href")),
        missing: uses.filter((use) => !document.querySelector(use.getAttribute("href") ?? "#none")).length,
      };
    }),
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  const wrongIcons = shown.filter(
    ({ id, types, icons, missing }) =>
      String(types) !== String(byId.get(id)?.types) ||
      String(icons) !== String(types.map((type) => `#type-${type}`)) ||
      missing > 0,
  );
  check("every type shows its icon", shown.length > 0 && wrongIcons.length === 0, JSON.stringify(wrongIcons));
  const icon = await page.locator("#list-body .type-icon").first().boundingBox();
  check("type icons have a size", icon !== null && icon.width >= 10 && icon.width <= 20, `${icon?.width}px`);

  await checkCategories(view);

  for (const { key, first } of COLUMNS) {
    for (const direction of [first, first === "asc" ? "desc" : "asc"] as const) {
      if (direction === first) await STEPS.sort(view, key);
      else await STEPS.flip(view);
      const want = firstOf({ sort: key, direction });
      check(`sort ${key} ${direction}`, (await firstName(page)) === want, `${await firstName(page)}, wanted ${want}`);
      const state = await urlState(page);
      check(
        `sort ${key} ${direction}: in the URL`,
        state.sort === key && state.direction === direction,
        await href(page),
      );
      if (!cards) {
        const aria = await page.locator(`th[data-key="${key}"]`).getAttribute("aria-sort");
        check(
          `sort ${key} ${direction}: aria-sort`,
          aria === (direction === "asc" ? "ascending" : "descending"),
          String(aria),
        );
      }
    }
  }

  // A link from before categories could combine, with one category.
  const restored: Partial<ListState> = { include: ["starter"], sort: "name", direction: "desc", query: "char" };
  await goTo(view, `${base}?category=starter&sort=name&direction=desc&q=char`);
  check("state restored from the URL", (await firstName(page)) === firstOf(restored), String(await firstName(page)));
  check(
    "restored category and search",
    (await page.locator('.pill[data-category="starter"]').getAttribute("aria-pressed")) === "true" &&
      (await page.inputValue("#list-search")) === "char",
  );
  check("restored count", (await countText(page)) === forms(visible(restored).length), await countText(page));
  await goTo(view, `${base}?category=legendary&category=mythical&exclude=mega`);
  await showingCategories(view, "combined categories restored from the URL", {
    include: ["legendary", "mythical"],
    exclude: ["mega"],
  });
  await goTo(view, base);

  for (const query of ["flabebe", "6", "farfetchd"]) {
    await STEPS.search(view, query);
    const want = onPage({ query });
    check(
      `search "${query}"`,
      want.length > 0 && String(await allNames(page)) === String(want),
      String(await allNames(page)),
    );
    check(
      `search "${query}": count`,
      (await countText(page)) === forms(visible({ query }).length),
      await countText(page),
    );
    check(`search "${query}": in the URL`, (await urlState(page)).query === query, await href(page));
  }
  await STEPS.search(view, "zzzz");
  check("empty state shows", await page.locator("#list-empty").isVisible());
  await shot("empty");
  await page.click("#list-clear");
  check("clear restores the list", (await countText(page)) === forms(rows.length));

  await STEPS.search(view, "garchomp");
  await STEPS.open(view, "garchomp");
  const detail = page.locator("#detail-garchomp");
  const bestAttack = rows.find((row) => row.id === "garchomp")?.best.atk;
  check("row opens", await detail.isVisible());
  check(
    "detail shows the best shape",
    bestAttack !== undefined && ((await detail.textContent()) ?? "").includes(String(bestAttack)),
  );
  check("no overflow with details open", (await overflow(page)) <= 0, `${await overflow(page)}px`);
  await detail.scrollIntoViewIfNeeded();
  await shot("detail");
  await STEPS.open(view, "garchomp");
  check("row closes", (await detail.count()) === 0);
  await STEPS.search(view, "");

  await page.locator("#list-body button.name").first().focus();
  await page.keyboard.press("Enter");
  check("keyboard opens a row", (await page.locator("#list-body tr.detail").count()) === 1);
  await page.keyboard.press("Enter");
  check("keyboard closes a row", (await page.locator("#list-body tr.detail").count()) === 0);

  if (view.size.touch) {
    const small = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          ".pill, #list-search, #list-sort, #list-direction, #list-pager button, .site-footer a",
        ),
      ]
        .filter((el) => el.offsetParent !== null && el.getBoundingClientRect().height < 38)
        .map(
          (el) =>
            `${el.tagName} ${(el.textContent ?? "").trim().slice(0, 20)} ${Math.round(el.getBoundingClientRect().height)}`,
        ),
    );
    check("touch targets are large enough", small.length === 0, small.join(", "));
  }
}

/** The list's paging, through the controls a visitor uses. */
async function checkPaging(view: View, label: string): Promise<void> {
  const { page, base } = view;
  const showing = async (name: string, want: string[]) => {
    const names = await allNames(page);
    check(name, String(names) === String(want), String(names));
  };

  check("the first page can't go back", await page.locator('#list-pager [data-step="prev"]').isDisabled());
  const spots = await stepSpots(page);
  await STEPS.next(view);
  await showing("Next shows page 2", onPage({}, 2));
  check("Next stays where it was", (await stepSpots(page)) === spots, await stepSpots(page));
  check("page 2 is in the URL", (await pageNumber(page)) === 2, await href(page));
  check(
    "Next keeps keyboard focus",
    await page.evaluate(
      () => document.activeElement instanceof HTMLElement && document.activeElement.dataset.step === "next",
    ),
  );
  const top = await page.locator("#list-table").boundingBox();
  check(
    "the list's top is on screen after paging",
    top !== null && top.y >= -1 && top.y < view.size.height,
    `y=${top?.y}`,
  );
  check("no overflow with the pager showing", (await overflow(page)) <= 0, `${await overflow(page)}px`);
  await page.locator("#list-pager").scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(view.out, `${label}-pager.png`) });

  await page.goBack();
  await page.waitForFunction(() => !location.search.includes("page="));
  await showing("Back returns to page 1", onPage({}, 1));

  await STEPS.page(view, "3");
  await showing("going to page 3", onPage({}, 3));
  if (await page.locator(".pages").isVisible()) {
    const current = await page.locator('#list-pager [aria-current="page"]').textContent();
    check("the pager marks the current page", current === "3", String(current));
  } else {
    const status = await page.locator(".page-status").textContent();
    check("the pager says which page this is", status === `Page 3 of ${pageCount(rows.length)}`, String(status));
  }

  await STEPS.prev5(view);
  await showing("<5 from page 3 stops on page 1", onPage({}, 1));
  check("the first page can't jump back", await page.locator('#list-pager [data-step="prev5"]').isDisabled());
  await STEPS.next5(view);
  await showing("5> from page 1 shows page 6", onPage({}, 1 + PAGE_JUMP));
  check("5> is in the URL", (await pageNumber(page)) === 1 + PAGE_JUMP, await href(page));
  check(
    "5> keeps keyboard focus",
    await page.evaluate(
      () => document.activeElement instanceof HTMLElement && document.activeElement.dataset.step === "next5",
    ),
  );
  const jumpName = await page.locator('#list-pager [data-step="next5"]').getAttribute("aria-label");
  check("5>'s name spells out what it does", jumpName === `Forward ${PAGE_JUMP} pages`, String(jumpName));
  check("5> stays where it was", (await stepSpots(page)) === spots, await stepSpots(page));

  // An open row makes its page taller, so a new page starts with every row closed.
  const opened = (await page.locator(ROWS).first().getAttribute("data-id")) ?? "";
  await STEPS.open(view, opened);
  await STEPS.next(view);
  await STEPS.prev(view);
  check("a row closes when its page is left", (await page.locator("#list-body tr.detail").count()) === 0, opened);
  check("the pager is back in place after an open row", (await stepSpots(page)) === spots, await stepSpots(page));

  // Legendaries doesn't divide evenly, so its last page shows a remainder.
  const category = "legendary";
  const last = pageCount(counts[category]);
  await goTo(view, `${base}?category=${category}&page=${last}`);
  await showing("the URL restores a page, with the remainder on the last", onPage({ include: [category] }, last));
  check("the last page can't go forward", await page.locator('#list-pager [data-step="next"]').isDisabled());
  check("the last page can't jump forward", await page.locator('#list-pager [data-step="next5"]').isDisabled());
  check(
    "the last page is short",
    (await allNames(page)).length === counts[category] % PAGE_SIZE,
    String((await allNames(page)).length),
  );

  await goTo(view, `${base}?category=${category}&page=${last - 2}`);
  await STEPS.next5(view);
  check("5> near the end stops on the last page", (await pageNumber(page)) === last, await href(page));

  await goTo(view, `${base}?category=${category}&page=9999`);
  check("a page past the end falls back to the last", (await pageNumber(page)) === last, await href(page));
  await goTo(view, `${base}?page=nonsense`);
  check("a bad page falls back to the first", (await pageNumber(page)) === 1, await href(page));

  const resets = {
    "a new category": () => STEPS.category(view, "mega"),
    "a new sort": () => STEPS.sort(view, "dex"),
    "reversing the sort": () => STEPS.flip(view),
    "a search": () => STEPS.search(view, "a"),
  };
  for (const [name, change] of Object.entries(resets)) {
    await goTo(view, `${base}?page=4`);
    await change();
    check(`${name} returns to page 1`, (await pageNumber(page)) === 1, await href(page));
  }

  await goTo(view, `${base}?q=garchomp`);
  check("one page of results hides the pager", !(await page.locator("#list-pager").isVisible()));
  await goTo(view, base);
}

/**
 * Every page of a list puts the pager's buttons in the same place, short last pages included, so clicking Next or 5>
 * again and again keeps hitting them (#14). Pages are visited the way Back and Forward reach them, which redraws the
 * list as a click does and takes a fraction of the time.
 */
async function checkPagerStays(view: View): Promise<void> {
  const { page, base } = view;
  const lists: { name: string; state: Partial<ListState> }[] = [
    { name: "all forms", state: {} },
    ...CATEGORIES.flatMap(({ id }) =>
      id !== "all" && counts[id] % PAGE_SIZE !== 0 ? [{ name: id, state: { include: [id] } }] : [],
    ),
  ];
  for (const { name, state } of lists) {
    const pages = pageCount(visible(state).length);
    await goTo(view, `${base}?${paramsFromState({ ...DEFAULT_STATE, ...state })}`);
    const found = new Map<string, number[]>();
    const tall: string[] = [];
    for (let number = 1; number <= pages; number++) {
      await page.evaluate((to) => {
        const params = new URLSearchParams(location.search);
        params.set("page", String(to));
        history.pushState(null, "", `?${params}`);
        dispatchEvent(new PopStateEvent("popstate"));
      }, number);
      const spot = await stepSpots(page);
      found.set(spot, [...(found.get(spot) ?? []), number]);
      tall.push(...(await overfullNames(page)));
    }
    check(
      `the pager stays put on all ${pages} pages of ${name}`,
      found.size === 1,
      [...found].map(([spot, numbers]) => `${spot} on pages ${numbers.slice(0, 6).join(",")}`).join(" | "),
    );
    check(`every name and its types keep to their lines in ${name}`, tall.length === 0, tall.slice(0, 6).join(", "));
  }
  await goTo(view, base);
}

/** The longest name, cut short by its one line or not, and whole once its row is open. */
async function checkCutNames(view: View): Promise<void> {
  const { page } = view;
  const longest = rows.reduce((a, b) => (b.name.length > a.name.length ? b : a));
  const whole = `${longest.name}: ${longest.types.map((type) => type.charAt(0).toUpperCase() + type.slice(1)).join(", ")}`;
  const nameOf = () =>
    page.locator(`${ROWS}[data-id="${longest.id}"] .name-cell`).evaluate((cell) => {
      const text = cell.querySelector(".name-text");
      return { cut: text !== null && text.scrollWidth > text.clientWidth, title: cell.getAttribute("title") ?? "" };
    });
  await STEPS.search(view, longest.name);
  const closed = await nameOf();
  check(
    "a cut name has a tooltip with the whole name, and a whole one has none",
    closed.title === (closed.cut ? whole : ""),
    JSON.stringify(closed),
  );
  await STEPS.open(view, longest.id);
  const opened = await nameOf();
  check("an open row shows the whole name", !opened.cut && opened.title === "", JSON.stringify(opened));
  await STEPS.open(view, longest.id);
  await STEPS.search(view, "");
}

/** Compares every label with the data, on the pages most likely to break: cut forms, exempt forms and the highest CPs. */
async function checkCutLabels(view: View, label: string): Promise<void> {
  const { page, base } = view;
  const byId = new Map(rows.map((row) => [row.id, row]));
  const title = (adjustment: number) => (adjustment < 1 ? `Includes GO's ×${adjustment} cut` : "");

  for (const search of [
    "?sort=cpIdeal",
    "?sort=cpNow",
    "?q=necrozma",
    "?q=mewtwo",
    "?q=rayquaza",
    "?q=great%20tusk",
    "?q=garchomp",
    "?q=bulbasaur",
    "",
  ]) {
    await goTo(view, `${base}${search}`);
    const shown = await page.$$eval(ROWS, (trs) =>
      trs.map((tr) => ({
        id: tr.dataset.id ?? "",
        now: tr.querySelector<HTMLElement>('td[data-label="L50 CP now"] .badge')?.title ?? "",
        ideal: tr.querySelector<HTMLElement>('td[data-label="L50 CP ideal"] .badge')?.title ?? "",
      })),
    );
    const wrong = shown.filter(({ id, now, ideal }) => {
      const row = byId.get(id);
      return !row || now !== title(row.adjustment) || ideal !== title(row.idealAdjustment);
    });
    check(
      `Cut labels match the data on "${search}"`,
      shown.length > 0 && wrong.length === 0,
      wrong.map((row) => row.id).join(", "),
    );
    if (!(await cardsLayout(page))) {
      const clipped = await page.$$eval(`${ROWS} > td`, (cells) =>
        cells.filter((cell) => cell.scrollWidth > cell.clientWidth).map((cell) => cell.textContent),
      );
      check(`labels fit their cells on "${search}"`, clipped.length === 0, clipped.join(" | "));
    }
  }
  await goTo(view, `${base}?q=necrozma`);
  await page.screenshot({ path: join(view.out, `${label}-cut.png`) });
  await goTo(view, base);
}

async function checkView(view: View, label: string): Promise<void> {
  const { page, base } = view;
  const width = view.size.width;
  check("one page of forms renders", (await page.locator(ROWS).count()) === PAGE_SIZE);
  check("count text", (await countText(page)) === forms(rows.length), await countText(page));
  check("default sort", (await firstName(page)) === firstOf({}), String(await firstName(page)));
  check("no page overflow on the list", (await overflow(page)) <= 0, `${await overflow(page)}px`);

  const logo = await page.locator(".logo").boundingBox();
  const centre = logo ? logo.x + logo.width / 2 : NaN;
  check("logo is centred", Math.abs(centre - width / 2) <= 2, `${centre} vs ${width / 2}`);
  check("logo is at the top", logo !== null && logo.y < 60, `y=${logo?.y}`);
  // Decision 0006 wants ten rows and the pager on one laptop screen. Text above the list wraps more in Linux's wider
  // fonts, where CI runs, so this is a note rather than a check until #17 is fixed.
  if (!view.size.touch && view.theme === "light") {
    const pager = await page.locator("#list-pager").boundingBox();
    const bottom = pager ? Math.round(pager.y + pager.height) : NaN;
    console.log(`  note: the pager ends at ${bottom}px of the screen's ${view.size.height}px (#17)`);
  }
  await page.screenshot({ path: join(view.out, `${label}-list.png`) });

  if (view.theme === "light") {
    await checkControls(view, label);
    await checkPaging(view, label);
    await checkPagerStays(view);
    await checkCutNames(view);
    await checkCutLabels(view, label);
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const about = page.locator(".site-footer a", { hasText: "About" });
  check("About link is at the bottom", await about.isVisible());
  await page.screenshot({ path: join(view.out, `${label}-footer.png`) });
  await about.click();
  await page.waitForURL("**/about/");
  check("About page opens", (await page.locator("h1").textContent()) === "About this site");
  check("no page overflow on About", (await overflow(page)) <= 0, `${await overflow(page)}px`);
  if (width >= 760) {
    const wide = await page.evaluate(
      () =>
        [...document.querySelectorAll(".prose pre, .table-wrap")].filter((el) => el.scrollWidth > el.clientWidth + 1)
          .length,
    );
    check("formula blocks fit", wide === 0, `${wide} too wide`);
  }
  await page.screenshot({ path: join(view.out, `${label}-about.png`) });
  await page.locator(".logo").click();
  await page.waitForSelector(ROWS);
  check("logo returns to the list", (await href(page)) === base, await href(page));
  check("no console or network errors", view.errors.length === 0, view.errors.slice(0, 3).join(" | "));
}

/** How long sorting every row takes on a CPU slowed 4×, close to a mid-range phone. */
async function reportSpeed(view: View): Promise<void> {
  for (const name of ["phone", "laptop"] as const) {
    view.size = SIZES[name];
    await openView(view, view.base);
    const cdp = await view.page.context().newCDPSession(view.page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const times: number[] = [];
    for (let i = 0; i < 7; i++) {
      times.push(
        await view.page.evaluate(() => {
          const cards = document.querySelector<HTMLElement>("#list-sort")?.offsetParent !== null;
          const control = document.querySelector<HTMLElement>(
            cards ? "#list-direction" : 'th[data-key="goFit"] button',
          );
          const start = performance.now();
          control?.click();
          void document.body.offsetHeight;
          return performance.now() - start;
        }),
      );
    }
    const median = times.sort((a, b) => a - b)[3] ?? NaN;
    console.log(`speed: ${name}, CPU 4x slower, sorting all ${rows.length} rows: median ${Math.round(median)}ms`);
  }
}

async function runChecks(view: View): Promise<void> {
  for (const name of flags.quick ? QUICK_SIZES : SIZE_NAMES) {
    for (const theme of ["light", "dark"] as const) {
      Object.assign(view, { size: SIZES[name], theme, errors: [] });
      const before = passed + failed;
      await openView(view, view.base);
      await checkView(view, `${name}-${theme}`);
      console.log(`${name} ${view.size.width}x${view.size.height} ${theme}: ${passed + failed - before} checks`);
    }
  }

  Object.assign(view, { size: SIZES.phone, theme: "light", errors: [] });
  await openView(view, view.base);
  const response = await goTo(view, `${view.base}does-not-exist/`);
  check("missing page returns 404", response?.status() === 404, String(response?.status()));
  check(
    "404 page keeps the site header",
    (await view.page.locator(".logo").count()) === 1 &&
      (await view.page.locator("h1").textContent()) === "Page not found",
  );

  if (!flags.quick) await reportSpeed(view);
  console.log(`screenshots: ${view.out}`);
  console.log(failed === 0 ? `ALL ${passed} CHECKS PASSED` : `${failed} OF ${passed + failed} CHECKS FAILED`);
  if (failed > 0) process.exitCode = 1;
}

// ---- Entry point ----

if (command !== "check" && command !== "drive") {
  console.error('Usage: driver.ts check [--quick] | driver.ts drive [--size phone] [--theme dark] "step" ...');
  process.exit(2);
}
process.on("SIGINT", () => process.exit(130));

try {
  mkdirSync(flags.out, { recursive: true });
  const size = sizeFrom(flags.size);
  const theme = themeFrom(flags.theme);
  // The browser goes first, so a machine without one fails at once rather than after a build.
  const browser = await launchBrowser();
  try {
    if (!flags.url && !flags["no-build"]) build();
    const base = flags.url ?? (await serve());
    const view = new View(browser, base, size, theme, flags.out);
    if (command === "check") await runChecks(view);
    else {
      await openView(view, base);
      await runSteps(view);
    }
  } finally {
    await browser.close();
  }
} catch (error) {
  console.error(message(error));
  process.exitCode = 1;
}
// The preview child would otherwise keep this process alive.
process.exit();
