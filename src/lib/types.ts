// Shared types for the pipeline and (from Phase 2) the browser. Keep this file free of runtime code.

/** Main-series base stats. */
export interface MsStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export type MsStatKey = keyof MsStats;

/** Pokémon GO base stats. */
export interface GoStats {
  atk: number;
  def: number;
  sta: number;
}

/** How a GO conversion multiplier was chosen. See docs/methodology.md. */
export type AdjustmentReason = "none" | "cp-cut" | "mega" | "fixed";

/** Intermediate values of the conversion, shown step by step in the Phase 2 UI. */
export interface ConversionSteps {
  /** round(2 × (7/8 × higher + 1/8 × lower)) of Attack and Sp. Atk. */
  atkBlend: number;
  /** round(2 × (5/8 × higher + 3/8 × lower)) of Defense and Sp. Def. */
  defBlend: number;
  /** 1 + (Speed − 75) / 500. */
  speedMod: number;
  /** Stats before the adjustment multiplier. */
  uncut: GoStats;
  /** CP of the uncut stats at level 40 with 15/15/15 IVs; ≥ 4000 triggers the ×0.91 cut. */
  uncutCpL40: number;
  adjustment: number;
  adjustmentReason: AdjustmentReason;
}

export interface Conversion extends GoStats {
  steps: ConversionSteps;
}

/** How much of its potential GO output a form's stat shape reaches. See docs/methodology.md §7. */
export interface GoFit {
  /** Percent of the best reshape's stat product; equals attackFit × defenseFit × speedFit. */
  score: number;
  /** GO Attack (with IVs) as a percent of having all attack points in one stat. */
  attackFit: number;
  /** GO Defense (with IVs) as a percent of having all defense points in one stat. */
  defenseFit: number;
  /** Percent of the best reshape that the form's own Speed allows once its stats are concentrated. */
  speedFit: number;
  /** The best reshape of the same stat points, and the GO stats it converts to. */
  best: { ms: MsStats; go: GoStats };
}

export type Pool = "standard" | "mega";

export interface DatasetEntry {
  /** PokéAPI identifier, e.g. "rattata-alola". */
  id: string;
  dex: number;
  /** Species name, e.g. "Rattata". */
  name: string;
  /** Full display name, e.g. "Alolan Rattata". */
  displayName: string;
  /** Form label, e.g. "Alolan Form"; null for a species' default form. */
  form: string | null;
  /** Generation the species was introduced in. */
  gen: number;
  types: string[];
  tags: string[];
  /** Current main-series stats. */
  ms: MsStats & { bst: number };
  /** Stats GO bases its conversion on, when they differ from the current ones. */
  msGoBasis: (Partial<MsStats> & { gen: number }) | null;
  /** GO stats used for metrics: actual where GO data exists, otherwise the prediction. */
  go: GoStats & {
    status: "actual" | "predicted";
    /** PvPoke's speciesId, when the entry exists in GO data. */
    goId: string | null;
    /** PvPoke's `released` flag (usable in PvP), when the entry exists in GO data. */
    pvpReleased: boolean | null;
    shadowAvailable: boolean;
  };
  goPredicted: Conversion;
  /** Present when actual GO stats differ from the prediction; explained in data/overrides.yaml. */
  exception: { reason: string; source: string } | null;
  metrics: {
    cp: { l40: number; l50: number; l51: number };
    statProductL50: number;
    bulkL50: number;
  };
  /** Computed from the formula's stats on both sides, with percentages to one decimal. */
  goFit: GoFit;
  ranks: {
    pool: Pool;
    bstPct: number;
    cpL50Pct: number;
    spL50Pct: number;
    goFitPct: number;
  };
}

export interface Dataset {
  schemaVersion: 1;
  sources: Record<string, { repo: string; commit: string }>;
  counts: { total: number; actual: number; predicted: number };
  pokemon: DatasetEntry[];
}
