# Research

Source research for the project, kept as written. The files are unchanged copies; only the first was renamed to kebab-case. Corrections go in the errata below, not in the files.

## Files

- **[from-six-stats-to-three-2026.md](from-six-stats-to-three-2026.md).** How GO collapses six main-series stats into three:
  - the conversion formula and its adjustments,
  - what the formula rewards and punishes (Speed, the 7/8–1/8 and 5/8–3/8 blends, the +50 Stamina floor, lost abilities),
  - the ideal main-series spread for each format (raids, gyms, Max Battles, Great/Ultra/Master League),
  - example Pokémon for each.

  This is the basis for `docs/methodology.md` and for Phase 2's format lenses.
- **[custom-build-stat-product-study.md](custom-build-stat-product-study.md).** Hypothetical spreads at BST 680, 754 and 778 that maximise GO stat product. It covers attack-weighted builds, wall builds and the ×0.91 cut, compares them with Mega Zygarde, and ends with a playbook. Its golden values (GO lines, CP, stat product, bulk) are the unit tests in `tests/formula.test.ts` and `tests/metrics.test.ts`.

## Known errata

Found by checking the research against the pinned GO data (PvPoke `e02bde7`). New findings from the pipeline's validation report get added here.

| File, section | Says | Data says |
|---|---|---|
| six-stats §1 | Stamina = floor((50 + 1.75 × HP) × Adjustment) | Rounds when the adjustment ≠ 1: Mega Rayquaza is 227, floor gives 226. The study's formula is right |
| six-stats §1 | ×0.97 applies to Mega Rayquaza, Primal Groudon, Primal Kyogre | Also Mega Mewtwo X and Y (399/215/228 and 413/223/228 need ×0.97) |
| six-stats §1 | ×0.91 iff uncut CP ≥ 4000 at L40 | Holds for released Pokémon. 10 unreleased Gen IX Pokémon are cut below the line, 4 are left uncut above it |
| six-stats §1 | Gen VIII onward use Gen IX stats | Zacian and Zamazenta (all forms) use Gen VIII stats; Aegislash (a Gen VI species) uses current stats |
| six-stats §1 | Qwilfish "was never updated" after its Gen VII buff | The Gen I–II → Gen VI rule already gives 184/138/163; no special case needed |
| six-stats §1 | Shedinja: floor(1.75 × 1 + 50) = 52 | floor gives 51 (52 is rounding); GO's 1 is hand-set either way |
| six-stats §1, §4 | Crowned Zacian 295 Attack | 332/240/192 (the study already corrects this, §9) |
| six-stats §2 | Vaporeon has 25–30% more CP than Jolteon | 3,521 vs 3,265 at L50: 7.8% more |
| six-stats §3 | Medicham maxes at 1,431 CP, so it never reaches the 1,500 cap | 1,431 is level 40; at level 50 it reaches 1,618 |
| six-stats §4 | Mega Rayquaza GO Attack 366 | 377 |
| six-stats §4 | Registeel ~118/243/197 | 143/285/190 |
| six-stats §4 | Dragonite ~234/179/188 | 263/198/209 |
| six-stats caveats | Slaking Max CP 5,010 vs ~5,069 "from some aggregators" | Both right: 5,010 at L50, 5,069 at L51 (best buddy) |

Checked and correct: the Dittobase worked example; Espeon 261 vs Machamp 234; Blissey 129/169/496; Slaking 290/166/284; Regigigas 287/210/221 (4,913); all four Deoxys formes and their Max CPs; Azumarill, Medicham, Bastiodon and Cresselia lines; Shedinja 153/73/1 (445 CP); Mega Zygarde 403/181/415; every custom-build figure tested in `tests/`.
