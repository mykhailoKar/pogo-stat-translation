# 0009: Art from the games, on the owner's terms

**Status:** accepted (2026-11-07)

## Context

[0006](0006-astro-site-inline-list-data.md) left out sprites because the art belongs to Nintendo, and `CLAUDE.md` banned any Nintendo art. The owner wants room for pictures of the Pokémon and the games' type icons, and has changed the rule. Their case: the site is a non-commercial fan project, and reference sites such as Bulbapedia and Serebii show the games' art.

That art isn't freely licensed. Those sites rely on fair use and on Nintendo leaving them alone, not on permission, and Wikimedia Commons doesn't host it at all. Being non-commercial helps a fair-use defence but isn't a licence. The Pokémon Company mostly pursues fan games and merchandise rather than reference sites, so the risk is small. It isn't zero, and it falls on the owner.

## Decision

- **The site may show art from the games:** sprites, official artwork and type icons.
- **The owner adds the files.** AI agents working in the repo don't draw, trace or copy the games' art. They can build the layout, loading and credits around files the owner supplies.
- **All of it lives under `public/art/`,** so one commit can take it all out.
- **Every source is credited** on the About page and in the README, along with the art's owners: ©Pokémon, ©Nintendo/Creatures Inc./GAME FREAK inc.
- **The MIT licence doesn't cover it,** and the README says so next to the licence.
- **The site stays non-commercial** while the art is on it: no ads and no paid features.
- **It comes down if asked.** A request or takedown notice from a rights holder is met by removing the art.
- **The list still has to fit.** Ten rows and the pager stay on one laptop screen, as 0006 requires, and pictures load only for the rows on screen.

## Consequences

- This replaces 0006's "No sprites". The logo, the favicon and the type icons stay original drawings until the owner chooses otherwise.
- A takedown notice to GitHub would disable the repository and the live site until the art is gone. Keeping it in one folder makes that a one-commit fix.
- Nothing on the site changes yet. The About page still says the site uses no art from the games, and that line changes with the first art added.
