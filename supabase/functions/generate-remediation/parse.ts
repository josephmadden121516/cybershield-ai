export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseRemediationReply(reply: string): {
  patchedCode: string;
  explanation: string;
} | null {
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
        if (
          isNonEmptyString(record.patchedCode) &&
          isNonEmptyString(record.explanation)
        ) {
          return {
            patchedCode: record.patchedCode,
            explanation: record.explanation,
          };
        }
      }
    } catch {
      // Try the next candidate shape below.
    }
  }

  return null;
}
