import { candidateJsonPayloads } from "./jsonReply.ts";

export interface PhishGameRound {
  subject: string;
  sender: string;
  body: string;
  isPhish: boolean;
  verdict: string;
  redFlags: string[];
}

export interface PhishGamePack {
  rounds: PhishGameRound[];
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

function cleanRound(value: unknown): PhishGameRound | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const redFlags = cleanStringArray(record.redFlags);
  if (
    !isNonEmptyString(record.subject) ||
    !isNonEmptyString(record.sender) ||
    !isNonEmptyString(record.body) ||
    typeof record.isPhish !== "boolean" ||
    !isNonEmptyString(record.verdict) ||
    redFlags === null
  ) {
    return null;
  }
  if (record.isPhish && redFlags.length === 0) return null;
  return {
    subject: (record.subject as string).trim(),
    sender: (record.sender as string).trim(),
    body: (record.body as string).trim(),
    isPhish: record.isPhish,
    verdict: (record.verdict as string).trim(),
    redFlags,
  };
}

export function parsePhishGamePack(reply: string): PhishGamePack | null {
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
        if (!Array.isArray(record.rounds) || record.rounds.length === 0) {
          continue;
        }
        const rounds: PhishGameRound[] = [];
        let valid = true;
        for (const entry of record.rounds) {
          const round = cleanRound(entry);
          if (!round) {
            valid = false;
            break;
          }
          rounds.push(round);
        }
        if (valid && rounds.length > 0) return { rounds };
      }
    } catch {
      // Try the next candidate shape below.
    }
  }

  return null;
}
