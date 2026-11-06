// The figures the About page quotes. They come from the dataset, so a data refresh can't leave the
// text out of date. They live here rather than in the page so the compiler and tests cover them.
import { concentratedGo, goFit } from "./go-fit.ts";
import { toListRow, type ListRow } from "./list.ts";
import { MAX_IV } from "./metrics.ts";
import type { Dataset, DatasetEntry, GoStats, MsStats } from "./types.ts";

/** Attack and Defense with perfect IVs added, as the GO Fit formulas use them. */
export interface WithIvs {
  atk: number;
  def: number;
}

export interface WorkedExample {
  row: ListRow;
  attackPoints: number;
  defensePoints: number;
  concentratedGo: GoStats;
  /** The best shape's GO stats before any new cut. */
  bestGo: GoStats;
  actual: WithIvs;
  concentrated: WithIvs;
  best: WithIvs;
}

export interface AboutFigures {
  forms: number;
  withGoData: number;
  exact: number;
  lowestScore: number;
  medianScore: number;
  highestScore: number;
  top: ListRow;
  newlyCutIdeals: number;
  idealSpeedOne: number;
  wantsMoreSpeed: number;
  weakBst: number;
  strongBst: number;
  weakMean: number;
  strongMean: number;
  lowestRescore: number;
  example: WorkedExample;
  speedCapped: ListRow;
}

const WEAK_BST = 300;
const STRONG_BST = 700;

const EXAMPLE_ID = "garchomp";
const SPEED_CAPPED_ID = "mewtwo";

function adjustmentPercent(entry: DatasetEntry): number {
  return Math.round(entry.goPredicted.steps.adjustment * 100);
}

function statTotal(ms: MsStats): number {
  return ms.hp + ms.atk + ms.def + ms.spa + ms.spd + ms.spe;
}

function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function meanScore(rows: readonly ListRow[]): number {
  return oneDecimal(rows.reduce((sum, row) => sum + row.goFit, 0) / rows.length);
}

function withIvs(go: GoStats): WithIvs {
  return { atk: go.atk + MAX_IV, def: go.def + MAX_IV };
}

function findById<T extends { id: string }>(list: readonly T[], id: string): T {
  const found = list.find((item) => item.id === id);
  if (!found) throw new Error(`${id} is not in the dataset`);
  return found;
}

function workedExample(entry: DatasetEntry, row: ListRow): WorkedExample {
  const concentrated = concentratedGo(row.ms, adjustmentPercent(entry));
  const bestGo = entry.goFit.best.go;
  return {
    row,
    attackPoints: row.ms.atk + row.ms.spa,
    defensePoints: row.ms.def + row.ms.spd,
    concentratedGo: concentrated,
    bestGo,
    actual: withIvs(row.go),
    concentrated: withIvs(concentrated),
    best: withIvs(bestGo),
  };
}

export function aboutFigures(dataset: Dataset): AboutFigures {
  const entries = dataset.pokemon;
  const rows = entries.map(toListRow);

  const byScore = [...rows].sort((a, b) => a.goFit - b.goFit);
  const lowest = byScore[0];
  const highest = byScore.at(-1);
  const median = byScore[Math.floor(byScore.length / 2)];
  if (!lowest || !highest || !median) throw new Error("The dataset is empty");

  // A best shape scored again would be exactly 100 but for the whole-number rounding.
  const rescores = entries.map((entry) => goFit(entry.goFit.best.ms, adjustmentPercent(entry)).score);

  return {
    forms: rows.length,
    withGoData: dataset.counts.actual,
    exact: entries.filter((entry) => entry.go.status === "actual" && !entry.exception).length,
    lowestScore: lowest.goFit,
    medianScore: median.goFit,
    highestScore: highest.goFit,
    top: highest,
    newlyCutIdeals: rows.filter((row) => row.idealCut).length,
    idealSpeedOne: rows.filter((row) => row.best.spe === 1).length,
    wantsMoreSpeed: rows.filter((row) => row.best.spe > row.ms.spe).length,
    weakBst: WEAK_BST,
    strongBst: STRONG_BST,
    weakMean: meanScore(rows.filter((row) => statTotal(row.ms) < WEAK_BST)),
    strongMean: meanScore(rows.filter((row) => statTotal(row.ms) >= STRONG_BST)),
    lowestRescore: oneDecimal(Math.min(...rescores)),
    example: workedExample(findById(entries, EXAMPLE_ID), findById(rows, EXAMPLE_ID)),
    speedCapped: findById(rows, SPEED_CAPPED_ID),
  };
}
