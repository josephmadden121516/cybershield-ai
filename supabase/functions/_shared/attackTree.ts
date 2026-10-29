import { candidateJsonPayloads } from "./jsonReply.ts";

export interface AttackPath {
  title: string;
  steps: string[];
}

export interface AttackTreeSimulation {
  scenarioTitle: string;
  attackPaths: AttackPath[];
  blastRadius: string;
  defensiveControls: string[];
  mitigations: string[];
  hypotheticalNote: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const trimmed = item.trim();
    if (trimmed) items.push(trimmed);
  }
  return items;
}

function cleanAttackPaths(value: unknown): AttackPath[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const paths: AttackPath[] = [];
  for (const item of value) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      return null;
    }
    const record = item as Record<string, unknown>;
    const steps = cleanStringArray(record.steps);
    if (!isNonEmptyString(record.title) || steps === null || steps.length === 0) {
      return null;
    }
    paths.push({ title: (record.title as string).trim(), steps });
  }
  return paths;
}

export function parseAttackTreeSimulation(reply: string): AttackTreeSimulation | null {
  const candidates = candidateJsonPayloads(reply);

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        const record = parsed as Record<string, unknown>;
        const attackPaths = cleanAttackPaths(record.attackPaths);
        const defensiveControls = cleanStringArray(record.defensiveControls);
        const mitigations = cleanStringArray(record.mitigations);
        if (
          isNonEmptyString(record.scenarioTitle) &&
          attackPaths !== null &&
          isNonEmptyString(record.blastRadius) &&
          defensiveControls !== null &&
          mitigations !== null &&
          isNonEmptyString(record.hypotheticalNote)
        ) {
          return {
            scenarioTitle: (record.scenarioTitle as string).trim(),
            attackPaths,
            blastRadius: (record.blastRadius as string).trim(),
            defensiveControls,
            mitigations,
            hypotheticalNote: (record.hypotheticalNote as string).trim(),
          };
        }
      }
    } catch {
      // Try the next candidate shape below.
    }
  }

  return null;
}
