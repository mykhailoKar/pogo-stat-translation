# 0003: PvPoke's gamemaster as the GO source

**Status:** accepted (2026-11-03)

## Context

Actual GO base stats come from the game master, which the community datamines. The options were:
- the raw dump (PokeMiners `game_masters`), which is authoritative but verbose and built around the game's internals,
- PvPoke's curated `src/data/gamemaster/pokemon.json`, which is MIT-licensed, clean, and one entry per Pokémon or form, with Shadow entries and a `released` flag.

## Decision

Use PvPoke's `pokemon.json` as the only GO source in Phase 1, validated with zod.

## Consequences

- **The join is simple.** About 1,170 entries match PokéAPI identifiers after normalisation; the rest need explicit, reviewed rules.
- **PvPoke's `released` flag means usable in its battles, not released in GO.** Shedinja is `false`. The dataset stores it as `go.pvpReleased` and doesn't claim GO release status.
- **Some entries are datamined pre-release stats** that may change at launch.
- **We depend on PvPoke's curation.** The raw game master stays an option for cross-checking later; adding it as a second source is a contained change in `pipeline/`.
