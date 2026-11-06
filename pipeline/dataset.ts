// Assembles the dataset from the pinned sources. Pure apart from reading data/raw and data/overrides.yaml.
import { toGo, type AdjustmentRule } from "../src/lib/formula.ts";
import { goFit } from "../src/lib/go-fit.ts";
import { bulk, cp, percentileRanks, statProduct } from "../src/lib/metrics.ts";
import { goBasisGeneration, statDiff, statsInGeneration } from "../src/lib/stat-basis.ts";
import type { Conversion, Dataset, DatasetEntry, GoFit, GoStats, Pool } from "../src/lib/types.ts";
import { joinGo, type JoinResult } from "./join.ts";
import { loadPokeapi, type MsForm } from "./load-pokeapi.ts";
import { loadPvpoke, type PvpokeData } from "./load-pvpoke.ts";
import { loadOverrides, type Overrides } from "./overrides.ts";
import { excludeForms, selectForms, type Exclusion } from "./select-forms.ts";
import { readLock, type Lock } from "./sources.ts";

export interface ValidationRow {
  id: string;
  goId: string;
  actual: GoStats;
  predicted: Conversion;
  basisGen: number;
  reason?: string;
  source?: string;
  note?: string;
}

export interface BuildResult {
  lock: Lock;
  dataset: Dataset;
  validation: {
    exact: string[];
    exceptions: ValidationRow[];
    unexplained: ValidationRow[];
  };
  coverage: {
    msTotal: number;
    excluded: Exclusion[];
    dropped: Exclusion[];
    pvpoke: Pick<PvpokeData, "totalRaw" | "shadowCount">;
    join: JoinResult;
    predictedIds: string[];
  };
  /** Overrides entries that no longer apply. The tests require this to be empty. */
  staleOverrides: string[];
}

function sameStats(a: GoStats, b: GoStats): boolean {
  return a.atk === b.atk && a.def === b.def && a.sta === b.sta;
}

function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundGoFit(fit: GoFit): GoFit {
  return {
    score: oneDecimal(fit.score),
    attackFit: oneDecimal(fit.attackFit),
    defenseFit: oneDecimal(fit.defenseFit),
    speedFit: oneDecimal(fit.speedFit),
    best: fit.best,
  };
}

function adjustmentRule(f: MsForm, overrides: Overrides): AdjustmentRule {
  const fixed = overrides.fixedAdjustment[f.id];
  if (fixed) return { kind: "fixed", percent: fixed.percent };
  if (f.isMega || f.isPrimal) return { kind: "mega" };
  return { kind: "standard" };
}

function tagsOf(f: MsForm, starterChains: Set<number>, finalForms: Set<string>): string[] {
  const tags: string[] = [];
  if (f.isLegendary) tags.push("legendary");
  if (f.isMythical) tags.push("mythical");
  if (f.isBaby) tags.push("baby");
  if (f.isMega) tags.push("mega");
  if (f.isPrimal) tags.push("primal");
  if (f.isRegional) tags.push("regional");
  if (starterChains.has(f.evolutionChain)) tags.push("starter");
  if (!f.speciesEvolves || finalForms.has(f.id)) tags.push("fully-evolved");
  return tags;
}

