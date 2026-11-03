// Upstream data sources and where their pinned copies live on disk.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const LOCK_PATH = path.join(ROOT, "data", "sources.lock.json");
export const RAW_DIR = path.join(ROOT, "data", "raw");

export type SourceName = "pokeapi" | "pvpoke";

export interface SourceSpec {
  repo: string;
  branch: string;
  license: string;
  files: string[];
}

const POKEAPI_CSV = "data/v2/csv";

export const SOURCES: Record<SourceName, SourceSpec> = {
  pokeapi: {
    repo: "PokeAPI/pokeapi",
    branch: "master",
    license: "BSD-3-Clause",
    files: [
      "pokemon.csv",
      "pokemon_species.csv",
      "pokemon_species_names.csv",
      "pokemon_forms.csv",
      "pokemon_form_names.csv",
      "version_groups.csv",
      "pokemon_stats.csv",
      "pokemon_stats_past.csv",
      "pokemon_types.csv",
      "types.csv",
    ].map((f) => `${POKEAPI_CSV}/${f}`),
  },
  pvpoke: {
    repo: "pvpoke/pvpoke",
    branch: "master",
    license: "MIT",
    files: ["src/data/gamemaster/pokemon.json"],
  },
};

export interface LockEntry {
  repo: string;
  commit: string;
  files: Record<string, string>; // upstream path -> sha256
}

export type Lock = Record<SourceName, LockEntry>;

export function readLock(): Lock {
  return JSON.parse(readFileSync(LOCK_PATH, "utf8")) as Lock;
}

export function rawFilePath(source: SourceName, commit: string, upstreamPath: string): string {
  return path.join(RAW_DIR, source, commit, path.basename(upstreamPath));
}

/** Path of a pinned raw file, using the commit recorded in the lock. */
export function pinnedFile(source: SourceName, basename: string): string {
  const lock = readLock();
  const entry = lock[source];
  const upstream = Object.keys(entry.files).find((f) => path.basename(f) === basename);
  if (!upstream) throw new Error(`${basename} is not listed for ${source} in sources.lock.json`);
  return rawFilePath(source, entry.commit, upstream);
}
