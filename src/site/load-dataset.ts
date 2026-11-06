// Reads the generated dataset at build time. Node only, so the browser code never imports this.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Dataset } from "../lib/types.ts";

export function loadDataset(): Dataset {
  const file = path.join(process.cwd(), "public", "data", "pokemon.json");
  return JSON.parse(readFileSync(file, "utf8")) as Dataset;
}
