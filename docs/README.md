# Docs

| Doc | What it covers |
|---|---|
| [methodology.md](methodology.md) | The conversion formula, adjustments, stat eras, validation results, metrics, form selection, GO Fit, and open questions for Phase 2 |
| [data-sources.md](data-sources.md) | Where the data comes from, licenses, pinned commits, source quirks, how to refresh |
| [research/](research/README.md) | The original research files (unchanged) plus a list of errata found against GO data |
| [decisions/](decisions/) | Short records of the main technical decisions |

## Decisions

- [0001: Static site on GitHub Pages](decisions/0001-static-site-github-pages.md)
- [0002: TypeScript end to end](decisions/0002-typescript-end-to-end.md)
- [0003: PvPoke's gamemaster as the GO source](decisions/0003-pvpoke-as-go-source.md)
- [0004: Pinned sources, committed dataset](decisions/0004-pinned-sources-committed-dataset.md)
- [0005: GO Fit as the headline score](decisions/0005-go-fit-headline-score.md)

## Generated reports

Rewritten by `npm run build:data`, never by hand:

- [`data/reports/validation.md`](../data/reports/validation.md): formula vs GO data, exceptions, adjustments.
- [`data/reports/coverage.md`](../data/reports/coverage.md): what was kept, dropped, ignored and matched.
