---
name: run-pogo-stat-translation
description: Build, run, drive, test and screenshot the pogo-stat-translation site, an Astro list of Pokémon GO Fit scores with a data pipeline behind it. Use when asked to start or run the site, take a screenshot, check it at phone, tablet or desktop sizes, confirm a UI change in a real browser, try sorting, categories, search, row details, URL state, dark mode or the About page, or rebuild and test the dataset.
---

A static Astro site with a Node data pipeline. Drive the site with `.claude/skills/run-pogo-stat-translation/driver.mjs`. It builds the site, serves it on a private port, runs a real browser and shuts everything down when it exits, so there's no server to start or stop.

Run everything from the repo root.

## What to run

| You changed | Run |
|---|---|
| `src/pages/`, `src/layouts/`, `src/components/`, `src/site/` | `check --quick`, then `drive` the thing you changed |
| `src/lib/` | `npm test`, then `check --quick` |
| `pipeline/`, `data/overrides.yaml`, `data/sources.lock.json` | `npm run fetch`, `npm run build:data`, `npm test`, then `check --quick` |

Run both layers: **the driver can't see a bug in `src/lib/list.ts`.** It takes its expected values from that file, so a wrong result there matches itself. Planted bugs in `sortRows` and `inCategory` passed the driver, and `npm test` caught them. Bugs in the page's wiring are the reverse: the driver caught them and `npm test` didn't.

## Prerequisites

Node 24 (`.nvmrc`). On a bare Ubuntu 24.04, as root (add `sudo` otherwise):

```bash
apt-get update
apt-get install -y curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs
```

## Setup

```bash
npm ci
```

The driver looks for Edge, then Chrome, then a browser installed by Playwright. If the machine has neither Edge nor Chrome:

```bash
npx playwright-core install --with-deps --only-shell chromium
```

## Run (agent path)

Check the whole site:

```bash
node .claude/skills/run-pogo-stat-translation/driver.mjs check --quick
```

It ends with `ALL <n> CHECKS PASSED` and exits 0, or lists each `FAIL` and exits 1. `--quick` covers 3 sizes in light and dark in about 20 seconds. Without it, `check` takes about a minute and covers all 9 sizes, including the 759/760px edge where cards become a table, and reports how long sorting takes on a slowed CPU.

Do something specific. Each argument is one step, and every run starts on the list page with a new browser:

```bash
node .claude/skills/run-pogo-stat-translation/driver.mjs drive --size phone --theme dark "category mega" "sort cpNow" "count" "rows 3" "shot mega-phone"
```

It prints each step's result, then any console or network errors, which also make it exit 1. Add `--no-build` to reuse the last build.

| Step | What it does |
|---|---|
| `category <id>` | `all`, `legendary`, `mega`, `mythical`, `starter`, `fully-evolved` |
| `sort <key>` | `dex`, `name`, `goFit`, `percentile`, `attackFit`, `defenseFit`, `speedFit`, `cpNow`, `cpIdeal`. Uses the headings or the phone menu, whichever is showing |
| `flip` | Reverses the sort |
| `search <text>` | Types in the search box |
| `open <id>` | Opens or closes a row, such as `open garchomp` |
| `rows [n]` | Prints the first rows (default 5) |
| `count`, `url`, `overflow` | Print the count line, the URL, and how far the page overflows sideways |
| `goto <path>` | Relative to the site, such as `goto about/` or `goto ?category=mega&q=char` |
| `size <name or WxH>` | Reopens the page at that size, keeping the URL. Names: `phone-small`, `phone`, `phone-landscape`, `cards-edge`, `table-edge`, `tablet`, `tablet-wide`, `laptop`, `desktop` |
| `theme <light or dark>` | Switches colour scheme |
| `shot <name> [full]` | Screenshot, and prints its path. `full` captures the whole page |
| `click`, `fill`, `press`, `text`, `eval` | Plain Playwright: `click <selector>`, `fill <selector> <text>`, `press <key>`, `text <selector>`, `eval <js>` |

Screenshots go to `pogo-stat-translation/shots/` in the system temp folder, and `--out <dir>` changes that. Open them and look: `check` proves the controls work, not that the page looks right.

`--url <address>` drives a server that's already running instead of building one, such as `npm run dev`. `BROWSER_CHANNEL=chrome` forces a browser (`msedge`, `chrome` or `chromium`).

## Run `src/lib` directly

Node runs TypeScript as it is, so a formula can be called without the site:

```bash
node --input-type=module -e 'import { toGo } from "./src/lib/formula.ts"; console.log(toGo({ hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 }));'
```

That's Garchomp, and it should print `atk: 261, def: 193, sta: 239`.

## Rebuild the dataset

`data/raw/` isn't in git, so a fresh clone needs `fetch` first. It downloads the sources pinned in `data/sources.lock.json`.

```bash
npm run fetch
npm run build:data
```

It should print `0 unexplained`, and with unchanged inputs `public/data/pokemon.json` comes out identical on Windows and Linux. Never edit that file or `data/reports/` by hand.

## Run (human path)

```bash
npm run dev
```

Serves `http://localhost:4321/pogo-stat-translation/` with live reload until Ctrl-C. The site lives under that base path, so `http://localhost:4321/` is a 404.

## Test

Before committing, run what CI runs:

```bash
npm run build:data && npm test && npm run lint && npm run typecheck && npm run build
```

`tsc` doesn't read `.astro` files, so a wrong call in a page passes all of this. Only the driver or your eyes will catch it.

## Gotchas

- **`page.url()` is stale in your own Playwright code.** The list writes its state with `history.replaceState`, and `page.url()` updates a moment later. Read `location.href` with `page.evaluate`, as the driver does. This silently lost a search term.
- **`innerText` can come back blank on phone widths.** Off-screen cards use `content-visibility`, so read `textContent`.
- **`localhost` differs by OS.** On Linux, Astro binds it to `::1` only, and Node's `fetch` tries `127.0.0.1` and is refused, while `curl` still works. The driver avoids this by passing `--host 127.0.0.1`.
- **`sort` on the current column does nothing,** so `sort goFit` is safe to repeat. Clicking that heading in the page flips it, and `flip` does the same.
- **`open <id>` only finds rows on screen.** Search or change category first, and the id is the form's dataset id, such as `rayquaza-mega`.
- **Percentile doesn't change between categories,** and Megas are ranked among themselves. Two forms showing 100.0 isn't a bug.
- **Name sort uses the species,** so Mega Charizard X sits next to Charizard and the visible names won't look alphabetical.
- **Headings look thin in a Linux container.** The page falls back to WenQuanYi Zen Hei there, which has no bold, although the CSS still says 700. It isn't a site bug, so judge layout from those screenshots, not type weight.
- **Only Chromium is covered.** Touch is emulated, so Safari, Firefox and real phones are untested.

## Troubleshooting

- **`No browser could start`:** run the `playwright-core install` command under Setup.
- **`astro preview did not answer at ...`:** the preview's own output follows the message. If it says the output folder is missing, drop `--no-build`.
- **`locator.click: Timeout 10000ms exceeded` on `tr.row[data-id=...]`:** that row isn't in the current view, or the id is wrong. Use `rows` to see what's listed.
- **`page errors: 404 ...` with exit 1:** expected if you went to a missing page on purpose.
- **`npm test` shows `fail 0` but `cancelled 25`, and exits 1:** `data/raw/` is missing, so the `before()` hook in `tests/dataset.test.ts` stopped that whole file. Run `npm run fetch`.
- **`ENOENT` on a `data/raw/...` path from `npm run build:data`:** same cause, same fix.
