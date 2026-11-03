// Matches PvPoke (GO) entries to PokéAPI (main-series) forms.
import type { MsForm } from "./load-pokeapi.ts";
import type { GoEntry } from "./load-pvpoke.ts";
import { compileRules, firstMatchingRule, type Overrides } from "./overrides.ts";

const REGIONAL_WORDS: Record<string, string> = {
  alolan: "alola",
  galarian: "galar",
  hisuian: "hisui",
  paldean: "paldea",
};

/** "darmanitan_galarian_standard" → "darmanitan-galar-standard". */
export function normalizeGoId(goId: string): string {
  return goId
    .split("_")
    .map((token) => REGIONAL_WORDS[token] ?? token)
    .join("-");
}

export type MatchMethod = "idMap" | "exact" | "default-form";

export interface Match {
  go: GoEntry;
  msId: string;
  method: MatchMethod;
}

export interface JoinResult {
  matches: Match[];
  ignored: { go: GoEntry; reason: string }[];
  /** No PokéAPI form found. The build fails while this is non-empty. */
  unmatched: GoEntry[];
  /** A second PvPoke entry matched a form that was already taken. The build fails while this is non-empty. */
  conflicts: { go: GoEntry; msId: string; takenBy: string }[];
}

export function joinGo(msForms: readonly MsForm[], goEntries: readonly GoEntry[], overrides: Overrides): JoinResult {
  const byId = new Map(msForms.map((f) => [f.id, f]));
  const defaultByDex = new Map(msForms.filter((f) => f.isDefault).map((f) => [f.dex, f]));
  const ignoreRules = compileRules(overrides.ignoreGo);

  const result: JoinResult = { matches: [], ignored: [], unmatched: [], conflicts: [] };
  const claimedBy = new Map<string, string>();

  for (const go of goEntries) {
    const ignore = firstMatchingRule(ignoreRules, go.goId);
    if (ignore) {
      result.ignored.push({ go, reason: ignore.reason });
      continue;
    }

    let msId: string | undefined;
    let method: MatchMethod | undefined;
    const mapped = overrides.idMap[go.goId];
    if (mapped) {
      if (!byId.has(mapped)) {
        throw new Error(`overrides.idMap maps ${go.goId} to ${mapped}, which is not a selectable PokéAPI form`);
      }
      msId = mapped;
      method = "idMap";
    } else {
      const norm = normalizeGoId(go.goId);
      const def = defaultByDex.get(go.dex);
      if (byId.has(norm)) {
        msId = norm;
        method = "exact";
      } else if (def && def.id.startsWith(`${norm}-`)) {
        msId = def.id;
        method = "default-form";
      }
    }

    if (!msId || !method) {
      result.unmatched.push(go);
      continue;
    }
    const ms = byId.get(msId);
    if (ms && ms.dex !== go.dex) {
      throw new Error(`${go.goId} (dex ${go.dex}) matched ${msId} (dex ${ms.dex}); fix overrides.idMap`);
    }
    const prior = claimedBy.get(msId);
    if (prior) {
      result.conflicts.push({ go, msId, takenBy: prior });
      continue;
    }
    claimedBy.set(msId, go.goId);
    result.matches.push({ go, msId, method });
  }
  return result;
}
