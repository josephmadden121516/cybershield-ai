import { candidateJsonPayloads } from "./jsonReply.ts";

export interface PhishDrill {
  lureTitle: string;
  subject: string;
  sender: string;
  body: string;
  redFlags: string[];
  teachingNotes: string[];
  debrief: string;
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

export function parsePhishDrill(reply: string): PhishDrill | null {
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
        const redFlags = cleanStringArray(record.redFlags);
        const teachingNotes = cleanStringArray(record.teachingNotes);
        if (
          isNonEmptyString(record.lureTitle) &&
          isNonEmptyString(record.subject) &&
          isNonEmptyString(record.sender) &&
          isNonEmptyString(record.body) &&
          redFlags !== null &&
          redFlags.length > 0 &&
          teachingNotes !== null &&
          isNonEmptyString(record.debrief)
        ) {
          return {
            lureTitle: (record.lureTitle as string).trim(),
            subject: (record.subject as string).trim(),
            sender: (record.sender as string).trim(),
            body: (record.body as string).trim(),
            redFlags,
            teachingNotes,
            debrief: (record.debrief as string).trim(),
          };
        }
      }
    } catch {
      // Try the next candidate shape below.
    }
  }

  return null;
}
