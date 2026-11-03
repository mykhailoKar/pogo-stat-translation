// Reads PvPoke's gamemaster pokemon list. Shadow entries are folded into their base entry.
import { readFileSync } from "node:fs";
import { z } from "zod";
import { pinnedFile } from "./sources.ts";

const PvpokeEntry = z.object({
  dex: z.number().int().positive(),
  speciesName: z.string().min(1),
  speciesId: z.string().regex(/^[a-z0-9_]+$/),
  baseStats: z.object({
    atk: z.number().int().nonnegative(),
    def: z.number().int().nonnegative(),
    hp: z.number().int().nonnegative(),
  }),
  types: z.array(z.string()),
  tags: z.array(z.string()).optional(),
  released: z.boolean(),
});

const PvpokeFile = z.array(PvpokeEntry);

export interface GoEntry {
  /** PvPoke speciesId, e.g. "rattata_alolan". */
  goId: string;
  dex: number;
  name: string;
  atk: number;
  def: number;
  sta: number;
  tags: string[];
  /** PvPoke's flag: usable in PvP. Not the same as released in GO (Shedinja is false). */
  pvpReleased: boolean;
  /** A released Shadow version exists. */
  shadowAvailable: boolean;
}

export interface PvpokeData {
  entries: GoEntry[];
  totalRaw: number;
  shadowCount: number;
}

const SHADOW_SUFFIX = "_shadow";

export function parsePvpoke(json: unknown): PvpokeData {
  const raw = PvpokeFile.parse(json);
  const shadows = raw.filter((e) => e.speciesId.endsWith(SHADOW_SUFFIX) || e.tags?.includes("shadow"));
  const releasedShadowBases = new Set(
    shadows.filter((e) => e.released).map((e) => e.speciesId.slice(0, -SHADOW_SUFFIX.length)),
  );
  const seen = new Set<string>();
  const entries: GoEntry[] = [];
  for (const e of raw) {
    if (e.speciesId.endsWith(SHADOW_SUFFIX) || e.tags?.includes("shadow")) continue;
    if (seen.has(e.speciesId)) throw new Error(`Duplicate PvPoke speciesId ${e.speciesId}`);
    seen.add(e.speciesId);
    entries.push({
      goId: e.speciesId,
      dex: e.dex,
      name: e.speciesName,
      atk: e.baseStats.atk,
      def: e.baseStats.def,
      sta: e.baseStats.hp,
      tags: e.tags ?? [],
      pvpReleased: e.released,
      shadowAvailable: releasedShadowBases.has(e.speciesId),
    });
  }
  return { entries, totalRaw: raw.length, shadowCount: shadows.length };
}

export function loadPvpoke(): PvpokeData {
  return parsePvpoke(JSON.parse(readFileSync(pinnedFile("pvpoke", "pokemon.json"), "utf8")));
}
