# CLAUDE.md

pogo-stat-translation scores how well each main-series Pokémon's base stats carry over into Pokémon GO. A Node pipeline builds one JSON dataset from pinned upstream data, and an Astro static site lists it. The site is live at https://mykhailokar.github.io/pogo-stat-translation/, and **every merge into `main` deploys it**.

## Where things are written down

| Read | When |
|---|---|
| `README.md` | First. What the project does, quick start, layout, status, and how the issue labels work |
| `docs/methodology.md` | Before changing anything in `src/lib/` or `pipeline/`. It's the spec: formula, adjustments, GO Fit, the Cut label, categories |
| `docs/decisions/` | Before reversing a past choice. Add a new record when you make a choice of the same weight |
| `docs/data-sources.md` | Before touching the pipeline or refreshing data. Sources, their quirks, the refresh steps |
| `.claude/skills/run-pogo-stat-translation/SKILL.md` | Before running the site or checking a UI change in a browser |
| `data/reports/validation.md` | To see how the formula compares with GO's real stats |

The project owner chooses what comes next. Ideas and planned changes are GitHub issues (`gh issue list`), and none is scheduled until the owner asks for it. A new idea goes in a new issue, not the README, labelled by kind (`idea`, `enhancement` or `bug`) and part (`data` or `site`), plus `needs owner` if it waits on the owner. A pull request that finishes an issue says `Closes #N` in its body.

## Commands

- `npm run verify` runs the whole chain: build the dataset, test, lint, check formatting, type-check, build the site. Run it before every commit. A fresh clone needs `npm ci && npm run fetch` first.
- `npm run format` formats the code with Prettier. CI rejects unformatted code.
- `node .claude/skills/run-pogo-stat-translation/driver.ts check --quick` checks the built site in a real browser. Run it after any change under `src/`, because `npm test` can't see the page's wiring.

## Rules

- Every formula or metric change needs a golden test, with values from `docs/research/` or GO data.
- Keep `src/lib/` pure (no `node:` imports). The site imports it in the browser.
- `tsc` doesn't read `.astro` files. Keep logic and figures out of them: `src/lib/list.ts` for the list, `src/lib/about-figures.ts` for numbers on the About page.
- Never edit generated files by hand:
  - `public/data/pokemon.json` and `data/reports/*.md`: run `npm run build:data`.
  - `src/components/Logo.astro` and `public/favicon.svg`: edit `scripts/draw-logo.ts`, then run `npm run draw:logo`.
- Every entry in `data/overrides.yaml` needs a reason. Try to find a cause first (stat era → `basisGeneration`, multiplier → `fixedAdjustment`). Use `exceptions` only for genuinely hand-set stats.
- Don't edit the files in `docs/research/`; they're the owner's original research. Record corrections in the errata table in `docs/research/README.md`.
- When the site's behaviour or numbers change, update the About page (`src/pages/about.astro`) and `docs/methodology.md` in the same commit. Update `SKILL.md` and the driver if a control they use changes.
- CI fails if the committed dataset differs from a fresh build, so commit the dataset and reports with the change that caused them.
- Everything is TypeScript, including tooling. Node runs `.ts` directly (type stripping), so imports use `.ts` extensions and only erasable syntax is allowed (no enums, namespaces or parameter properties).
- Credit Pokémon GO's developer as Scopely Explore, not Niantic. Trademark and affiliation lines name Scopely, its parent company.
- Art from the games is allowed on [decision 0009](docs/decisions/0009-art-from-the-games.md)'s terms. The owner adds the files under `public/art/`, every source is credited, and it comes down if a rights holder asks. Don't draw, trace or copy the games' art yourself.
- `main` is protected, so never push to it. Work on a branch, push the branch and open a pull request with `gh pr create`, using the template's checklist. It can merge only when both CI jobs pass, **Test and build** and **Browser checks**. Merge with a merge commit, not squash or rebase ([decision 0007](docs/decisions/0007-team-workflow.md)).
- Commits: one change per commit, a short imperative subject, and a body that says why.
