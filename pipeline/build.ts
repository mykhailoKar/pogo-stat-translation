// node pipeline/build.ts: writes public/data/pokemon.json and data/reports/*.md from the pinned sources.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildDataset, serializeDataset } from "./dataset.ts";
import { renderCoverage, renderValidation } from "./report.ts";
import { ROOT } from "./sources.ts";

const DATASET_PATH = path.join(ROOT, "public", "data", "pokemon.json");
const REPORTS_DIR = path.join(ROOT, "data", "reports");

function write(file: string, content: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  console.log(`  wrote ${path.relative(ROOT, file)}`);
}

function main(): void {
  const result = buildDataset();
  const { dataset, validation, coverage, staleOverrides } = result;

  write(path.join(REPORTS_DIR, "coverage.md"), renderCoverage(result));
  write(path.join(REPORTS_DIR, "validation.md"), renderValidation(result));

  console.log(
    `Dataset: ${dataset.counts.total} entries (${dataset.counts.actual} with GO data, ${dataset.counts.predicted} predicted).`,
  );
  console.log(
    `Validation: ${validation.exact.length} exact, ${validation.exceptions.length} listed exceptions, ${validation.unexplained.length} unexplained.`,
  );

  const problems: string[] = [];
  if (coverage.join.unmatched.length > 0) {
    problems.push(
      `${coverage.join.unmatched.length} PvPoke entries match no PokéAPI form: ${coverage.join.unmatched
        .map((g) => g.goId)
        .join(", ")}. Map them in overrides.idMap or ignore them in overrides.ignoreGo.`,
    );
  }
  if (coverage.join.conflicts.length > 0) {
    problems.push(
      `${coverage.join.conflicts.length} PvPoke entries match a form another entry already took: ${coverage.join.conflicts
        .map((k) => `${k.go.goId} (${k.msId}, taken by ${k.takenBy})`)
        .join(", ")}. Ignore one of each pair in overrides.ignoreGo.`,
    );
  }
  if (staleOverrides.length > 0) problems.push(`Stale overrides:\n  ${staleOverrides.join("\n  ")}`);
  if (problems.length > 0) {
    console.error(`\nBuild failed. See data/reports/coverage.md.\n${problems.join("\n")}`);
    process.exit(1);
  }

  write(DATASET_PATH, serializeDataset(dataset));
  if (validation.unexplained.length > 0) {
    console.warn(`Warning: ${validation.unexplained.length} unexplained mismatches; npm test will fail. See data/reports/validation.md.`);
  }
}

main();
