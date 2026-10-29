export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

export const INPUT_PRICE_PER_MILLION = 1.25;
export const OUTPUT_PRICE_PER_MILLION = 4.25;

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

export function toTokenUsage(value: unknown): TokenUsage {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { promptTokens: 0, completionTokens: 0 };
  }
  const usage = (value as { usage?: unknown }).usage;
  if (!usage || typeof usage !== "object" || Array.isArray(usage)) {
    return { promptTokens: 0, completionTokens: 0 };
  }
  const record = usage as Record<string, unknown>;
  return {
    promptTokens: toCount(record.prompt_tokens),
    completionTokens: toCount(record.completion_tokens),
  };
}

export function usageCost(usage: TokenUsage): number {
  return (
    (usage.promptTokens * INPUT_PRICE_PER_MILLION +
      usage.completionTokens * OUTPUT_PRICE_PER_MILLION) /
    1_000_000
  );
}