export function buildDataset(overrides: Overrides = loadOverrides()): BuildResult {
  const lock = readLock();
  const allForms = loadPokeapi();
  const pvpoke = loadPvpoke();

  const { candidates, excluded } = excludeForms(allForms, overrides);
  const join = joinGo(candidates, pvpoke.entries, overrides);
  const matchByMsId = new Map(join.matches.map((m) => [m.msId, m]));
  const { kept, dropped } = selectForms(candidates, new Set(matchByMsId.keys()), overrides);

  const formsById = new Map(allForms.map((f) => [f.id, f]));
  const starterChains = new Set<number>();
  for (const { species } of overrides.starters) {
    for (const id of species) {
      const chain = formsById.get(id)?.evolutionChain;
      if (chain !== undefined) starterChains.add(chain);
    }
  }
  const finalForms = new Set(overrides.finalForms.map((f) => f.id));

  const validation: BuildResult["validation"] = { exact: [], exceptions: [], unexplained: [] };
  const predictedIds: string[] = [];

  const entries: DatasetEntry[] = kept.map((f) => {
    const basisGen = overrides.basisGeneration[f.id]?.generation ?? goBasisGeneration(f.formGen);
    const basis = statsInGeneration(f.ms, f.past, basisGen);
    const diff = statDiff(f.ms, basis);
    const rule = adjustmentRule(f, overrides);
    const predicted = toGo(basis, rule);
    const fit = goFit(basis, Math.round(predicted.steps.adjustment * 100));
    const ideal = toGo(fit.best.ms, rule);
    const match = matchByMsId.get(f.id);

    let exception: DatasetEntry["exception"] = null;
    let goStats: GoStats = { atk: predicted.atk, def: predicted.def, sta: predicted.sta };
    if (match) {
      const actual = { atk: match.go.atk, def: match.go.def, sta: match.go.sta };
      goStats = actual;
      const row: ValidationRow = { id: f.id, goId: match.go.goId, actual, predicted, basisGen };
      if (sameStats(actual, predicted)) {
        validation.exact.push(f.id);
      } else {
        const listed = overrides.exceptions[f.id];
        if (listed && sameStats(listed.go, actual)) {
          exception = { reason: listed.reason, source: listed.source };
          validation.exceptions.push({ ...row, reason: listed.reason, source: listed.source });
        } else {
          const note = listed
            ? `listed in overrides.exceptions as ${listed.go.atk}/${listed.go.def}/${listed.go.sta}, but GO data now says otherwise`
            : undefined;
          validation.unexplained.push(note ? { ...row, note } : row);
        }
      }
    } else {
      predictedIds.push(f.id);
    }

    const bst = f.ms.hp + f.ms.atk + f.ms.def + f.ms.spa + f.ms.spd + f.ms.spe;
    const pool: Pool = f.isMega || f.isPrimal ? "mega" : "standard";
    return {
      id: f.id,
      dex: f.dex,
      name: f.name,
      displayName: f.displayName,
      form: f.form,
      gen: f.gen,
      types: f.types,
      tags: tagsOf(f, starterChains, finalForms),
      ms: { ...f.ms, bst },
      msGoBasis: diff ? { ...diff, gen: basisGen } : null,
      go: {
        ...goStats,
        status: match ? "actual" : "predicted",
        goId: match?.go.goId ?? null,
        pvpReleased: match ? match.go.pvpReleased : null,
        shadowAvailable: match?.go.shadowAvailable ?? false,
      },
      goPredicted: predicted,
      exception,
      metrics: {
        cp: { l40: cp(goStats, 40), l50: cp(goStats, 50), l51: cp(goStats, 51) },
        statProductL50: statProduct(goStats, 50),
        bulkL50: bulk(goStats, 50),
      },
      goFit: {
        ...roundGoFit(fit),
        ideal: {
          atk: ideal.atk,
          def: ideal.def,
          sta: ideal.sta,
          cpL50: cp(ideal, 50),
          cut: ideal.steps.adjustment < predicted.steps.adjustment,
        },
      },
      ranks: { pool, bstPct: 0, cpL50Pct: 0, spL50Pct: 0, goFitPct: 0 },
    };
  });

  for (const pool of ["standard", "mega"] as const) {
    const members = entries.filter((e) => e.ranks.pool === pool);
    const bstPct = percentileRanks(members.map((e) => e.ms.bst));
    const cpPct = percentileRanks(members.map((e) => e.metrics.cp.l50));
    const spPct = percentileRanks(members.map((e) => e.metrics.statProductL50));
    const goFitPct = percentileRanks(members.map((e) => e.goFit.score));
    members.forEach((e, i) => {
      e.ranks.bstPct = bstPct[i] as number;
      e.ranks.cpL50Pct = cpPct[i] as number;
      e.ranks.spL50Pct = spPct[i] as number;
      e.ranks.goFitPct = goFitPct[i] as number;
    });
  }

  const order = new Map(kept.map((f) => [f.id, f]));
  entries.sort((a, b) => {
    const fa = order.get(a.id) as MsForm;
    const fb = order.get(b.id) as MsForm;
    return fa.dex - fb.dex || Number(fb.isDefault) - Number(fa.isDefault) || fa.order - fb.order || fa.id.localeCompare(fb.id);
  });

  const keptIds = new Set(kept.map((f) => f.id));
  const allIds = new Set(allForms.map((f) => f.id));
  const exactOrMissing = new Set([...validation.exact, ...predictedIds]);
  const staleOverrides: string[] = [];
  for (const id of Object.keys(overrides.exceptions)) {
    if (!keptIds.has(id)) staleOverrides.push(`exceptions.${id}: not in the dataset`);
    else if (exactOrMissing.has(id)) staleOverrides.push(`exceptions.${id}: no longer needed (formula matches, or no GO data)`);
  }
  for (const id of Object.keys(overrides.fixedAdjustment)) {
    if (!keptIds.has(id)) staleOverrides.push(`fixedAdjustment.${id}: not in the dataset`);
  }
  for (const id of Object.keys(overrides.basisGeneration)) {
    if (!keptIds.has(id)) staleOverrides.push(`basisGeneration.${id}: not in the dataset`);
  }
  for (const { id } of overrides.includeForms) {
    if (!allIds.has(id)) staleOverrides.push(`includeForms ${id}: no such PokéAPI form`);
  }
  for (const id of overrides.starters.flatMap((s) => s.species)) {
    if (!allIds.has(id)) staleOverrides.push(`starters ${id}: no such PokéAPI form`);
  }
  for (const { id } of overrides.finalForms) {
    if (!keptIds.has(id)) staleOverrides.push(`finalForms ${id}: not in the dataset`);
    else if (!formsById.get(id)?.speciesEvolves) staleOverrides.push(`finalForms ${id}: its species doesn't evolve, so it isn't needed`);
  }
  const usedIdMap = new Set(join.matches.filter((m) => m.method === "idMap").map((m) => m.go.goId));
  for (const goId of Object.keys(overrides.idMap)) {
    if (!usedIdMap.has(goId)) staleOverrides.push(`idMap.${goId}: no PvPoke entry uses it`);
  }

  const dataset: Dataset = {
    schemaVersion: 1,
    sources: {
      pokeapi: { repo: lock.pokeapi.repo, commit: lock.pokeapi.commit },
      pvpoke: { repo: lock.pvpoke.repo, commit: lock.pvpoke.commit },
    },
    counts: {
      total: entries.length,
      actual: entries.length - predictedIds.length,
      predicted: predictedIds.length,
    },
    pokemon: entries,
  };

  return {
    lock,
    dataset,
    validation,
    coverage: {
      msTotal: allForms.length,
      excluded,
      dropped,
      pvpoke: { totalRaw: pvpoke.totalRaw, shadowCount: pvpoke.shadowCount },
      join,
      predictedIds: predictedIds.sort(),
    },
    staleOverrides,
  };
}

/** Valid JSON with one Pokémon per line, so diffs show exactly which entries changed. */
export function serializeDataset(dataset: Dataset): string {
  const { pokemon, ...header } = dataset;
  const head = JSON.stringify(header, null, 2).replace(/\n}$/, "");
  const rows = pokemon.map((p) => `    ${JSON.stringify(p)}`).join(",\n");
  return `${head},\n  "pokemon": [\n${rows}\n  ]\n}\n`;
}
