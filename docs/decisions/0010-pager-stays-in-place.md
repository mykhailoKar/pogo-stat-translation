# 0010: The pager stays in place

**Status:** accepted (2026-11-11)

## Context

The pager under the list moved from page to page, so clicking Next or 5> again and again could miss ([#14](https://github.com/mykhailoKar/pogo-stat-translation/issues/14)). Measured before the fix, it sat at 4 to 14 different heights across the 125 pages, depending on the screen size:

- A long name, or a name with two types, wrapped onto another line. At 1366px, 75 of the 1,250 rows were two or three lines high, and at 760px some took five.
- The last page of a category or search has fewer than 10 rows.
- On phones, a card's height depended on its name.
- A row left open stayed open on its page, which made that page taller.
- The run of page numbers changes width from page to page, as in 1 2 3 … 125 against 1 … 121 122 123 124 125. The pager is centred, so Previous, Next and the jumps moved sideways too.

Ten rows and the pager must still fit a 1366×768 laptop screen ([0006](0006-astro-site-inline-list-data.md)).

## Decision

- **Every row is one line high**, in the table and as cards. The name and the types each keep to one line and end in "…" when they don't fit. At 1100px and wider, where the types share the name's line, the name keeps its room and the types give way. A Predicted label is never cut.
  - A cut name or types get a tooltip with the whole text, and an open row shows them whole.
  - Types left too little room for one icon and its "…" are hidden rather than shown as a sliver. Screen readers still read them.
- **A short page is filled to the height of a full one** with hidden copies of one of its rows. Every row is the same height, so a copy is exactly as tall as a missing row, at every size and in any font, and nothing has to be measured. Screen readers skip them, and they can't be clicked or focused.
- **Every page starts with its rows closed,** so the page you arrive at is as tall as the one you left. Opening a row still moves the pager, but only on that page, and only because you asked.
- **The page numbers sit over a hidden copy of the widest run the list can show** (`widestPageLinks`), so the pager is as wide on every page and the buttons either side of the numbers don't move. A short list keeps a narrow pager.

Rejected:

- **Reserving room for the tallest row.** Ten two-line rows push the pager below a 768px screen.
- **The pager above the list, or pinned to the bottom of the screen.** Above, it's far from the last row you read. Pinned, it would cover about a tenth of a phone's screen, where it takes two rows. A pager that only sticks while the list scrolls past would still jump when paging scrolls the list's top into view.

## Consequences

- At 1366px one name is cut, and 79 forms have their types shortened or hidden, mostly long form names such as Paldean Tauros (Aqua Breed). The name column is narrowest on tablets: at 768px, 37 names are cut. On a 390px phone, 9 are.
- The driver checks that the pager's buttons sit in the same place on every page of the full list and of each category with a short last page, at every size, and that every name and its types keep to their lines.
- Ten rows and the pager fit 1366×768 in Windows fonts, with the pager ending at 736px. In the wider fonts on the CI's Linux runner, the text above the list wraps more and pushes it to 785px ([#17](https://github.com/mykhailoKar/pogo-stat-translation/issues/17)). That was already so before this change, so the driver prints where the pager ends as a note rather than failing on it.
- The page has hidden rows on short pages, so code reading the list should use `tr.row:not(.filler)`, as the driver does.
