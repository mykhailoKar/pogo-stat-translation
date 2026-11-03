# Methodology

How the pipeline turns main-series base stats into Pokémon GO stats and metrics. Code: `src/lib/` (pure, shared with the future site). Research behind it: [`research/`](research/README.md).

**Status (Phase 1):** the conversion and raw metrics are settled and validated against GO data. The headline grade is not decided yet; see [Open questions](#7-open-questions-for-phase-2).

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

The 14 Gen IX cases are datamined ahead of release (PvPoke `released: false`). Niantic may change them at launch, which the refresh flow in [data-sources.md](data-sources.md#refreshing) catches.

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
- **Percentile ranks** (`ranks.*Pct`, 0–100) for BST, CP at L50 and stat product at L50, computed **within a pool**:
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

## 7. Open questions for Phase 2

- **Headline grade.** The core of the app is how much main-series strength survives into GO. Decide:
  - which GO strength (CP at L50 or stat product at L50, or both as separate lenses),
  - which main-series strength (current BST or the stat-era BST),
  - delta or ratio, and grade cutoffs.
  - Phase 1 already stores both percentile ranks to make this cheap.
- **Format lenses** (research doc 1 §3):
  - Great/Ultra League stat product needs a search over IVs and levels under the CP cap.
  - Raids need an Attack-weighted metric.
- **Shadow variants** (×1.2 Attack, ×0.833 Defense). Only `shadowAvailable` is stored so far.
- **Non-stat notes** such as lost abilities (Huge Power, Truant, Wonder Guard) and items. These should be an annotation layer, not part of the score.

Resolved in Phase 1: Stamina rounding under an adjustment (§1).

[Bulbapedia, Stat (GO)]: https://bulbapedia.bulbagarden.net/wiki/Stat_(GO)
