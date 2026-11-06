// Builds the site, serves it on a private port and drives it in a real browser. SKILL.md has the usage.
//
//   node .claude/skills/run-pogo-stat-translation/driver.mjs check [--quick]
//   node .claude/skills/run-pogo-stat-translation/driver.mjs drive [--size phone] [--theme dark] "step" "step" ...
//
// Expected values come from src/lib/list.ts and the built dataset, so a data refresh doesn't break the checks.
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";
import config from "../../../astro.config.mjs";
import { COLUMNS, DEFAULT_STATE, categoryCounts, filterRows, sortRows, stateFromParams, toListRow } from "../../../src/lib/list.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const ASTRO = join(ROOT, "node_modules", "astro", "bin", "astro.mjs");
const ENV = { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" };

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
};
const QUICK_SIZES = ["phone-small", "tablet", "laptop"];

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
const [command, ...steps] = positionals;

function sizeFrom(value) {
  if (SIZES[value]) return SIZES[value];
  const match = /^(\d+)x(\d+)$/.exec(value);
  if (!match) throw new Error(`Unknown size "${value}". Use WIDTHxHEIGHT or one of: ${Object.keys(SIZES).join(", ")}`);
  const width = Number(match[1]);
  return { width, height: Number(match[2]), touch: width < 1100 };
}

// ---- Server ----

// Not "localhost": on Linux Astro binds that to ::1 alone, while Node's fetch tries 127.0.0.1 and is refused.
const HOST = "127.0.0.1";

function freePort() {
  return new Promise((done, fail) => {
    const probe = createServer();
    probe.once("error", fail);
    probe.listen(0, HOST, () => {
      const { port } = probe.address();
      probe.close(() => done(port));
    });
  });
}

