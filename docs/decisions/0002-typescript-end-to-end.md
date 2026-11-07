# 0002: TypeScript end to end

**Status:** accepted (2026-11-03)

## Context

The same formula has to run in two places: the build pipeline (to precompute rankings) and the browser (for a planned playground, which would convert any stat spread live). If they're written separately, they will drift.

## Decision

- Write the pipeline and the site in TypeScript.
- Keep the formula, stat-era rule and metrics in `src/lib/` as pure modules with no `node:` imports. The pipeline imports them now and the site will import them later.
- Run scripts with Node 24's built-in type stripping (no build step, no tsx).
- Test with `node:test` (no test framework dependency).
- Match the conventions of `mykhailokar.github.io`: TypeScript 7, oxlint, `erasableSyntaxOnly`, `.ts` import extensions.

## Consequences

- One implementation of the formula, checked by golden tests taken from the research.
- TypeScript syntax is limited to what Node can strip (no enums or namespaces), which `erasableSyntaxOnly` enforces.
- Tooling follows the same rule (added 2026-11-07): `astro.config.ts`, `scripts/` and the browser driver in `.claude/skills/` are TypeScript and type-checked with the rest.
- Python's banker's rounding was another reason against a Python pipeline. GO rounds .5 up, and the code does that with exact integer arithmetic.
