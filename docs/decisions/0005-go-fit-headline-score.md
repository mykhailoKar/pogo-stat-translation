# 0005: GO Fit as the headline score

**Status:** accepted (2026-11-05)

## Context

The app needs one number for how well a form's stats suit GO. Comparing a form's BST rank with its GO rank would mostly restate how strong it is. The conversion is what's interesting: it rewards one big attacking stat, one big defending stat, and little Speed.

## Decision

Score each form against the best reshape of its own stat points: HP untouched, attack points in one stat, defense points in one stat, Speed at its optimum. The formula is in [methodology §7](../methodology.md#7-go-fit).

- **Stat product, not CP.** CP puts a square root on Defense, which squeezes Defense Fit into 90–100 and makes it look unimportant next to Attack Fit and Speed Fit. The site shows all three, so they need to be on equal terms. With stat product Defense Fit runs from 81 to 99. Rankings barely differ between the two (rank correlation 0.99), but the numbers are lower and less familiar than CP.
- **Keep the form's own adjustment in the best shape.** Re-testing the 4,000 CP line puts forms just under it at the top (Zen Darmanitan, Rhyperior, Ursaluna), which rewards power rather than shape, and makes many best shapes hold back on purpose to dodge the cut.
- **Fixed total, Speed traded in proportion.** More Speed always helps, so an optimum needs a cost. Trading in proportion keeps a form's role. Sending points wherever they pay most would turn every form towards the same build.
- **Whole-number best shapes, with the split rounded once.** Every number on the site then comes from GO's real stats or a spread that could exist, and can be checked with a calculator. The cost is rounding noise: scoring a best shape again gives 98.6–100, and a stored best shape can miss a slightly better spread one point away, which costs 0.07 points on average. Trying both roundings of the split doesn't fix that. Dropping all rounding does, but the score then stops using GO's real stats. Revisit that option if the site gets a custom spread tool.
- **Percentage and percentile, no letter grades.** Scores cluster around 50 and nothing nears 100, so the percentile within each pool gives the comparison.

## Consequences

- GO Fit says nothing about strength. Bonsly outscores Mewtwo, so the site needs CP next to it.
- For 458 forms the best shape would trip the ×0.91 cut in real GO. It's a yardstick, not a buildable Pokémon.
- Weak forms score lower, because a Speed point costs them more. That's real, but a low score on a low-BST form is partly about size.
- `src/lib/go-fit.ts` is pure, so the site can run it live, for example on a custom spread.
