# CLAUDE.md

- Read `docs/methodology.md` before changing anything in `src/lib/`. Every formula or metric change needs a golden test, with values from `docs/research/` or GO data.
- Keep `src/lib/` pure (no `node:` imports). The site imports it in the browser.
- `tsc` doesn't read `.astro` files. Keep logic and figures out of them: `src/lib/list.ts` for the list, `src/lib/about-figures.ts` for numbers on the About page.
- Never edit generated files by hand: `public/data/pokemon.json` and `data/reports/*.md`. Run `npm run build:data`.
- Every entry in `data/overrides.yaml` needs a reason. Try to find a cause first (stat era → `basisGeneration`, multiplier → `fixedAdjustment`). Use `exceptions` only for genuinely hand-set stats.
- Don't edit the files in `docs/research/`. Record corrections in the errata table in `docs/research/README.md`.
- Before committing: `npm run build:data && npm test && npm run lint && npm run typecheck && npm run build`. CI fails if the committed dataset differs from a fresh build.
- Node runs `.ts` directly (type stripping): imports use `.ts` extensions, and only erasable syntax is allowed (no enums or namespaces).
