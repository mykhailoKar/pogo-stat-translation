# pogo-stat-translation

Judges how well every main-series Pokémon's base stats carry over into Pokémon GO.

**Live site:** https://mykhailokar.github.io/pogo-stat-translation/

GO collapses six stats into three with a fixed, lopsided formula. Speed shrinks to a small multiplier, the weaker attacking stat counts for 1/8, HP gets a flat +50, and very strong Pokémon take a ×0.91 cut. Some Pokémon come out far stronger than their main-series stat total suggests and others far weaker. This project measures that, for every form.

**Status: Phase 2 (core site) is live.** The pipeline builds and validates the dataset, and a static site lists every form with GO Fit, its three parts, its percentile and its level 50 CP, 10 to a page. An About page explains the method.

- `public/data/pokemon.json`: 1,250 forms, with current and GO-era main-series stats, GO stats (actual or predicted), conversion steps, CP, stat product, bulk, GO Fit and percentile ranks.
- The conversion formula reproduces GO's stats exactly for **1,205 of 1,211** entries that have GO data. The other 6 are documented exceptions, such as Shedinja's hand-set Stamina of 1.
- **GO Fit** is the headline score: a form's stat product as a percentage of the best reshape of its own stat points, split into Attack Fit, Defense Fit and Speed Fit. See [methodology §7](docs/methodology.md#7-go-fit).

## Quick start

Requires Node 24+.

```sh
npm ci
npm run fetch        # download the pinned upstream data into data/raw/
npm run build:data   # build public/data/pokemon.json and data/reports/
npm test             # unit tests + full-dataset validation
npm run lint
npm run typecheck
npm run dev          # local site at http://localhost:4321/pogo-stat-translation/
npm run build        # static site in dist/
```

Before committing, run `npm run verify`. It builds the dataset, tests, lints, checks formatting, type-checks and builds the site. `npm run format` fixes formatting. After a change to the site, also check it in a real browser:

```sh
node .claude/skills/run-pogo-stat-translation/driver.ts check --quick
```

The driver builds and serves the site itself, and tests 3 screen sizes in light and dark. Its [SKILL.md](.claude/skills/run-pogo-stat-translation/SKILL.md) lists every option.

Merging into `main` deploys the site to GitHub Pages through `.github/workflows/deploy.yml`.

## Layout

| Path | What |
|---|---|
| `src/lib/` | Formula, stat-era rule, metrics, GO Fit, list logic, About figures, types. Pure; shared by the pipeline, the build and the browser |
| `src/pages/`, `src/layouts/`, `src/components/` | Astro pages (list, About, 404), the shared layout and the logo |
| `src/site/` | The list's browser script, the stylesheet and the build-time dataset loader |
| `pipeline/` | Fetch, load, join, select, build, reports |
| `data/sources.lock.json` | Pinned upstream commits and file hashes |
| `data/overrides.yaml` | Hand-reviewed rules: id mappings, ignores, fixed multipliers, exceptions |
| `data/reports/` | Generated validation and coverage reports |
| `public/data/pokemon.json` | Generated dataset (one Pokémon per line) |
| `docs/` | [Methodology](docs/methodology.md), [data sources](docs/data-sources.md), [research](docs/research/README.md), [decisions](docs/README.md#decisions) |
| `tests/` | `node:test` suites |
| `scripts/draw-logo.ts` | Generates the logo and favicon |
| `.claude/skills/run-pogo-stat-translation/` | The browser driver and its instructions, for people and AI agents |
| `CLAUDE.md` | Rules for AI coding agents working in this repo |
| `.github/` | CI, deploy and Dependabot config, and the pull request template |

Everything is TypeScript, including the config and tooling. Node 24 runs `.ts` files directly, so there's no compile step outside the site build.

## What's next

Nothing is scheduled. The candidates so far, in no order:

- **Format lenses:** scores for raids, gyms, Max Battles and the Great, Ultra and Master Leagues ([methodology §10](docs/methodology.md#10-open-questions)).
- **Playground:** type any stat spread and see it converted live. The formula already runs in the browser for this reason ([decision 0002](docs/decisions/0002-typescript-end-to-end.md)).
- **A page per Pokémon,** with a link that can be shared.
- **Shadow forms,** and notes on abilities GO drops, such as Huge Power and Truant.
- **A scheduled data refresh** in GitHub Actions.
- **A global rank** in place of the percentile: each form's place by GO Fit among every form, Megas and Primals included, the same whichever categories are picked. Today the percentile ranks Megas and Primals in a pool of their own ([methodology §5](docs/methodology.md#5-metrics)).

Sprites are left out on purpose ([decision 0006](docs/decisions/0006-astro-site-inline-list-data.md)).

## Contributing

`main` is protected, so every change goes through a pull request. It can merge only when both CI jobs pass:

- **Test and build:** lint, formatting, types, the rebuilt dataset, tests and the site build.
- **Browser checks:** the driver at all 9 sizes, in light and dark. The screenshots are kept as an artifact.

The pull request template has the checklist. Dependabot opens dependency updates as pull requests every week. [Decision 0007](docs/decisions/0007-team-workflow.md) explains the setup.

## Data and credits

Main-series data from [PokéAPI](https://github.com/PokeAPI/pokeapi) (BSD-3-Clause). GO stats from [PvPoke](https://github.com/pvpoke/pvpoke) (MIT). Formula references: Bulbapedia and Dittobase. See [docs/data-sources.md](docs/data-sources.md).

Pokémon and Pokémon GO are trademarks of Nintendo, Creatures Inc., GAME FREAK and Scopely. This is an unofficial fan project, not affiliated with any of them.

## License

Code: [MIT](LICENSE). Data keeps its upstream licenses.
