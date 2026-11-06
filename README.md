# pogo-stat-translation

Judges how well every main-series Pokémon's base stats carry over into Pokémon GO.

GO collapses six stats into three with a fixed, lopsided formula. Speed shrinks to a small multiplier, the weaker attacking stat counts for 1/8, HP gets a flat +50, and very strong Pokémon take a ×0.91 cut. Some Pokémon come out far stronger than their main-series stat total suggests and others far weaker. This project measures that, for every form.

**Status: Phase 2 (core site).** The pipeline builds and validates the dataset, and a static site lists every form with GO Fit, its three parts, its percentile and its level 50 CP. An About page explains the method.

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

Pushing to `main` deploys the site to GitHub Pages through `.github/workflows/deploy.yml`.

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

## Data and credits

Main-series data from [PokéAPI](https://github.com/PokeAPI/pokeapi) (BSD-3-Clause). GO stats from [PvPoke](https://github.com/pvpoke/pvpoke) (MIT). Formula references: Bulbapedia and Dittobase. See [docs/data-sources.md](docs/data-sources.md).

Pokémon and Pokémon GO are trademarks of Nintendo, Creatures Inc., GAME FREAK and Scopely Explore. This is an unofficial fan project, not affiliated with any of them.

## License

Code: [MIT](LICENSE). Data keeps its upstream licenses.
