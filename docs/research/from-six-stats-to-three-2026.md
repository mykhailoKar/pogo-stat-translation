# How Main-Series Stat Distributions Translate to Pokémon GO: The Ideal Spread for Every Format (2026)

## TL;DR
- Pokémon GO collapses six main-series stats into three (Attack, Defense, Stamina) using a fixed, asymmetric formula that heavily rewards one big offensive stat, balanced dual defenses, high HP, and high Speed — and completely ignores abilities and held items. The single best-converting main-series profile depends on format: **glass-cannon "one huge offensive stat + high Speed" for raids**, **low-Attack / high-balanced-bulk for capped PvP (Great/Ultra)**, and **highest raw totals plus Speed for uncapped Master League**.
- The formula's biggest winners are Pokémon whose main-series power is gated by bad abilities (Slaking/Truant and Regigigas/Slow Start convert their full 670 BST into elite GO stats), and the biggest losers rely on abilities/items (Medicham/Pure Power and Azumarill/Huge Power lose the doubling of their Attack; Shedinja loses Wonder Guard and is left with a hand-set 1 HP).
- As of 2026, standout "ideal-spread" performers include **Mega Rayquaza (the #1 overall raid attacker), Shadow Mewtwo, Eternatus and Deoxys-Attack** (raids), **Blissey and Snorlax** (gym defense), **Gigantamax attackers + Blissey tanks** (Max Battles), **Medicham/Azumarill/Registeel/Galarian Stunfisk** (Great League), **Cresselia/Giratina-Altered/Registeel** (Ultra League), and **Crowned Sword Zacian, Dialga, Groudon, Kyogre, Dragonite** (Master League).

## Key Findings

1. **The conversion formula is confirmed and asymmetric.** GO Attack takes 7/8 of your higher offensive stat and only 1/8 of the lower; GO Defense uses a gentler 5/8–3/8 blend of the two defensive stats; both are then scaled by a Speed multiplier; Stamina is a flat function of HP. This means one high attacking stat converts almost fully, mixed attackers waste their second stat, lopsided defenses are punished, and low-HP Pokémon are propped up by a +50 floor.
2. **Speed is invisible but doubly powerful.** It multiplies both Attack and Defense, so fast Pokémon (Espeon, Mewtwo, Deoxys) gain on both ends while slow ones (Machamp, Lugia's Attack) are quietly taxed.
3. **CP weights Attack linearly but Defense and Stamina under square roots.** This is the single most important fact for understanding both raids (Attack is king) and capped PvP (low Attack IVs let you buy more total bulk under the cap).
4. **Abilities and items don't exist in GO.** This creates dramatic over- and under-performers relative to main-series Base Stat Total (BST).
5. **The "ideal distribution" is format-specific** — there is no single best spread. The rest of this report derives the ideal for each context and names the Pokémon that match it.

## Details

### 1. How GO derives its three stats from the six main-series stats

Pokémon GO keeps only **Attack, Defense, and Stamina (HP)**, discarding the physical/special split and Speed as standalone stats.\[1\] The current (post-November 2018) formulas, confirmed by Bulbapedia's "Stat (GO)" page (last edited October 1, 2025), Pokémon GO Hub, and the Dittobase stat converter,\[1\] are:

- **Attack** = round( round( 2 × (7/8 × max(Atk, SpA) + 1/8 × min(Atk, SpA)) ) × SpeedMod × Adjustment )
- **Defense** = round( round( 2 × (5/8 × max(Def, SpD) + 3/8 × min(Def, SpD)) ) × SpeedMod × Adjustment )
- **SpeedMod** = 1 + (Speed − 75) / 500
- **Stamina** = floor( (50 + 1.75 × HP) × Adjustment )

The user's stated formula is **correct**. The 2× term simply doubles the blend before rounding; equivalently, Attack ≈ 1.75×(higher offensive stat) + 0.25×(lower offensive stat).

**Worked example (Dittobase converter, a 108/130/95/80/85/102 spread):** Attack blend = round(2×(7/8×130 + 1/8×80)) = round(247.5) = 248; SpeedMod = 1 + 27/500 = 1.054; final Attack = round(248×1.054) = 261. Defense blend = round(2×(5/8×95 + 3/8×85)) = round(182.5) = 183; final Defense = round(183×1.054) = 193. Stamina = round(50 + 1.75×108) = 239.\[2\]

**The Adjustment ("nerf") factor** (Bulbapedia, verbatim):
- **×0.91** if the Pokémon would have a CP ≥4000 at level 40 with max IVs, **or if it is Armored Mewtwo**.\[3\]
- **×0.97** if the Pokémon is **Mega Rayquaza, Primal Groudon, or Primal Kyogre**.\[3\]
- **×1** if Mega Evolved and not listed above, and in all other cases.\[3\]

**The CP formula** (Bulbapedia): CP = floor( (Attack × √Defense × √Stamina × CPM²) / 10 ), with a floor of 10. Because **Attack enters linearly while Defense and Stamina are under square roots**, Attack has an outsized effect on CP\[3\] — the pivotal fact for both raids and PvP.

**Historical changes.** Before the November 14, 2018 rebalance (rolled out alongside Gen 4), Stamina was simply 2×HP and the Defense blend used the same lopsided 7/8–1/8 as Attack. The update changed Stamina to floor(1.75×HP + 50) — a flat +50 buff that helped low-HP Pokémon and slightly nerfed the highest-HP ones (Blissey's base Stamina went from 510 to 496, a 2.75% cut)\[4\] — and softened the Defense blend to 5/8–3/8, which universally trimmed the highest Defense stats.\[2\]

**Which generation's stats GO uses** (Bulbapedia): Pokémon/forms from Gens I–II use their **Gen VI** base stats; Gens III–VII use their **Gen VII** stats; Gen VIII onward use their **Gen IX** stats.\[3\] So GO generally does reflect later base-stat buffs — with exceptions. The cleanest documented one: **Qwilfish and Hisuian Qwilfish have different GO base stats despite identical main-series stats**, because Qwilfish existed in GO before its Gen VII buff\[3\] and was never updated (Bulbapedia trivia). Their GO lines differ only in Defense (roughly 184/138/163 vs. 184/151/163).

**Hand-set / special-case stats:**
- **Shedinja** is the canonical outlier: its Stamina is **hand-set to 1** instead of the formula's floor(1.75×1+50)=52. Its GO line is roughly 153 Attack / 73 Defense / 1 Stamina, Max CP ~445.\[5\] (It also cannot be used in Trainer Battles.)
- **Mega Evolutions and Primal Reversions** each carry their own main-series base stats and run through the same conversion\[2\] (with the ×0.97 or ×1 adjustment noted above).
- **Crowned Sword Zacian and Crowned Shield Zamazenta** are special forms with their own tuned stats. Crowned Sword Zacian's GO base stats are **295 Attack / 240 Defense / 192 Stamina**, with a maximum CP of 4979 at Level 40 and **5629 at Level 50** (Pokémon GO Hub). Crowned Shield Zamazenta trades a little Attack (~1.5% less) for a large flat Defense boost.
- **Eternatus, Dynamax/Gigantamax forms** are handled as their own entries; Gigantamax forms use fixed signature G-Max moves\[6\] rather than a different base-stat rule.

### 2. What the formula rewards and punishes

**Speed's double boost.** Speed doesn't appear as a stat, but SpeedMod multiplies both Attack and Defense. Above 75 Speed is a net bonus; below 75 is a penalty.\[2\] The classic illustration is **Espeon vs. Machamp**: both have a 130/65 higher/lower offensive split, but Espeon's 110 Speed vs. Machamp's 55 Speed gives Espeon a markedly higher GO Attack (Espeon 261 vs. Machamp 234). Jolteon is another victim of losing its Speed-based identity: a Vaporeon converts far more efficiently (25–30% more CP) than a Jolteon evolved from the same Eevee.

**The 7/8–1/8 attack weighting.** One dominant offensive stat translates almost fully; the second attacking stat barely matters. This is why pure special attackers (Alakazam, Gengar) and pure physical attackers (Rampardos, Rhyperior) convert cleanly, while mixed attackers gain little from balancing.

**The 5/8–3/8 defense weighting.** This favors Pokémon with two solid defenses and punishes lopsided ones. Chansey/Blissey's tiny physical Defense (10) drags their GO Defense down despite huge Special Defense; Cloyster and Steelix's one-sided defenses are similarly discounted.

**The +50 Stamina floor** compresses HP differences: it hands low-HP Pokémon a big relative boost and shrinks the advantage of HP monsters. Blissey (255 HP) still leads at 496 Stamina,\[7\] but the gap to mid-HP Pokémon is much smaller than 1.75× alone would produce.

**No abilities or held items.** This is where main-series identity is made or broken:
- **Freed by GO (overperformers):** **Slaking** (main-series BST 670, crippled by *Truant*) converts to **290 Attack / 166 Defense / 284 Stamina, Max CP 5,010** at Level 50 (Go Silph) — one of the highest Attack stats in the game. **Regigigas** (BST 670, gated by *Slow Start*) converts to **287 / 210 / 221, Max CP ~4,913**. **Archeops** (*Defeatist*) likewise keeps its full offensive stats. GO ignores the crippling ability entirely — though in practice both Slaking and Regigigas are held back by weak movepools rather than by the ability.
- **Broken by GO (underperformers):** **Medicham** (*Pure Power*) and **Azumarill** (*Huge Power*) lose the ability that doubles their Attack; GamePress notes Medicham's GO base stats end up "less than Spoink's"\[8\]\[9\] (roughly 121 Attack). **Shedinja** loses *Wonder Guard* and is left as a 1-HP shell. Item-reliant Pokémon lose too: **Pikachu** without Light Ball keeps a weak Attack, and **Chansey** without Eviolite is far less bulky than its main-series niche (and is eclipsed by Blissey).

**The Deoxys forms** are a perfect controlled demonstration. All four share main-series HP 50, so all four have GO Stamina 137, but their offensive/defensive spreads diverge wildly:

| Deoxys forme | GO Attack | GO Defense | GO Stamina | Max CP | GO role |
|---|---|---|---|---|---|
| Attack | 414 | 46 | 137 | 2916 | Extreme glass cannon (highest clean Attack in the game) |
| Normal | 345 | 115 | 137 | 3573 | Balanced but outclassed |
| Speed | 230 | 218 | 137 | 3255 | Mediocre everywhere (Speed does nothing in GO) |
| Defense | 144 | 330 | 137 | 2570 | Best forme; PvP wall via Counter |

GamePress captures the trap of Deoxys-Attack bluntly: "I see you there eyeing up that 414 base attack stat... its defense stat; It's 46." A single charged move ends it.

**Lugia** shows Speed lifting Defense: its 110 Speed pushes an already-high defensive spread (Def 130 / SpD 154) to one of the best Defense/bulk combinations in the game — it possesses the game's highest bulk and stat product — while its middling offensive stats keep it a defensive specialist rather than a DPS threat.

**Registeel** exemplifies balanced bulk: two high, near-equal defensive stats (150/150) convert extremely well under the 5/8–3/8 blend, giving it elite GO Defense (~243) that has anchored it in Great and Ultra League for years.

### 3. The ideal main-series stat distribution for each context

**PvE — Raids (DPS/TDO).** With no CP cap, raids reward raw damage. The ideal main-series profile is **one enormous offensive stat + high Speed + just enough HP/Defense to survive**. Because CP and damage weight Attack linearly, glass cannons dominate the DPS³×TDO / eDPS metrics used by Pokebattler, GamePress, and Dittobase. Shadow forms (×1.2 Attack, ×0.833 Defense)\[10\]\[11\] push this further — a 0/0/0 Shadow Mewtwo out-damages a 15/15/15 non-Shadow one because 1.2×300 = 360 > 315.\[12\] Best-converting spreads: high SpA/Atk with Speed ≥100.

**PvE — Gyms.** *Attacking* gyms mirrors raids (high Attack). *Defending* gyms rewards the opposite: maximum Stamina and balanced Defense to waste attackers' time (gym defenders also get 2× HP). The ideal main-series profile for a defender is **huge HP + two solid defenses** — exactly Blissey (255 HP), Snorlax (160 HP), and Chansey. Pokémon GO Hub lists only Blissey and Chansey as S-tier gym defenders, noting Blissey's "bulk is comparable to two Pokémon in one."

**PvE — Max Battles (Dynamax/Gigantamax).** These split into two roles with **different ideal stats** (PokéWestHills, Switchblade guides). **Attackers** want high Attack to maximize Max Move damage (Max Move power scales with Attack), favoring Gigantamax forms with fixed high-power G-Max moves.\[6\] **Chargers/Tanks** want high Defense + HP and defensive typing to survive and charge the Max meter with a 0.5-second fast move, then deploy Max Guard/Max Spirit. So the ideal Max-Battle spread is bimodal: glass-cannon offense for the Max phase, fortress bulk for the charging phase. (Note: Shadow, Mega, and Primal Pokémon cannot Dynamax.)

**Great League (1500 CP cap).** Under a cap, the goal flips from raw CP to **stat product** (effective Atk × Def × HP at the highest level reachable under the cap). Because Attack costs the most CP (the linear term), the ideal profile is **relatively low Attack + high, balanced Defense and HP** — this lets a Pokémon level higher under 1500 and accumulate more total stats (e.g., a 0/15/15 spread usually beats 15/15/15). Crucially, the Pokémon still needs enough total stats to *reach* 1500 by the level cap (Level 50/51 with XL Candy), or the cap never constrains it — Medicham, for instance, maxes at just 1,431 CP, so its Attack-IV penalty barely applies. Speed's double boost slightly *raises* CP for a given bulk, so under a cap ultra-fast Pokémon get marginally less bulk — a mild disadvantage. **Charged Move Priority (CMP)** ties go to the higher Attack stat,\[13\] and **Shadow (×1.2 Atk / ×0.833 Def)** and **Purified (+2 IVs, cheaper, always Level 25)** shift the trade-off.

**Ultra League (2500 CP cap).** Same stat-product logic, but the higher cap lets bulkier and legendary Pokémon express their full spreads. Ideal profile: **big balanced bulk with moderate Attack**, plus enough total stats to reach 2500.

**Master League (no cap).** With no cap, the trade-off disappears entirely: you simply want the **highest raw totals**, and 15/15/15 IVs are optimal.\[14\] Speed's double boost is a pure positive here. The ideal profile is **high across the board with a strong Attack**, which is why the format is dominated by 600+ BST legendaries and pseudo-legendaries.

> **A caveat worth stating plainly:** movesets (fast-move energy generation, charged-move damage and cost, and typing) frequently matter as much as or more than stats. Chansey has the best Great League stat product in the game and is still unplayable because it has no good moves. Stat distribution sets the ceiling; moves and typing decide whether a Pokémon reaches it.

### 4. Example Pokémon for each context (main-series vs GO stats)

**Raids (DPS specialists — one huge offensive stat + Speed):**

| Pokémon | Main-series (HP/Atk/Def/SpA/SpD/Spe) | GO Attack | Why it converts well |
|---|---|---|---|
| Mega Rayquaza | 105/180/100/180/100/115 | 366 (highest of any Mega) | #1 overall raid attacker (Dittobase, updated Sep 13 2026: 27.21 DPS, 469.1 TDO, 23.91 eDPS, 100%); twin 180 offenses + 115 Speed |
| Shadow Mewtwo | 106/110/90/154/90/130 | 300 base ×1.2 = 360 effective | Highest non-Mega Attack; 130 Speed; huge coverage movepool |
| Deoxys-Attack | 50/150/50/180/20/150 | 414 | Highest clean Attack; 150 Speed; pure nuke |
| Eternatus | 140/85/95/145/95/130 | best non-Mega generalist | High SpA + 130 Speed; Dynamax Cannon |
| Rampardos / Rhyperior | very high physical Atk | very high GO Atk | Pure physical attackers convert fully |

**Gym defense (huge HP + balanced defense):** Blissey (255/10/10/75/135/55 → 129/169/496), Snorlax (160 HP → 330 Stamina), Chansey. Their main-series HP monsters translate into the highest Stamina in the game.

**Max Battles:** *Attackers* — Gigantamax Machamp, Gigantamax Gengar, Gigantamax Kingler, Gigantamax Rillaboom, Gigantamax Cinderace, Gigantamax Inteleon, plus Crowned Sword Zacian and Eternatus (the top overall Max attacker, ~433 Max Move damage per Dittobase). *Tanks/Chargers* — Blissey (huge HP wall), Metagross and Excadrill (Steel bulk + resistances).

**Great League (low Attack + balanced bulk):**

| Pokémon | Main-series | GO (Atk/Def/Sta) | Why it works |
|---|---|---|---|
| Registeel | 80/75/150/75/150/50 | ~118/243/197 | Twin 150 defenses convert beautifully; elite wall (PvPoke #1 GL as of recent seasons) |
| Azumarill | 100/50/80/60/80/50 | ~112/152/225 | Water/Fairy typing + bulk; Huge Power loss doesn't matter under a cap |
| Medicham | 60/60/75/60/75/80 | ~121/152/155 | Fits far under the cap (maxes 1,431); STAB Counter + coverage |
| Bastiodon | 60/52/168/47/138/30 | ~94/286/155 | Extreme dual defense; premier wall |
| Galarian Stunfisk | 109/81/99/66/84/32 | ground/steel bulk | Elite typing + solid balanced spread |
| Altaria, Lanturn, Sableye, Umbreon | balanced/defensive | high Def/Sta | Bulk + coverage, classic GL cores |

**Ultra League:** Cresselia (120/70/120/75/130/85 → ~152/258/260; one of the bulkiest legendaries, GL/UL average ~120/208/208 at the cap), Giratina-Altered (150/100/120/100/120/90; Ghost/Dragon bulk), Registeel again, plus Swampert and Talonflame.

**Master League (highest raw totals + Speed):** Crowned Sword Zacian (Max CP 5629), Dialga / Origin Dialga, Groudon, Kyogre, Dragonite (~234/179/188), Giratina-Origin, Metagross, Garchomp, Palkia-Origin. All are 600+ BST with strong Attack. (2026 tier lists show a centralized meta with Crowned Sword Zacian, Origin Palkia, and Metagross at the top.)

**Overperformers vs BST:** Slaking and Regigigas (670 BST fully realized), and any ability-gated Pokémon. **Underperformers whose spreads convert poorly:** slow Pokémon (Jolteon), lopsided defenders (Cloyster; Steelix on the special side), mixed attackers, ability-reliant Pokémon (Medicham, Azumarill, Shedinja), and Pokémon too weak to reach a CP cap even at max level.

### 5. Conversion efficiency

The Pokémon that gain the most GO stat total / Max CP relative to main-series BST share a clear pattern:
1. **One dominant offensive stat** (converts at ~7/8).
2. **Two balanced high defenses** (rewarded by the 5/8–3/8 blend).
3. **High HP** (1.75× + 50 floor).
4. **High Speed** (multiplies both Attack and Defense).
5. **No reliance on abilities or items** — the biggest "free" gainers are Pokémon whose BST is artificially gated in the main series (Slaking/Truant and Regigigas/Slow Start convert their full 670 BST into elite Attack and Stamina with no penalty; Slaking reaches Max CP 5,010 and Regigigas ~4,913).

Conversely, the worst converters relative to BST are ability/item-dependent (Medicham, Azumarill, Shedinja, Light-Ball Pikachu, Eviolite Chansey) and Speed-dependent glass cannons whose identity evaporates without a Speed stat (Jolteon).

## Recommendations

**Stage 1 — Build to the format's ideal spread.**
- *Raids:* prioritize high-Attack, high-Speed specialists and Shadow forms. Target 14–15 Attack IV; 15/15/15 ideal. Bench two per type at Level 40+ (Mega Rayquaza, Shadow Mewtwo, Eternatus, and type specialists like Primal Kyogre, White/Black Kyurem, Mega Mewtwo X/Y).
- *Gym defense:* invest in Blissey and Snorlax (max Stamina).
- *Max Battles:* build one Gigantamax attacker per common type **and** a Blissey/Metagross tank; upgrade Max Moves accordingly.
- *Great/Ultra League:* hunt **low-Attack, high-Defense/Stamina** IVs (often 0/15/15) using PvPoke/Dittobase PvP IV tools; confirm the Pokémon can still reach the cap.
- *Master League:* chase **15/15/15**, Level 50 with XL Candy, on 600+ BST legendaries.

**Stage 2 — Check the moveset before spending resources.** A perfect spread with a bad movepool (Chansey, Slaking, Regigigas) is a trap. Verify the Pokémon has an efficient fast move and a spammable / high-DPE charged move on PvPoke (PvP) or Pokebattler/Dittobase (raids) before investing Stardust and XL Candy.

**Benchmarks that would change these picks:**
- A new move (fast-move energy buff, new charged move) can vault a good-spread/bad-move Pokémon into the meta overnight — recheck rankings after each season and balance patch.
- A CP-recomputing rebalance or a new ×0.91-threshold form can shift bulk across the board.
- New Gigantamax releases routinely reset the Max Battle attacker tier list.

## Caveats
- **Formula phrasing varies by source.** The 2×(7/8…) / 2×(5/8…) form (Dittobase, Pokémon GO Hub, Bulbapedia) is algebraically identical to the "1.75×high + 0.25×low" phrasing. The current, correct splits are **7/8–1/8 for Attack** and **5/8–3/8 for Defense**; a source that rendered these as ¾/¼ was incorrect.
- **Exact GO base-stat triples** for a few special forms (notably Eternatus) were not fully pinned to a tier-1 source; use Bulbapedia's "List of Pokémon by base stats in Pokémon GO" for authoritative numbers. Some individual GO stat triples above are drawn from aggregators and may be off by a point or two due to rounding (e.g., Slaking's Max CP is cited as 5,010 by Go Silph/Pokémon GO Hub but ~5,069 by some aggregators).
- **Meta rankings shift fast.** PvP and raid rankings here reflect 2026 snapshots (PvPoke; Dittobase updated Sept 13, 2026; Pokebattler). The Forever Forward season introduced a new PvP battle system and move rebalances (Drill Run, Charm, Energy Ball among others were retuned), and some 2026 tier lists place newer arrivals such as Mimikyu, Lickilicky, and Tinkaton at or near the top of the capped leagues — verify current standings before investing.
- **Stat product ≠ tier list.** It measures bulk under a cap only, ignoring moves, typing, shields, and team role — which is precisely why Chansey tops Great League stat product yet is unplayable.

## Sources

1. [How Pokemon GO calculates stats and Max CP | Pokémon GO Hub](https://pokemongohub.net/post/wiki/pokemon-go-calculates-stats-max-cp/)
2. [Pokémon GO Stat Converter](https://www.dittobase.com/pokemon-go/stat-converter)
3. [Stat (GO) - Bulbapedia, the community-driven Pokémon encyclopedia](<https://bulbapedia.bulbagarden.net/wiki/Stat_(GO)>)
4. [Pokemon GO CP rework: stat changes formula and raiding after the rework | Pokémon GO Hub](https://pokemongohub.net/post/meta/pokemon-go-cp-rework-stat-changes-formula-and-raiding-after-the-rework/)
5. [Shedinja (Pokémon) - Pokémon Go](https://pokemongostop.org/en/pokemon/shedinja)
6. [Best Max Battle Attackers in Pokémon GO (2026) | Dittobase](https://www.dittobase.com/pokemon-go/best-attackers/max-battles/overall)
7. [Top 5 Pokemon with the highest Stamina stat in Pokemon GO](https://www.sportskeeda.com/esports/top-5-pokemon-highest-stamina-stat-pokemon-go)
8. [Medicham | Pokémon GO - PokéBase](https://pokebase.app/pokemon-go/pokemon/medicham)
9. [Medicham | Pokemon GO Wiki - GamePress](https://gamepress.gg/pokemongo/pokemon/308)
10. [Shadow Pokémon | Pokémon GO Wiki | Fandom](https://pokemongo.fandom.com/wiki/Shadow_Pok%C3%A9mon)
11. [Best Electric Type Attackers — Pokemon GO Raid Counters 2026](https://gosilph.com/best-attackers/electric)
12. [Shadow vs Purified Pokémon GO Guide: Should You Purify? | GoDex](https://getgodex.com/blog/shadow-vs-purified)
13. [Medicham Great League PvP Rankings | PvPoke](https://pvpoke.com/rankings/all/1500/overall/medicham/)
14. [Pokémon GO PvP IV Checker - Rank IVs for GO Battle League | Dittobase](https://www.dittobase.com/pokemon-go/pvp-ivs)
