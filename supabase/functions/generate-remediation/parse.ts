export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export interface RemediationPatch {
  patchedCode: string;
  risk: string;
  rationale: string;
  validationSteps: string[];
  rollbackSteps: string[];
}

function cleanSteps(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const steps: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const trimmed = item.trim();
    if (trimmed) steps.push(trimmed);
  }
  return steps;
}

export function parseRemediationReply(reply: string): RemediationPatch | null {
  const candidates = [reply.trim()];
  const fenced = reply.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) {
    candidates.push(fenced[1].trim());
  }

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        const record = parsed as Record<string, unknown>;
        const validationSteps = cleanSteps(record.validationSteps);
        const rollbackSteps = cleanSteps(record.rollbackSteps);
        if (
          isNonEmptyString(record.patchedCode) &&
          isNonEmptyString(record.risk) &&
          isNonEmptyString(record.rationale) &&
          validationSteps !== null &&
          rollbackSteps !== null
        ) {
          return {
            patchedCode: (record.patchedCode as string).trim(),
            risk: (record.risk as string).trim(),
            rationale: (record.rationale as string).trim(),
            validationSteps,
            rollbackSteps,
          };
        }
      }
    } catch {
      // Try the next candidate shape below.
    }
  }

  return null;
}
