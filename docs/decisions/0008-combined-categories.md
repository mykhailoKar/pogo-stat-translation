# 0008: Categories that combine and leave out

**Status:** accepted (2026-11-07)

## Context

The list had one category at a time, chosen with radio buttons. The owner asked to select several at once, and to leave one out with a double-click, several if wanted. The categories overlap, since Megas and Primals keep their species' tags ([0006](0006-astro-site-inline-list-data.md)), so the rule for combining them needs a choice.

## Decision

- **Selected categories combine with OR.** A form shows when it's in any of them. Legendaries + Mythicals is the obvious use, and AND would leave it empty, since no form is both.
- **Left-out categories win.** A form in any left-out category is hidden, even if it's also in a selected one. Leaving one out works on its own too, as "every form but the Megas".
- **A click selects, and a double-click leaves out.** Clicking a selected or left-out category returns it to neither, and a second double-click brings a left-out one back. All species clears every choice and can't be left out. The first click of a double-click selects the category for a moment before the double-click undoes it, so a single click never has to wait to see whether a second follows.
- **Shift+click, Shift+Enter and Shift+Space also leave out,** so the keyboard has a way in, and the mouse has one without the momentary redraw. Double tap does the same on touch screens, with `touch-action: manipulation` so it doesn't zoom.
- **The pills are toggle buttons** (`aria-pressed`). A left-out one has a red outline and a red cross before its name, and screen readers hear "left out". The cross's shape marks it for anyone who can't tell the red apart.
- **The URL repeats a parameter per category,** as in `?category=legendary&category=mythical&exclude=mega`. Commas would be escaped to `%2C`, and a link with one `category` from before this change still works.
- **The hint is short and sits at the end of the pill row,** where there's room on a laptop, so ten rows and the pager still fit the screen. Screen readers get the full explanation through `aria-describedby`.

## Consequences

- `ListState.category` became `include` and `exclude`. `inCategory` didn't change; `inCategories` combines it.
- Real touch screens are untested, like the rest of the site. The driver covers the mouse and the keyboard in Chromium.
