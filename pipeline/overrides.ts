// Loads and validates data/overrides.yaml.
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { ROOT } from "./sources.ts";

export const OVERRIDES_PATH = path.join(ROOT, "data", "overrides.yaml");

const reason = z.string().min(3);
const source = z.string().min(3);

const PatternRule = z.object({ pattern: z.string().min(1), reason });

const OverridesSchema = z.object({
  excludeForms: z.array(PatternRule).default([]),
  includeForms: z.array(z.object({ id: z.string(), reason })).default([]),
  starters: z.array(z.object({ species: z.array(z.string()).min(1), reason })).default([]),
  finalForms: z.array(z.object({ id: z.string(), reason })).default([]),
  idMap: z.record(z.string(), z.string()).default({}),
  ignoreGo: z.array(PatternRule).default([]),
  fixedAdjustment: z
    .record(z.string(), z.object({ percent: z.number().int().positive(), reason: reason.optional(), source }))
    .default({}),
  basisGeneration: z
    .record(z.string(), z.object({ generation: z.number().int().min(1), reason, source }))
    .default({}),
  exceptions: z
    .record(
      z.string(),
      z.object({
        go: z.object({ atk: z.number().int(), def: z.number().int(), sta: z.number().int() }),
        reason,
        source,
      }),
    )
    .default({}),
});

export type Overrides = z.infer<typeof OverridesSchema>;

export interface CompiledPatternRule {
  regex: RegExp;
  pattern: string;
  reason: string;
}

export function compileRules(rules: Overrides["excludeForms"]): CompiledPatternRule[] {
  return rules.map((r) => ({ regex: new RegExp(r.pattern), pattern: r.pattern, reason: r.reason }));
}

export function firstMatchingRule(rules: CompiledPatternRule[], id: string): CompiledPatternRule | undefined {
  return rules.find((r) => r.regex.test(id));
}

export function parseOverrides(text: string): Overrides {
  return OverridesSchema.parse(parse(text) ?? {});
}

export function loadOverrides(file: string = OVERRIDES_PATH): Overrides {
  return parseOverrides(readFileSync(file, "utf8"));
}
