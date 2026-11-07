# 0007: Pull requests, a formatter, browser checks in CI and Dependabot

**Status:** accepted (2026-11-07)

## Context

The project was built by pushing straight to `main`, which deploys the site at once. Formatting was consistent only by hand, the browser checks ran only on the owner's machine, and dependencies were updated by hand. The owner wants the project to follow the standards an engineering team would, so every contributor, human or AI, works the same way.

## Decision

- **`main` is protected.** Every change goes through a pull request. Both CI jobs, **Test and build** and **Browser checks**, must pass on a branch that's up to date with `main`. The rule applies to admins too, and force pushes and deleting `main` are blocked. No approval is required, because the project has one maintainer.
- **Prettier formats the code:** TypeScript, Astro, CSS, JSON and YAML, at 120 characters a line. At the default 80 it would rewrap hundreds of lines that are long strings or comments anyway.
  - Markdown is left out, so prose and tables stay as written. Generated files and `docs/research/` are left out too.
  - `npm run verify` and CI fail on unformatted code.
  - The one-off reformat is listed in `.git-blame-ignore-revs`, so blame shows who really wrote each line.
- **CI runs the browser driver:** the full `check`, all 9 sizes in light and dark, on Ubuntu with the Chromium that matches `playwright-core`. Screenshots are kept as a workflow artifact for 7 days.
- **Dependabot opens weekly pull requests:** one grouped PR for minor and patch npm updates, one per major update, and one for GitHub Actions. Security updates are on.

## Consequences

- Merging into `main` is the only way to deploy. A merge that shouldn't redeploy the site, such as a docs or tooling change, can put `[skip actions]` in its merge commit message. CI has already passed on the pull request by then.
- Dependency updates pass the same checks as any change, including the rebuilt-dataset diff, before they can merge.
- Formatting is never a review topic.
- A pull request waits for the browser job, which is the slower of the two.
- Pull requests should be merged with a merge commit, not squashed or rebased, so the reformat commit keeps the hash listed in `.git-blame-ignore-revs`.