function build() {
  const started = Date.now();
  const result = spawnSync(process.execPath, [ASTRO, "build"], { cwd: ROOT, env: ENV, encoding: "utf8" });
  if (result.status !== 0) {
    console.error(`${result.stdout}\n${result.stderr}`);
    throw new Error("astro build failed");
  }
  console.log(`built in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

/** Starts node on astro directly, not through npm, so killing the child really frees the port. */
async function serve() {
  const port = await freePort();
  const child = spawn(process.execPath, [ASTRO, "preview", "--host", HOST, "--port", String(port)], { cwd: ROOT, env: ENV, stdio: ["ignore", "pipe", "pipe"] });
  process.on("exit", () => child.kill());
  let log = "";
  let running = true;
  child.stdout.on("data", (chunk) => (log += chunk));
  child.stderr.on("data", (chunk) => (log += chunk));
  child.once("exit", () => (running = false));
  const base = `http://${HOST}:${port}${config.base}/`;
  const deadline = Date.now() + 30_000;
  while (running && Date.now() < deadline) {
    const up = await fetch(base).then((response) => response.ok, () => false);
    if (up) return base;
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error(`astro preview did not answer at ${base}\n${log}`);
}

// ---- Browser ----

async function launchBrowser() {
  const wanted = process.env.BROWSER_CHANNEL;
  const reasons = [];
  for (const channel of wanted ? [wanted] : ["msedge", "chrome", "chromium"]) {
    try {
      const browser = await chromium.launch(channel === "chromium" ? {} : { channel });
      console.log(`browser: ${channel} ${browser.version()}`);
      return browser;
    } catch (error) {
      reasons.push(`${channel}: ${error.message.split("\n")[0]}`);
    }
  }
  throw new Error(`No browser could start. Run: npx playwright-core install --with-deps --only-shell chromium\n${reasons.join("\n")}`);
}

/** Opens a fresh context, because touch emulation can't change on a live one. */
async function openView(view, url) {
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
  view.page.on("console", (message) => {
    if (message.type() === "error") view.errors.push(message.text());
  });
  view.page.on("requestfailed", (request) => view.errors.push(`failed ${request.url()}`));
  view.page.on("response", (response) => {
    if (response.status() >= 400) view.errors.push(`${response.status()} ${response.url()}`);
  });
  await goTo(view, url);
}

async function goTo(view, url) {
  const response = await view.page.goto(url, { waitUntil: "load" });
  // The list renders from script, so "load" fires before it has rows.
  if (await view.page.locator("#list-body").count()) await view.page.waitForSelector("#list-body tr.row, #list-empty:not([hidden])");
  return response;
}

const cardsLayout = (page) => page.locator("#list-sort").isVisible();
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
// Not page.url(): it updates a moment after history.replaceState, which is how the list writes its state.
const href = (page) => page.evaluate(() => location.href);
const urlState = async (page) => stateFromParams(new URL(await href(page)).searchParams);

// ---- Steps for `drive`. `check` uses them too, so both go through the same controls. ----

const STEPS = {
  /** Relative to the site's base path, so "about/" and "/about/" both reach the About page. */
  async goto(view, target = "") {
    await goTo(view, new URL(target.replace(/^\/+/, ""), view.base).href);
  },
  async size(view, value) {
    view.size = sizeFrom(value);
    await openView(view, await href(view.page));
  },
  async theme(view, value) {
    view.theme = value;
    await view.page.emulateMedia({ colorScheme: value });
  },
  async category(view, id) {
    await view.page.locator(`.pill:has(input[value="${id}"])`).click();
  },
  /** Picks a column in whichever control this layout shows. Naming the current column does nothing. */
  async sort(view, key) {
    if ((await urlState(view.page)).sort === key) return;
    if (await cardsLayout(view.page)) await view.page.selectOption("#list-sort", key);
    else await view.page.locator(`th[data-key="${key}"] button`).click();
  },
  async flip(view) {
    if (await cardsLayout(view.page)) await view.page.click("#list-direction");
    else await view.page.locator("#list-head th[aria-sort] button").click();
  },
  async search(view, ...words) {
    await view.page.fill("#list-search", words.join(" "));
  },
  async open(view, id) {
    await view.page.locator(`tr.row[data-id="${id}"] button.name`).click();
  },
  async rows(view, limit = "5") {
    const lines = await view.page.$$eval(
      "#list-body tr.row",
      (trs, max) =>
        trs.slice(0, max).map((tr) => {
          const cells = [...tr.querySelectorAll("td[data-label]")].map((td) => `${td.dataset.label} ${td.firstChild.textContent}`);
          return `#${tr.querySelector(".col-dex").textContent} ${tr.querySelector(".name-text").textContent}: ${cells.join(", ")}`;
        }),
      Number(limit),
    );
    return lines.join("\n");
  },
  count: (view) => view.page.locator("#list-count").textContent(),
  url: (view) => href(view.page),
  overflow: async (view) => `${await overflow(view.page)}px`,
  async click(view, ...selector) {
    await view.page.locator(selector.join(" ")).first().click();
  },
  async fill(view, selector, ...words) {
    await view.page.fill(selector, words.join(" "));
  },
  async press(view, key) {
    await view.page.keyboard.press(key);
  },
  text: (view, ...selector) => view.page.locator(selector.join(" ")).first().textContent(),
  async eval(view, ...code) {
    return JSON.stringify(await view.page.evaluate(code.join(" ")));
  },
  /** `shot name` captures the screen, `shot name full` the whole page. */
  async shot(view, name = `shot-${Date.now()}`, full) {
    const path = join(view.out, `${name}.png`);
    await view.page.screenshot({ path, fullPage: full === "full" });
    return path;
  },
};

async function runSteps(view) {
  for (const line of steps) {
    const [name, ...args] = line.trim().split(/\s+/);
    if (!STEPS[name]) throw new Error(`Unknown step "${name}". Steps: ${Object.keys(STEPS).join(", ")}`);
    console.log(`> ${line}`);
    const result = await STEPS[name](view, ...args);
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
function check(label, ok, detail = "") {
  if (ok) passed++;
  else {
    failed++;
    console.log(`  FAIL ${label}${detail === "" ? "" : ` (${detail})`}`);
  }
}

const rows = JSON.parse(readFileSync(join(ROOT, "public", "data", "pokemon.json"), "utf8")).pokemon.map(toListRow);
const counts = categoryCounts(rows);

function visible(partial) {
  const state = { ...DEFAULT_STATE, ...partial };
  return sortRows(filterRows(rows, state), state);
}
const forms = (total) => `${total.toLocaleString("en")} ${total === 1 ? "form" : "forms"}`;
// textContent, not innerText: content-visibility can leave off-screen cards blank to innerText.
const firstName = (page) => page.locator("#list-body tr.row .name-text").first().textContent();
const allNames = (page) => page.locator("#list-body tr.row .name-text").allTextContents();
const countText = (page) => page.locator("#list-count").textContent();

/** Everything that doesn't depend on the theme, so it only runs once per size. */
async function checkControls(view, label) {
  const { page, base } = view;
  const cards = await cardsLayout(page);
  const shot = (name) => page.screenshot({ path: join(view.out, `${label}-${name}.png`) });

  for (const [id, total] of Object.entries(counts)) {
    if (id === "all") continue;
    await STEPS.category(view, id);
    check(`category ${id}`, (await countText(page)) === forms(total), await countText(page));
    check(`category ${id}: one selected`, (await page.locator('input[name="category"]:checked').count()) === 1);
    check(`category ${id}: in the URL`, (await urlState(page)).category === id, await href(page));
  }
  await STEPS.category(view, "all");
  check("back to all, clean URL", !(await href(page)).includes("?"), await href(page));

  for (const { key, first } of COLUMNS) {
    for (const direction of [first, first === "asc" ? "desc" : "asc"]) {
      if (direction === first) await STEPS.sort(view, key);
      else await STEPS.flip(view);
      const want = visible({ sort: key, direction })[0].name;
      check(`sort ${key} ${direction}`, (await firstName(page)) === want, `${await firstName(page)}, wanted ${want}`);
      const state = await urlState(page);
      check(`sort ${key} ${direction}: in the URL`, state.sort === key && state.direction === direction, await href(page));
      if (!cards) {
        const aria = await page.locator(`th[data-key="${key}"]`).getAttribute("aria-sort");
        check(`sort ${key} ${direction}: aria-sort`, aria === (direction === "asc" ? "ascending" : "descending"), String(aria));
      }
    }
  }

  const restored = { category: "starter", sort: "name", direction: "desc", query: "char" };
  await goTo(view, `${base}?category=starter&sort=name&direction=desc&q=char`);
  check("state restored from the URL", (await firstName(page)) === visible(restored)[0].name, await firstName(page));
  check("restored category and search", (await page.locator('input[value="starter"]').isChecked()) && (await page.inputValue("#list-search")) === "char");
  check("restored count", (await countText(page)) === forms(visible(restored).length), await countText(page));
  await goTo(view, base);

  for (const query of ["flabebe", "6", "farfetchd"]) {
    await STEPS.search(view, query);
    const want = visible({ query }).map((row) => row.name);
    check(`search "${query}"`, want.length > 0 && String(await allNames(page)) === String(want), String(await allNames(page)));
    check(`search "${query}": count`, (await countText(page)) === forms(want.length), await countText(page));
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
  check("row opens", await detail.isVisible());
  check("detail shows the best shape", (await detail.textContent()).includes(String(rows.find((row) => row.id === "garchomp").best.atk)));
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
      [...document.querySelectorAll(".pill span, #list-search, #list-sort, #list-direction, .site-footer a")]
        .filter((el) => el.offsetParent !== null && el.getBoundingClientRect().height < 38)
        .map((el) => `${el.tagName} ${el.textContent.trim().slice(0, 20)} ${Math.round(el.getBoundingClientRect().height)}`),
    );
    check("touch targets are large enough", small.length === 0, small.join(", "));
  }

  if (!cards) {
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForTimeout(100);
    const top = await page.locator("#list-head th").first().boundingBox();
    check("header stays visible while scrolling", top.y >= -1 && top.y < 5, `y=${top.y}`);
    await shot("scrolled");
  }
}

async function checkView(view, label) {
  const { page, base } = view;
  const width = view.size.width;
  check("all forms render", (await page.locator("#list-body tr.row").count()) === rows.length);
  check("count text", (await countText(page)) === forms(rows.length), await countText(page));
  check("default sort", (await firstName(page)) === visible({})[0].name, await firstName(page));
  check("no page overflow on the list", (await overflow(page)) <= 0, `${await overflow(page)}px`);

  const logo = await page.locator(".logo").boundingBox();
  check("logo is centred", Math.abs(logo.x + logo.width / 2 - width / 2) <= 2, `${logo.x + logo.width / 2} vs ${width / 2}`);
  check("logo is at the top", logo.y < 60, `y=${logo.y}`);
  await page.screenshot({ path: join(view.out, `${label}-list.png`) });

  if (view.theme === "light") await checkControls(view, label);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const about = page.locator(".site-footer a", { hasText: "About" });
  check("About link is at the bottom", await about.isVisible());
  await page.screenshot({ path: join(view.out, `${label}-footer.png`) });
  await about.click();
  await page.waitForURL("**/about/");
  check("About page opens", (await page.locator("h1").textContent()) === "About this site");
  check("no page overflow on About", (await overflow(page)) <= 0, `${await overflow(page)}px`);
  if (width >= 760) {
    const wide = await page.evaluate(() => [...document.querySelectorAll(".prose pre, .table-wrap")].filter((el) => el.scrollWidth > el.clientWidth + 1).length);
    check("formula blocks fit", wide === 0, `${wide} too wide`);
  }
  await page.screenshot({ path: join(view.out, `${label}-about.png`) });
  await page.locator(".logo").click();
  await page.waitForSelector("#list-body tr.row");
  check("logo returns to the list", (await href(page)) === base, await href(page));
  check("no console or network errors", view.errors.length === 0, view.errors.slice(0, 3).join(" | "));
}

/** How long sorting every row takes on a CPU slowed 4×, close to a mid-range phone. */
async function reportSpeed(view) {
  for (const name of ["phone", "laptop"]) {
    view.size = SIZES[name];
    await openView(view, view.base);
    const cdp = await view.context.newCDPSession(view.page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const times = [];
    for (let i = 0; i < 7; i++) {
      times.push(
        await view.page.evaluate(() => {
          const cards = document.querySelector("#list-sort").offsetParent !== null;
          const control = cards ? document.querySelector("#list-direction") : document.querySelector('th[data-key="goFit"] button');
          const start = performance.now();
          control.click();
          void document.body.offsetHeight;
          return performance.now() - start;
        }),
      );
    }
    console.log(`speed: ${name}, CPU 4x slower, sorting all ${rows.length} rows: median ${Math.round(times.sort((a, b) => a - b)[3])}ms`);
  }
}

async function runChecks(view) {
  for (const name of flags.quick ? QUICK_SIZES : Object.keys(SIZES)) {
    for (const theme of ["light", "dark"]) {
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
  check("missing page returns 404", response.status() === 404, String(response.status()));
  check("404 page keeps the site header", (await view.page.locator(".logo").count()) === 1 && (await view.page.locator("h1").textContent()) === "Page not found");

  if (!flags.quick) await reportSpeed(view);
  console.log(`screenshots: ${view.out}`);
  console.log(failed === 0 ? `ALL ${passed} CHECKS PASSED` : `${failed} OF ${passed + failed} CHECKS FAILED`);
  if (failed > 0) process.exitCode = 1;
}

// ---- Entry point ----

if (command !== "check" && command !== "drive") {
  console.error('Usage: driver.mjs check [--quick] | driver.mjs drive [--size phone] [--theme dark] "step" ...');
  process.exit(2);
}
process.on("SIGINT", () => process.exit(130));

try {
  mkdirSync(flags.out, { recursive: true });
  // The browser goes first, so a machine without one fails at once rather than after a build.
  const browser = await launchBrowser();
  try {
    if (!flags.url && !flags["no-build"]) build();
    const base = flags.url ?? (await serve());
    const view = { browser, base, size: sizeFrom(flags.size), theme: flags.theme, out: flags.out, errors: [] };
    if (command === "check") await runChecks(view);
    else {
      await openView(view, base);
      await runSteps(view);
    }
  } finally {
    await browser.close();
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
// The preview child would otherwise keep this process alive.
process.exit();
