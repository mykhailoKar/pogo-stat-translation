# 0006: Astro site with the list data inlined

**Status:** accepted (2026-11-05)

## Context

Phase 2 is a list of 1,250 forms that sorts, filters and searches, plus an About page. It has to work on phones, tablets and desktops, stay on GitHub Pages ([0001](0001-static-site-github-pages.md)), and reuse `src/lib` ([0002](0002-typescript-end-to-end.md)).

## Decision

- **Astro with no UI framework.** The pages are static, and the only interactive part is the list, which is a small TypeScript script (about 8 KB). A framework would add more code than it replaces.
- **List logic stays in `src/lib/list.ts`.** Categories, search, sorting and URL state are pure functions with tests. `src/site/list-page.ts` only touches the DOM.
- **Slim rows go inline in the HTML as JSON.** The page is about 100 KB gzipped, against 187 KB for the full dataset, and the list needs no second request. The full `pokemon.json` is still published for anyone who wants it.
- **One table, two layouts.** At 760px and wider it's a table with a sticky header. Below that, CSS turns the same rows into cards, and a sort menu replaces the column headings. There's no second copy of the markup to keep in step.
- **The table uses a fixed layout,** so columns don't shift as rows are filtered.
- **Megas and Primals appear in their own category and in every category their species belongs to.** They keep their species' tags, so Mega Rayquaza is also a Legendary and Mega Charizard X also a Starter. Every one counts as fully evolved.
- **Percentile doesn't change between categories.** It's a form's rank in its pool, so a form shows the same number everywhere.
- **Figures on the About page come from `src/lib/about-figures.ts`,** not the page. `tsc` doesn't read `.astro` files, so code in them has no type checks or tests. A wrong call in the page once printed a worked example that didn't add up, and every check still passed. A test now redoes the printed arithmetic.
- **No sprites.** The art belongs to Nintendo, so the logo and favicon are original and the list is text only.
- **Dark mode follows the device.** There's no toggle yet.

## Consequences

- All matching rows render at once, with no virtual scrolling. Re-rendering all 1,250 takes about 100ms in the table layout, and about 500ms with the CPU slowed 4×, so sorting the full list can pause briefly on a slow tablet. The card layout stays near 110ms even when slowed, because `content-visibility` skips off-screen cards. That property has no effect on table rows.
- `deploy.yml` deploys every push to `main`. It only works once the repo's Pages source is set to GitHub Actions.
- The site lives under the `/pogo-stat-translation/` base path, so links must be built from `import.meta.env.BASE_URL`.
