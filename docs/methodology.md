# Methodology

How the pipeline turns main-series base stats into Pokémon GO stats and metrics. Code: `src/lib/` (pure, shared with the future site). Research behind it: [`research/`](research/README.md).

**Status:** the conversion and raw metrics are settled and validated against GO data. The headline score, GO Fit, is in [§7](#7-go-fit), and the site's ideal CP and categories are in [§8](#8-ideal-cp) and [§9](#9-categories). What's left is in [Open questions](#10-open-questions).

Figures below are for the pinned sources in `data/sources.lock.json`. The current numbers are always in [`data/reports/validation.md`](../data/reports/validation.md).

## 1. Conversion

`src/lib/formula.ts`, from [Bulbapedia, Stat (GO)] and research doc 1 §1:

```
higher, lower  = max/min of (Atk, SpA)            for Attack
               = max/min of (Def, SpD)            for Defense
SpeedMod m     = 1 + (Speed − 75) / 500
Attack         = round( round(2 × (7/8 × higher + 1/8 × lower)) × m × adj )
Defense        = round( round(2 × (5/8 × higher + 3/8 × lower)) × m × adj )
Stamina        = floor(50 + 1.75 × HP)              when adj = 1
               = round((50 + 1.75 × HP) × adj)      when adj ≠ 1
```

- **Rounding is half-up.** The data has 39 exact .5 ties at the final step, and 35 of them round up. The 4 that round down are listed exceptions (§4).
- **Integer arithmetic.** The 2× blend works in quarters, so exact ties are common. The code computes `(7·higher + lower) / 4` and `blend × (425 + Speed) × percent / 50000` in integers, so floating point can't round a tie the wrong way.
- **Stamina under an adjustment rounds, it doesn't floor.** The two research files disagreed here. Mega Rayquaza settles it: HP 105 at ×0.97 gives 226.74, GO has 227, and floor would give 226. Mega Mewtwo X/Y and the custom builds in research doc 2 agree.

## 2. Adjustment multiplier

Applied in this order (first match wins):

1. **Fixed value from `data/overrides.yaml` → `fixedAdjustment`.** Each was checked to reproduce GO's stats exactly.
   - ×0.97: Mega Rayquaza, Primal Kyogre, Primal Groudon (Bulbapedia); Mega Mewtwo X and Y (not in Bulbapedia's list, but only ×0.97 fits); Mega Zygarde (Dittobase, unreleased).
   - ×0.91 below the line: 10 unreleased Gen IX Pokémon (Walking Wake, Iron Leaves, Okidogi, Munkidori, Fezandipiti, Ogerpon, Gouging Fire, Iron Boulder, Iron Crown, Pecharunt).
   - ×1 above the line: 4 unreleased Gen IX Pokémon (Great Tusk, Iron Hands, Roaring Moon, Palafin Hero).
2. **Megas and Primals: ×1.**
3. **Everything else: ×0.91 if the uncut stats reach 4000 CP at level 40 with 15/15/15 IVs, otherwise ×1.**

The 14 Gen IX cases are datamined ahead of release (PvPoke `released: false`). Scopely Explore may change them at launch, which the refresh flow in [data-sources.md](data-sources.md#refreshing) catches.

## 3. Stat era

GO doesn't always use current main-series stats. `src/lib/stat-basis.ts` applies the rule from Bulbapedia:

| Form introduced in | GO uses stats from |
|---|---|
| Gen I–II | Gen VI |
| Gen III–VII | Gen VII |
| Gen VIII+ | Gen IX (current) |

- The generation comes from the **form's** introduction version group, not the species'. Mega Alakazam (a Gen VI form) uses Gen VII stats.
- Past values come from PokéAPI's `pokemon_stats_past.csv`, whose `generation_id` is the **last** generation that used a value. For a target generation, each stat takes the past value with the smallest `generation_id` at or after the target; otherwise the current value.
- Examples: Arbok uses its Gen VI Attack of 85 (167/153/155 in GO). Cresselia uses its pre-Gen IX defenses of 120/130 (152/258/260). Qwilfish follows the rule too: its Gen VI stats give 184/138/163, so it needs no exception.
- Overrides in `basisGeneration`:
  - Zacian and Zamazenta, both forms → **Gen VIII.** GO kept their Sword/Shield stats; Crowned Zacian's Attack 170 gives GO's 332.
  - Aegislash, both forms → **current stats.** It was added to GO in 2023, after the Gen VIII nerf.
- 17 dataset entries convert from an older stat era. Each one stores the stats used as `msGoBasis`.

## 4. Validation

`pipeline/report.ts` compares the prediction with PvPoke's GO stats for every entry that has GO data. Unexplained mismatches fail `npm test`, and off-by-one counts as a mismatch.

| Result | Entries |
|---|---:|
| Exact match | 1,205 (99.5%) |
| Listed exception | 6 |
| Unexplained | 0 |

The exceptions, all in `data/overrides.yaml` → `exceptions` with their GO values:

- **Shedinja:** Stamina is hand-set to 1 (the formula gives 51).
- **Melmetal:** Stamina is 264 instead of 260. Attack and Defense match the ×0.91 cut.
- **Togetic, Mantine, Skarmory, Miltank:** an exact .5 Attack tie that GO rounds down. These are the only ties with an Attack blend of exactly 150 (an 80/40 split). Every other tie rounds up.

## 5. Metrics

`src/lib/metrics.ts`, from research doc 2 §3. All metrics use 15/15/15 IVs.

```
CP           = max(10, floor((A+15) × √(D+15) × √(S+15) × CPM² / 10))
HP           = floor((S+15) × CPM)
Stat product = round((A+15)·CPM × (D+15)·CPM × HP)
Bulk         = round((D+15)·CPM × HP)
```

- **CPM values:** L40 = 0.79030001, L50 = 0.84029999, L51 = 0.84529999. These are the game master's 8-digit values. The rounded 0.7903/0.8403 values put stat product off by 1–2; these reproduce the research's figures exactly.
- **Per entry:** CP at L40, L50 and L51; uncapped stat product and bulk at L50.
- **GO stats used:** the actual GO stats where they exist, otherwise the prediction (`go.status = "predicted"`).
- **Percentile ranks** (`ranks.*Pct`, 0–100) for BST, CP at L50, stat product at L50 and GO Fit (§7), computed **within a pool**:
  - `standard`: everything except Megas and Primals,
  - `mega`: Megas and Primals.
  - Ties share the midpoint rank.

## 6. Form selection

`pipeline/select-forms.ts`:

1. Drop forms matching `excludeForms`: Gigantamax, Totem, cosplay and cap Pikachu, the Let's Go partner forms.
2. Keep a form if any of these hold:
   - it's a species default,
   - it's a regional form,
   - it has GO data,
   - it's in `includeForms`,
   - its stats differ from every form of the species already kept.
3. Drop the rest as duplicates. For example, the six other Minior core colours have the same stats as Red Core.

`data/reports/coverage.md` lists every dropped form, every ignored PvPoke entry, and every match that needed a rule.

## 7. GO Fit

`src/lib/go-fit.ts`. The headline score: how much of its potential GO output a form's stat shape reaches. It measures shape, not strength. [Decision 0005](decisions/0005-go-fit-headline-score.md) records why each rule is the way it is.

```
GO Fit = 100 × (A + 15) × (D + 15)  ÷  the same product for the best reshape

Reshape, tried for every Speed s from 1 to 255:
  shared points  = Atk + SpA + Def + SpD + Spe − s           (HP stays as it is)
  attack points  = shared points × (Atk + SpA) ÷ (Atk + SpA + Def + SpD), rounded
  defense points = the rest
  main stat      = the higher of each pair takes all it can, up to 255 (Atk or Def on a tie)
  secondary stat = what's left, at least 1
  convert with §1, using the form's own adjustment
```

`A` and `D` are GO Attack and Defense from the formula, using the stats from §3. This is the stat product from §5: HP and the adjustment are the same on both sides, so Stamina and CPM cancel and one score holds at every level.

**The score splits exactly into three parts**, where `A1` and `D1` are GO Attack and Defense with each pair concentrated but Speed unchanged:

```
Attack Fit  = (A + 15) ÷ (A1 + 15)
Defense Fit = (D + 15) ÷ (D1 + 15)
Speed Fit   = (A1 + 15) × (D1 + 15) ÷ the best reshape's product
GO Fit      = Attack Fit × Defense Fit × Speed Fit
```

**Example, Garchomp** (108/130/95/80/85/102, GO 261/193):

- Concentrated at Speed 102, it would be 386/237.
- Its best reshape is 108/247/212/1/1/31, which gives 395/243.
- GO Fit = (276 × 208) ÷ (410 × 258) = 54.3%, which is 68.8% × 82.5% × 95.5%.

**Rules:**

- **Total stat points are fixed.** More Speed always raises GO stats, so Speed only has an optimum if its points come from somewhere. It trades with attack and defense in proportion, so an attacker stays an attacker.
- **The best shape keeps the form's own adjustment.** It doesn't re-test the 4,000 CP line. For 458 forms the best shape would trip the ×0.91 cut in real GO, so it's a yardstick, not a buildable Pokémon. §8 shows what GO would make of it.
- **Formula stats on both sides,** even where GO differs. The 6 exceptions in §4 can't distort the score: Shedinja's hand-set Stamina of 1 plays no part.
- **Stored per entry:** `goFit.score`, `attackFit`, `defenseFit` and `speedFit` to one decimal, `goFit.best.ms` and `goFit.best.go`, `goFit.ideal` (§8), and `ranks.goFitPct`. The rank uses the stored score, so forms showing the same score share a rank.

**Estimating ideal Speed:** `(BST − HP − 425) / 2`, minimum 1. GO Attack and Defense both scale with points × (425 + Speed), and that product peaks when the two are equal. The estimate is off by 1.9 on average. It stops working once a main stat reaches 255, because spare points then flow into Speed; Mewtwo's ideal Speed is 141, not 74.

**How it behaves:**

- Scores run from 32.2 to 79.0 with a median of 50.8. Nothing gets near 100, because no real form leaves its secondary stats at 1, so the percentile matters as much as the percentage.
- Shape isn't strength. Bonsly tops the list at 79.0 and Mewtwo scores 54.0.
- Speed is usually overfunded: ideal Speed is 1 for 536 forms, and only 89 forms would want more Speed than they have.
- Weak forms score lower, and Speed Fit is the reason. The average is 46.6 below BST 300 and 55.4 at BST 700+. The correlation with BST is 0.70 for Speed Fit, against −0.08 for Attack Fit and −0.18 for Defense Fit. The effect is real rather than an artefact: 40% of Magikarp's stats are in Speed.
- Scoring a best shape again gives 98.6–100, not always exactly 100. The attack and defense split rounds to whole points, and the new spread's ratio can round one point differently.

## 8. Ideal CP

`goFit.ideal`, shown on the site as L50 CP ideal. It's the best shape run through GO's real rules, so the number is one GO could actually show:

```
ideal = convert goFit.best.ms with §1, using the form's real rule from §2
cpL50 = CP of ideal at level 50 with 15/15/15 (§5)
adjustment = the multiplier GO would apply to that shape
```

This is the one place the best shape re-tests the 4,000 CP line. GO Fit itself doesn't (§7): it compares both shapes under the form's own multiplier, so a score reflects shape alone.

- **458 forms are newly cut,** and none falls below its current CP, so no form needs special handling.
- **Garchomp:** 4,479 now, 6,179 ideal at 359/221/217. It would be 7,411 without the cut.
- **Mew:** 3,691 now, 5,971 ideal, also cut.
- **Slaking:** 5,010 now, 7,822 ideal. It's already cut, and its ideal keeps the ×0.91.
- **Mega Rayquaza:** 6,458 now, 10,815 ideal. Its fixed ×0.97 stays.

The best shape maximises stat product rather than CP, so this isn't the highest CP those points could reach.

**The Cut label** sits beside any CP on the site that includes a reduction, so it depends only on the multiplier:

| Column | Shown when | Forms |
|---|---|---:|
| L50 CP now | `goPredicted.steps.adjustment` < 1 | 62 (56 at ×0.91, 6 at ×0.97) |
| L50 CP ideal | `goFit.ideal.adjustment` < 1 | 520 (those 62, plus the 458 newly cut) |

Both multipliers reproduce GO's real stats (§4), so the label follows the game rather than the 4,000 CP line alone. Ten unreleased forms are cut below the line, and four are left uncut above it (§2).

## 9. Categories

`tags` come from `pipeline/dataset.ts`, and `inCategory` in `src/lib/list.ts` decides what each category shows.

| Category | Rule |
|---|---|
| All species | Every form |
| Legendaries | `legendary` tag |
| Megas + Primals | The `mega` pool |
| Mythicals | `mythical` tag |
| Starters | `starter` tag |
| Fully evolved | `fully-evolved` tag |

- **Legendary and mythical** are PokéAPI's species flags. Ultra Beasts and most Paradox Pokémon aren't flagged legendary, but Koraidon and Miraidon are.
- **`starter`** marks every form in the evolution chains listed under `starters` in `data/overrides.yaml`. That's 27 lines, with all stages and regional forms. Pikachu and Eevee are left out.
- **`fully-evolved`** marks a form when nothing evolves from its species, and every Mega and Primal. PokéAPI records evolution per species, so forms that can't evolve although their species can are listed under `finalForms`. Corsola is listed, for example, because only Galarian Corsola evolves.
- **Megas and Primals keep their species' tags,** so Mega Rayquaza appears under Legendaries, Mega Charizard X under Starters, and both under Fully evolved.
- **Percentile doesn't change between categories.** It's a form's rank in its pool (§7), so a form shows the same number everywhere, and a Mega's percentile compares it with other Megas and Primals only.

## 10. Open questions

- **Format lenses** (research doc 1 §3):
  - Great/Ultra League stat product needs a search over IVs and levels under the CP cap.
  - Raids need an Attack-weighted metric.
- **Shadow variants** (×1.2 Attack, ×0.833 Defense). Only `shadowAvailable` is stored so far.
- **Non-stat notes** such as lost abilities (Huge Power, Truant, Wonder Guard) and items. These should be an annotation layer, not part of the score.

Resolved in Phase 1: Stamina rounding under an adjustment (§1) and the headline score (§7). Resolved in Phase 2: how the site shows GO Fit ([decision 0006](decisions/0006-astro-site-inline-list-data.md)).

[Bulbapedia, Stat (GO)]: https://bulbapedia.bulbagarden.net/wiki/Stat_(GO)
