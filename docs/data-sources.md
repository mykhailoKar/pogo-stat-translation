# Data sources

Every upstream file is pinned to a commit in `data/sources.lock.json` with its sha256. `npm run fetch` downloads exactly those bytes into `data/raw/` (gitignored), so any checkout rebuilds the same dataset.

| Source | Repo | License | Used for |
|---|---|---|---|
| PokéAPI | [PokeAPI/pokeapi](https://github.com/PokeAPI/pokeapi) | BSD-3-Clause | Main-series stats, past stats, forms, names, types |
| PvPoke | [pvpoke/pvpoke](https://github.com/pvpoke/pvpoke) | MIT | GO base stats, PvP release flag, Shadow availability |

Pinned commits at the time of writing: PokéAPI `e5b79b2`, PvPoke `e02bde7`. The lock file is the source of truth.

## PokéAPI

Files from `data/v2/csv/` and what each provides:

| File | Use |
|---|---|
| `pokemon.csv` | One row per Pokémon or form: identifier, species, default flag, sort order |
| `pokemon_species.csv` | Dex number, generation, legendary/mythical/baby flags, evolution links |
| `pokemon_species_names.csv` | English species names (language 9) |
| `pokemon_forms.csv`, `version_groups.csv` | Generation each form was introduced in (drives the stat era) |
| `pokemon_form_names.csv` | English display and form names |
| `pokemon_stats.csv` | Current base stats |
| `pokemon_stats_past.csv` | Superseded base stats; `generation_id` is the last generation a value applied |
| `pokemon_types.csv`, `types.csv` | Current types |

Quirks the loader handles:
- `order` is empty for 139 newer rows. Those sort after the rest by row id.
- A few Pokémon (e.g. `koraidon-limited-build`) have no form row flagged default; the first form row is used.

## PvPoke

`src/data/gamemaster/pokemon.json`, validated with zod in `pipeline/load-pvpoke.ts`. The loader uses `dex`, `speciesId`, `speciesName`, `baseStats {atk, def, hp}`, `tags` and `released`.

Things to know:
- **`released` means usable in PvPoke's battles, not released in GO.** Shedinja is `false` because it can't be used in Trainer Battles. The dataset stores it as `go.pvpReleased` and never calls it "released in GO".
- Many unreleased Pokémon have datamined GO stats (`released: false`). They count as `actual`, but Scopely Explore may change them at launch.
- Shadow entries (`*_shadow`) are folded into `go.shadowAvailable` on the base entry.
- PvPoke spells some ids differently (`greattusk`, `nidoran_female`, `zacian_crowned_sword`). It also has costume and type variants with identical stats, plus a few duplicate entries. `data/overrides.yaml` maps or ignores each one with a reason, and the build fails on any entry it can't account for.

## Reference sources (not fetched)

- [Bulbapedia, Stat (GO)](https://bulbapedia.bulbagarden.net/wiki/Stat_(GO)): conversion formula, adjustment and stat-era rules.
- [Dittobase stat converter](https://www.dittobase.com/pokemon-go/stat-converter): rounding conventions; Mega Zygarde's expected GO line.

## Cross-check (2026-11-06)

A one-off check against sources the pipeline doesn't use, after Ultra Necrozma's Stamina was reported as one too high. No stats changed as a result.

- **Main-series stats:** all 1,250 forms match Pokémon Showdown's `data/pokedex.ts`.
- **GO stats:** 1,205 of the 1,211 forms with GO data match the raw game master from [PokeMiners](https://github.com/PokeMiners/game_masters) exactly. The other 6 aren't in its latest snapshot (2026-08-29): Mega Staraptor, Mega Chandelure, Hisuian Sliggoo, Hisuian Goodra and both Basculegion. Their PvPoke stats match the formula exactly.
- **Ultra Necrozma is 337/196/200.** The game master, Serebii, Pokémon GO Hub and GameInfo all agree. A 199 comes from rounding Stamina down under the cut, which is wrong for 39 forms, always by 1 ([methodology §1](methodology.md#1-conversion)).
- **Dugtrio has two templates in the game master:** `DUGTRIO` with 134 Defense and `DUGTRIO_NORMAL` with 136. The dataset's 136 is the form players get, and it matches Serebii and the formula. Pokémon GO Hub shows 134.

## Refreshing

```sh
npm run fetch:update   # resolve the latest upstream commits, download, rewrite the lock
npm run build:data     # rebuild the dataset and reports
git diff data/reports  # review: new entries, changed stats, new mismatches
npm test               # must pass before committing
```

If the build fails or tests report unexplained mismatches:
- A new PvPoke entry that matches nothing goes in `idMap` or `ignoreGo`.
- A new mismatch gets a cause first. If it's a stat era or a fixed multiplier, use `basisGeneration` or `fixedAdjustment`. Use `exceptions` only for genuinely hand-set stats.
- An override that no longer applies has to be removed. The build lists it.

Then commit the lock, the dataset and the reports together.

## Attribution

Pokémon and Pokémon GO are trademarks of Nintendo, Creatures Inc., GAME FREAK and Scopely. This is an unofficial fan project, not affiliated with any of them. Data comes from PokéAPI (BSD-3-Clause) and PvPoke (MIT).
