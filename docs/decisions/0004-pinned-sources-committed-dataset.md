# 0004: Pinned sources, committed dataset

**Status:** accepted (2026-11-03)

## Context

Both upstream repos change often. A dataset built from "latest" would change under us, and a regression (a renamed form, a stat change) would be hard to spot.

## Decision

- **Pin every upstream file** to a commit SHA with a sha256 in `data/sources.lock.json`. `npm run fetch` downloads exactly those bytes from immutable commit URLs; `npm run fetch:update` moves the pins deliberately.
- **Don't commit raw files.** They're a few MB and reproducible from the lock, so they live in `data/raw/` (gitignored).
- **Commit the generated output:** `public/data/pokemon.json` (one Pokémon per line, so diffs show which entries changed) and `data/reports/*.md`.
- **Make output deterministic:** no timestamps, stable sorting and formatting. CI rebuilds and fails if the committed files differ.

## Consequences

- Every data change shows up as a reviewable diff: which Pokémon changed, and how validation moved.
- A refresh is a deliberate commit (lock + dataset + reports), not a side effect of a build.
- If an upstream repo ever rewrote history, a pinned commit could disappear; the sha256 check would catch it.
