# pogo-stat-transfer

Judges how well every main-series Pokémon's base stats carry over into Pokémon GO.

GO collapses six stats into three with a fixed, lopsided formula. Speed shrinks to a small multiplier, the weaker attacking stat counts for 1/8, HP gets a flat +50, and very strong Pokémon take a ×0.91 cut. Some Pokémon come out far stronger than their main-series stat total suggests and others far weaker. This project measures that, for every form.

**Status: Phase 1 (data).** The pipeline builds and validates the dataset. The website comes in Phase 2.

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
```

## Layout

| Path | What |
|---|---|
| `src/lib/` | Formula, stat-era rule, metrics, GO Fit, types. Pure; shared with the future site |
| `pipeline/` | Fetch, load, join, select, build, reports |
| `data/sources.lock.json` | Pinned upstream commits and file hashes |
| `data/overrides.yaml` | Hand-reviewed rules: id mappings, ignores, fixed multipliers, exceptions |
| `data/reports/` | Generated validation and coverage reports |
| `public/data/pokemon.json` | Generated dataset (one Pokémon per line) |
| `docs/` | [Methodology](docs/methodology.md), [data sources](docs/data-sources.md), [research](docs/research/README.md), [decisions](docs/README.md#decisions) |
| `tests/` | `node:test` suites |

## Data and credits

Main-series data from [PokéAPI](https://github.com/PokeAPI/pokeapi) (BSD-3-Clause). GO stats from [PvPoke](https://github.com/pvpoke/pvpoke) (MIT). Formula references: Bulbapedia and Dittobase. See [docs/data-sources.md](docs/data-sources.md).

Pokémon and Pokémon GO are trademarks of Nintendo, Creatures Inc., GAME FREAK and Niantic. This is an unofficial fan project, not affiliated with any of them.

## License

Code: [MIT](LICENSE). Data keeps its upstream licenses.
