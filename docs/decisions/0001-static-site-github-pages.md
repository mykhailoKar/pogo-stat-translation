# 0001: Static site on GitHub Pages

**Status:** accepted (2026-11-03)

## Context

The app ranks about 1,250 Pokémon forms on deterministic math over base stats. The data changes only when a main-series game or a GO balance patch lands: days apart, not minutes. Nothing needs accounts, writes or server-side work.

## Decision

Ship a static site on GitHub Pages (Phase 2), backed by a dataset generated at build time. The whole dataset is one JSON file of under 1 MB that the browser loads at once, so there's no API and no database.

## Consequences

- Free hosting, no servers to run, and the site works offline once loaded.
- No per-PR preview deploys on Pages. Cloudflare Pages or Netlify are drop-in replacements if those become worth it.
- Accounts, voting or community tier lists would need a backend. Comments could still stay static with giscus (GitHub Discussions).
- The site will be a project page at `mykhailokar.github.io/pogo-stat-transfer/`, so the frontend needs a base path.
