# Custom Stat-Product Builds: Attack-Weighted vs Wall

*PoGo project · Pokémon GO stat-conversion research · October 28, 2026*

This document records the custom-build experiments in this project: hypothetical Pokémon with a fixed main-series base stat total (BST) whose six stats were distributed to get the highest Pokémon GO stat product. It covers attack-weighted builds and wall-like builds at the same three BSTs, compares them with Mega Zygarde, and ends with a playbook of priorities for maxing stat product.

## 1. Key findings

- **The ×0.91 cut decides the archetype.** Up to BST 619, the highest stat product comes from a wall that stays just under 4,000 CP at level 40 and so avoids the cut. From BST 620 up, balanced builds that accept the cut win, and the gap widens fast: walls trail by 16% at 680, 33% at 754 and 37% at 778.
- **Maxing the main attack is almost free.** Locking Attack at 255 lands within 0.85% of the unconstrained optimum at 680, 0.33% at 754 and 0.03% at 778.
- **Maxing the main defense instead is the cheap bulk upgrade.** It costs 0.06–0.32% stat product versus maxing Attack and adds 5.5–11.4% bulk.
- **Walls buy bulk with stat product.** Cut-dodging walls carry 1.8–1.9× the bulk of the optimum (2.1–2.6× Mega Zygarde's) but 16–37% less stat product. The max-bulk fortress adds another 12–16% bulk and gives up about 90% of stat product.
- **Balance rule for builds that take the cut:** one attack stat, one defense stat, then main-series Attack ≈ Defense ≈ HP + 25, with Speed taking what's left. In GO terms, (Attack + 15) ≈ 1.4 × (Defense + 15) and (Stamina + 15) ≈ (1.4 ÷ SpeedMod) × (Defense + 15).
- **Against Mega Zygarde** (403/181/415, 20.9M stat product at level 50), the balanced builds at 754 and 778 win by 23% and 35%. The 680 builds trail by 9–10%, and every wall trails by 15–23%.

## 2. Ground rules

- **BSTs:** 680 (box-art legendary), 754 (Ultra Necrozma) and 778 (Mega Zygarde).
- **Limits:** every main-series stat between 1 and 255, as in the main games.
- **IVs:** 15/15/15 on every Pokémon, including Mega Zygarde and Crowned Zacian.
- **Objective:** highest stat product at level 50. Every build is also shown at level 40, level 51 (best buddy) and level 53 (the Super Max Mega bump).
- **Cut:** ×0.91 on all three GO stats whenever the uncut Pokémon would reach 4,000 CP at level 40 with 15/15/15 IVs.
- **Notation:** spreads are HP/Atk/Def/SpA/SpD/Spe; GO stats are Attack/Defense/Stamina.

## 3. How the conversion works

"Main" means the higher of the two attacking (or defending) stats and "secondary" the lower.

```
SpeedMod m   = 1 + (Speed − 75) / 500
Attack       = round( round(2 × (7/8 × main attack  + 1/8 × secondary attack))  × m × cut )
Defense      = round( round(2 × (5/8 × main defense + 3/8 × secondary defense)) × m × cut )
Stamina      = floor(50 + 1.75 × HP)        with the cut: round((50 + 1.75 × HP) × 0.91)
cut          = 0.91 if the uncut Pokémon reaches 4,000 CP at L40 with 15/15/15, otherwise 1
               (Mega Rayquaza and the Primals use 0.97; other Megas use 1)
CP           = floor( (A+15) × √(D+15) × √(S+15) × CPM² / 10 )
Stat product = (A+15)·CPM × (D+15)·CPM × floor((S+15)·CPM)
Bulk         = (D+15)·CPM × floor((S+15)·CPM)
CPM          = 0.7903 (L40), 0.8403 (L50), 0.8453 (L51), 0.8553 (L53)
```

| One main-series point in… | GO gain (before cut, m = 1) | Note |
|---|---|---|
| Main attack | +1.75 Attack | the strongest single point |
| Secondary attack | +0.25 Attack | worth 1/7 of a main-attack point |
| Main defense | +1.25 Defense | |
| Secondary defense | +0.75 Defense | worth 3/5 of a main-defense point |
| HP | +1.75 Stamina | Stamina also starts from a free 50 |
| Speed | +0.2% Attack and +0.2% Defense | about +0.38% stat product per point |

Two consequences shape everything below:

- **The cut is expensive.** It shrinks all three stats at once and removes about 23% of stat product.
- **CP counts Attack fully but Defense and HP only by square root.** Under a CP ceiling, each 1% of CP spent on Defense or HP returns 2% stat product, versus 1% for Attack. That's why a build pinned under 4,000 CP turns into a wall.

## 4. Method and checks

- **Search:** exhaustive over every spread at the given BST, with the cut test applied to each candidate. Secondary attack and defense only receive points once the main stat is at 255; splitting them earlier is always worse, which the checks below confirm.
- **Local check:** every reported spread was tested against all transfers of 1–6 points between any two stats and all pairs of one-point transfers. None improved.
- **Wasted points:** for the walls, an upper bound that allows deliberately wasted points (mixed splits that lower Attack to stay under the line) equals the reported walls, so wasting points can't help.
- **Levels:** spreads are optimal at level 50. HP rounds down differently at each level, so re-optimizing for level 40, 51 or 53 gains at most 0.26%, through a shift of a few points.
- **Rounding:** follows Dittobase's stat converter, which matched the in-app screenshots from this project (347/223/224 and 349/224/224).

## 5. Attack-weighted builds

### 5.1 Main attack locked at 255

| BST | Spread (HP/Atk/Def/SpA/SpD/Spe) | GO Atk/Def/Sta | CP at L40, uncut |
|---|---|---|---|
| 680 | 196/255/215/1/1/12 | 356/215/358 | 8,114 → ×0.91 |
| 754 | 201/255/231/1/1/65 | 399/259/366 | 9,978 → ×0.91 |
| 778 | 217/255/239/1/1/65 | 399/268/391 | 10,479 → ×0.91 |

| Build | Metric | L40 | L50 | L51 | L53 |
|---|---|---|---|---|---|
| BST 680 | CP | 6,786 | 7,672 | 7,764 | 7,949 |
| | Stat product | 15,668,703 | 18,858,832 | 19,205,870 | 19,912,665 |
| | Bulk | 53,440 | 60,493 | 61,242 | 62,753 |
| BST 754 | CP | 8,354 | 9,445 | 9,557 | 9,785 |
| | Stat product | 21,325,606 | 25,631,239 | 26,099,277 | 26,969,396 |
| | Bulk | 65,179 | 73,678 | 74,579 | 76,164 |
| BST 778 | CP | 8,764 | 9,908 | 10,027 | 10,265 |
| | Stat product | 23,416,433 | 28,210,441 | 28,714,588 | 29,740,838 |
| | Bulk | 71,570 | 81,091 | 82,052 | 83,991 |

- Secondary attack and secondary defense stay at 1. Every spare point goes to HP, main defense or Speed.
- Defense sits 19–30 points above HP.
- Speed is 12 at 680 and 65 at 754 and 778. Speed only pays once GO Defense is high, and at 680 there aren't enough points to get there.

### 5.2 Free optimum (nothing locked)

| BST | Spread (HP/Atk/Def/SpA/SpD/Spe) | GO Atk/Def/Sta | CP at L40, uncut |
|---|---|---|---|
| 680 | 201/227/220/1/1/30 | 330/229/366 | 7,832 → ×0.91 |
| 754 | 213/239/243/1/1/57 | 368/268/385 | 9,616 → ×0.91 |
| 778 | 213/254/243/1/1/66 | 398/273/385 | 10,474 → ×0.91 |

| Build | Metric | L40 | L50 | L51 | L53 |
|---|---|---|---|---|---|
| BST 680 | CP | 6,569 | 7,427 | 7,516 | 7,695 |
| | Stat product | 15,825,571 | 19,020,749 | 19,368,076 | 20,013,785 |
| | Bulk | 58,043 | 65,611 | 66,414 | 67,825 |
| BST 754 | CP | 8,048 | 9,098 | 9,207 | 9,426 |
| | Stat product | 21,392,240 | 25,715,395 | 26,177,225 | 27,117,414 |
| | Bulk | 70,675 | 79,902 | 80,856 | 82,781 |
| BST 778 | CP | 8,755 | 9,897 | 10,016 | 10,254 |
| | Stat product | 23,475,432 | 28,219,579 | 28,726,382 | 29,758,127 |
| | Bulk | 71,924 | 81,314 | 82,285 | 84,244 |

- Attack ends at 227, 239 and 254: close to 255, but not always there.
- The balance rule holds: (A+15)/(D+15) is 1.41, 1.35 and 1.43, and (S+15)/(D+15) is 1.56, 1.41 and 1.39 against 1.4 ÷ m of 1.54, 1.45 and 1.43.
- Gain over locking Attack: +0.86%, +0.33% and +0.03%.

## 6. Wall-like builds

Three steps toward bulk at the same BSTs, from mild to extreme.

### 6.1 Defense-maxed mirror (main defense locked at 255)

| BST | Spread (HP/Atk/Def/SpA/SpD/Spe) | GO Atk/Def/Sta | CP at L40, uncut |
|---|---|---|---|
| 680 | 184/227/255/1/1/12 | 317/255/339 | 7,660 → ×0.91 |
| 754 | 201/239/255/1/1/57 | 368/281/366 | 9,592 → ×0.91 |
| 778 | 213/239/255/1/1/69 | 377/288/385 | 10,190 → ×0.91 |

| Build | Metric | L40 | L50 | L51 | L53 |
|---|---|---|---|---|---|
| BST 680 | CP | 6,410 | 7,247 | 7,334 | 7,508 |
| | Stat product | 15,620,324 | 18,798,665 | 19,151,144 | 19,803,673 |
| | Bulk | 59,533 | 67,384 | 68,241 | 69,741 |
| BST 754 | CP | 8,033 | 9,081 | 9,190 | 9,409 |
| | Stat product | 21,312,822 | 25,615,874 | 26,083,631 | 26,953,229 |
| | Bulk | 70,413 | 79,593 | 80,567 | 82,280 |
| BST 778 | CP | 8,523 | 9,636 | 9,751 | 9,983 |
| | Stat product | 23,442,275 | 28,179,721 | 28,685,808 | 29,716,096 |
| | Bulk | 75,670 | 85,549 | 86,571 | 88,631 |

- Same regime as the attack builds (it takes the cut), with Attack trimmed to 227–239.
- Versus locking Attack: −0.32%, −0.06% and −0.11% stat product, for +11.4%, +8.0% and +5.5% bulk.

### 6.2 Cut-dodging wall (best stat product under 4,000 CP)

| BST | Spread (HP/Atk/Def/SpA/SpD/Spe) | GO Atk/Def/Sta | CP at L40, uncut |
|---|---|---|---|
| 680 | 255/75/255/1/1/93 | 137/332/496 | 3,997 (no cut) |
| 754 | 253/66/255/1/65/114 | 125/397/492 | 3,996 (no cut) |
| 778 | 255/63/255/1/85/119 | 121/417/496 | 3,990 (no cut) |

| Build | Metric | L40 | L50 | L51 | L53 |
|---|---|---|---|---|---|
| BST 680 | CP | 3,997 | 4,519 | 4,573 | 4,682 |
| | Stat product | 13,275,842 | 15,977,141 | 16,243,216 | 16,861,315 |
| | Bulk | 110,516 | 125,090 | 126,421 | 129,697 |
| BST 754 | CP | 3,996 | 4,518 | 4,571 | 4,680 |
| | Stat product | 14,410,174 | 17,350,163 | 17,639,681 | 18,270,486 |
| | Bulk | 130,241 | 147,483 | 149,057 | 152,582 |
| BST 778 | CP | 3,990 | 4,511 | 4,565 | 4,674 |
| | Stat product | 14,788,076 | 17,797,076 | 18,093,460 | 18,781,966 |
| | Bulk | 137,588 | 155,731 | 157,388 | 161,467 |

- HP and main defense sit at 255 (HP 253 at 754). Speed takes 93–119 points, and secondary defense takes the rest at 754 and 778 (65 and 85).
- Attack gets only the CP headroom left under the line: 63–75 points, which is GO Attack 121–137 and 3,990–3,997 CP at level 40.
- Stat product barely grows with BST: +11% from 680 to 778, against +48% for the free optimum. Extra points can't go into Attack without crossing the line.

### 6.3 Fortress (maximum bulk)

| BST | Spread (HP/Atk/Def/SpA/SpD/Spe) | GO Atk/Def/Sta | CP at L40, uncut |
|---|---|---|---|
| 680 | 255/1/255/1/101/67 | 2/389/496 | 482 (no cut) |
| 754 | 255/1/255/1/129/113 | 2/448/496 | 516 (no cut) |
| 778 | 255/1/255/1/141/125 | 2/468/496 | 527 (no cut) |

| Build | Metric | L40 | L50 | L51 | L53 |
|---|---|---|---|---|---|
| BST 680 | CP | 482 | 545 | 551 | 565 |
| | Stat product | 1,728,699 | 2,080,445 | 2,115,092 | 2,195,577 |
| | Bulk | 128,670 | 145,637 | 147,187 | 151,002 |
| BST 754 | CP | 516 | 583 | 590 | 604 |
| | Stat product | 1,981,157 | 2,384,273 | 2,423,979 | 2,516,218 |
| | Bulk | 147,461 | 166,906 | 168,682 | 173,054 |
| BST 778 | CP | 527 | 596 | 603 | 617 |
| | Stat product | 2,066,736 | 2,487,265 | 2,528,687 | 2,624,910 |
| | Bulk | 153,831 | 174,116 | 175,969 | 180,529 |

- Attack and secondary attack stay at 1, so GO Attack is 2.
- Once HP and Defense hit 255, Speed and secondary defense split the rest. A Speed point adds 0.2% of the whole defense blend, about 0.8 Defense here, which matches a secondary-defense point.
- Bulk is 12–16% above the cut-dodging walls, at the cost of about 90% of stat product.

### 6.4 Review: walls vs attack-weighted builds

All builds at level 50:

| Build | GO Atk/Def/Sta | CP | Stat product | Bulk |
|---|---|---|---|---|
| **BST 680** | | | | |
| Attack-max | 356/215/358 | 7,672 | 18,858,832 | 60,493 |
| Free optimum | 330/229/366 | 7,427 | 19,020,749 | 65,611 |
| Defense-max | 317/255/339 | 7,247 | 18,798,665 | 67,384 |
| Cut-dodging wall | 137/332/496 | 4,519 | 15,977,141 | 125,090 |
| Fortress | 2/389/496 | 545 | 2,080,445 | 145,637 |
| **BST 754** | | | | |
| Attack-max | 399/259/366 | 9,445 | 25,631,239 | 73,678 |
| Free optimum | 368/268/385 | 9,098 | 25,715,395 | 79,902 |
| Defense-max | 368/281/366 | 9,081 | 25,615,874 | 79,593 |
| Cut-dodging wall | 125/397/492 | 4,518 | 17,350,163 | 147,483 |
| Fortress | 2/448/496 | 583 | 2,384,273 | 166,906 |
| **BST 778** | | | | |
| Attack-max | 399/268/391 | 9,908 | 28,210,441 | 81,091 |
| Free optimum | 398/273/385 | 9,897 | 28,219,579 | 81,314 |
| Defense-max | 377/288/385 | 9,636 | 28,179,721 | 85,549 |
| Cut-dodging wall | 121/417/496 | 4,511 | 17,797,076 | 155,731 |
| Fortress | 2/468/496 | 596 | 2,487,265 | 174,116 |
| **Mega Zygarde** | 403/181/415 | 8,568 | 20,883,740 | 59,456 |

| Build | SP vs optimum | Bulk vs optimum | SP vs Mega Zygarde | Bulk vs Mega Zygarde |
|---|---|---|---|---|
| **BST 680** | | | | |
| Attack-max | −0.85% | −7.8% | −9.7% | +1.7% |
| Free optimum | — | — | −8.9% | +10.4% |
| Defense-max | −1.17% | +2.7% | −10.0% | +13.3% |
| Cut-dodging wall | −16.00% | +90.7% | −23.5% | +110.4% |
| Fortress | −89.06% | +122.0% | −90.0% | +144.9% |
| **BST 754** | | | | |
| Attack-max | −0.33% | −7.8% | +22.7% | +23.9% |
| Free optimum | — | — | +23.1% | +34.4% |
| Defense-max | −0.39% | −0.4% | +22.7% | +33.9% |
| Cut-dodging wall | −32.53% | +84.6% | −16.9% | +148.1% |
| Fortress | −90.73% | +108.9% | −88.6% | +180.7% |
| **BST 778** | | | | |
| Attack-max | −0.03% | −0.3% | +35.1% | +36.4% |
| Free optimum | — | — | +35.1% | +36.8% |
| Defense-max | −0.14% | +5.2% | +34.9% | +43.9% |
| Cut-dodging wall | −36.93% | +91.5% | −14.8% | +161.9% |
| Fortress | −91.19% | +114.1% | −88.1% | +192.8% |

When walls win, by BST (stat product at level 50):

| BST | Best build taking the cut | Best wall under 4,000 CP | Winner (lead) |
|---|---|---|---|
| 560 | 11,157,286 | 12,728,641 | Wall (+14.1%) |
| 580 | 12,273,857 | 13,430,243 | Wall (+9.4%) |
| 600 | 13,440,304 | 14,060,984 | Wall (+4.6%) |
| 610 | 14,056,004 | 14,386,378 | Wall (+2.4%) |
| 619 | 14,631,677 | 14,645,799 | Wall (+0.1%) |
| 620 | 14,697,456 | 14,645,799 | Cut (+0.4%) |
| 640 | 16,028,298 | 15,121,699 | Cut (+6.0%) |
| 660 | 17,477,488 | 15,546,997 | Cut (+12.4%) |
| 680 | 19,020,749 | 15,977,141 | Cut (+19.0%) |
| 700 | 20,669,304 | 16,320,625 | Cut (+26.6%) |
| 754 | 25,715,395 | 17,350,163 | Cut (+48.2%) |
| 778 | 28,219,579 | 17,797,076 | Cut (+58.6%) |

- **At 680–778, no wall can match the builds that take the cut on stat product.** The 4,000 line caps walls near 16–18M, while the balanced builds keep climbing with BST.
- **Walls are the bulk template.** They reach the maximum Stamina (496) and Defense of 332–417, so they're the right shape when surviving hits matters more than stat product.
- **The Defense-max mirror is the efficient middle ground:** near-identical stat product to the attack builds, with measurably more bulk.

## 7. Comparison with Mega Zygarde

Mega Zygarde is 216/70/91/216/85/100 in the main series (BST 778). Dittobase lists its GO line as 403/181/415, which matches the ×0.97 adjustment; it is not yet released in GO.

| Mega Zygarde | Metric | L40 | L50 | L51 | L53 |
|---|---|---|---|---|---|
| 403/181/415 | CP | 7,579 | 8,568 | 8,670 | 8,877 |
| | Stat product | 17,346,666 | 20,883,740 | 21,250,085 | 21,995,578 |
| | Bulk | 52,511 | 59,456 | 60,141 | 61,523 |

It converts poorly: its 70 Attack counts for only 1/8, and its 91/85 defenses leave GO Defense at 181, so nearly all of its bulk comes from HP. The "vs Mega Zygarde" columns in section 6.4 compare every custom build against it.

**Under Mega rules there is no line to dodge.** Megas use ×1, and Mega Zygarde is listed at ×0.97, so walls lose their only advantage. The best 778 builds under those adjustments:

| Adjustment | Best spread | GO Atk/Def/Sta | L50 CP | Stat product | Bulk | SP vs Mega Zygarde |
|---|---|---|---|---|---|---|
| ×0.97 | 217/251/239/1/1/69 | 422/288/417 | 11,163 | 33,939,028 | 92,424 | +62.5% |
| ×1 | 220/246/239/1/1/71 | 428/298/435 | 11,739 | 37,009,105 | 99,419 | +77.2% |

## 8. Priority strategies for maxing stat product

### 8.1 What matters most

What each decision costs when it goes wrong, against the best build at the same BST. Ranges cover 680, 754 and 778 unless noted.

| Decision | Wrong choice | Cost |
|---|---|---|
| Regime: take the cut or stay under 4,000 CP | Wall at 680–778 | 16–37% |
| | Taking the cut at BST 600 | 4.4% |
| Concentrate offense | Atk = SpA | 25–40% |
| Concentrate defense | Def = SpD | 19% |
| Feed HP | HP fixed at 100 | 14–18% |
| Don't overfeed HP | HP fixed at 255 | 1–3% |
| Speed | Speed 1 | 0.7–4.5% |
| | Speed 150 | 4–11% |
| Which stat to lock at 255 | Attack / Defense | up to 0.85% / 1.17% |
| Level fine-tuning | Using the L50 spread at L40, 51 or 53 | up to 0.26% |

### 8.2 Playbook when the cut applies (BST 620 and up)

1. **Concentrate offense.** Put all attacking points into one stat; the other stays at 1.
2. **Concentrate defense.** Put all defending points into one stat; the other stays at 1 until the main one reaches 255.
3. **Balance Attack, Defense and HP.** In main-series points, Attack ≈ Defense ≈ HP + 25. To check in GO terms: (A+15) ≈ 1.4 × (D+15) and (S+15) ≈ (1.4 ÷ m) × (D+15). Both ratios come from what one point buys: 1.75 Attack, 1.25 Defense or 1.75 Stamina, with Speed multiplying only Attack and Defense.
4. **Add Speed last.** A Speed point adds about 0.38 ÷ m percent stat product at any BST, while a main-defense point adds about 114 × m ÷ (D+15) percent. They break even when GO Defense + 15 ≈ 300 × m², which is why optimal Speed rises from 30 at 680 to 57–66 at 754–778.
5. **Overflow order.** When a stat hits 255, extra points go to the other main stats and Speed first, then secondary defense. Secondary attack is last.
6. **Pick the locked stat for identity, not stat product.** Locking Attack costs up to 0.85%; locking Defense costs up to 1.17% and adds 5–11% bulk over the attack version.
7. **Fine-tune for your level.** Re-optimizing for level 40, 51 or 53 gains up to 0.26%.

### 8.3 Playbook when staying under 4,000 CP (BST 619 and below, or when bulk is the goal)

1. **Pour points into main defense and HP.** Under the CP ceiling they return twice the stat product per CP that Attack does.
2. **Give Attack only the headroom.** Fill Attack until the build sits at 3,990–3,999 CP at level 40 with 15/15/15 IVs. Across BST 560–778 that's 63–118 main-series points.
3. **Add Speed and secondary defense once HP and Defense reach 255,** which happens around BST 620.
4. **Never cross the line.** One CP over 3,999 triggers the cut and costs about 23%.

### 8.4 In one line

Concentrate, balance, then Speed: one attack stat, one defense stat, Attack ≈ Defense ≈ HP + 25, Speed with what's left. Below BST 620, trade Attack for bulk to stay under 4,000 CP.

## 9. Caveats

- These are hypothetical spreads. Real performance also depends on moves, typing and energy gain.
- The cut test (4,000 CP at level 40 with 15/15/15) and the 0.97 and 1 Mega adjustments follow Bulbapedia. Mega Zygarde's GO line is Dittobase's for an unreleased form.
- Level 53 uses the game's CP multiplier table (0.8553). Powering up stops at 50; level 51 is the best-buddy boost and 53 is the Super Max Mega bump discussed in this project.
- Rounding follows Dittobase; other calculators may differ by a point on individual stats.
- The research PDF in this project lists Crowned Sword Zacian at 295 Attack. Its actual GO line is 332/240/192.

## Appendix A. Earlier experiments in this project

| Build | Spread | GO Atk/Def/Sta | L50 CP | Stat product | Bulk |
|---|---|---|---|---|---|
| 600 · Build 1 (Dittobase) | 112/255/230/1/1/1 | 347/223/224 | 6,096 | 12,167,020 | 39,998 |
| 600 · Build 2 (Dittobase) | 112/240/215/1/1/31 | 349/224/224 | 6,142 | 12,285,646 | 40,166 |
| 600 · best at 349 Attack | 157/251/179/1/1/11 | 349/179/296 | 6,313 | 13,014,046 | 42,548 |
| 600 · wall (true optimum) | 237/105/255/1/1/1 | 157/273/464 | 4,510 | 14,060,984 | 97,287 |
| 680 · GO Attack fixed at 420 | 157/255/175/1/1/91 | 420/207/296 | 8,070 | 17,797,191 | 48,689 |
| 754 · GO Attack fixed at 420 | 190/255/216/1/1/91 | 420/255/348 | 9,615 | 25,294,237 | 69,199 |
| Crowned Sword Zacian (real) | — | 332/240/192 | 5,629 | 10,808,974 | 37,070 |

- The 600 BST wall was the first sign that dodging the cut can beat raw Attack.
- Fixing GO Attack at exactly 420 forced Speed to 91, the only value that hits 420 with 255 Attack. That cost 6.4% at 680 and 1.6% at 754 against the free optimum.

## Sources

- Bulbapedia, [Stat (GO)](https://bulbapedia.bulbagarden.net/wiki/Stat_(GO)): conversion formulas and adjustments.
- Dittobase, [Stat Converter](https://www.dittobase.com/pokemon-go/stat-converter): rounding conventions.
- Dittobase, [Mega Zygarde](https://www.dittobase.com/pokemon-go/pokedex/zygarde-mega): GO stats 403/181/415, max CP 8,568.
