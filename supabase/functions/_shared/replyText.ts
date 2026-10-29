function choiceMessage(choice: unknown): Record<string, unknown> | null {
  if (!choice || typeof choice !== "object") return null;
  const message = (choice as { message?: unknown }).message;
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return null;
  }
  return message as Record<string, unknown>;
}

export function extractReplyText(choice: unknown): string | null {
  const message = choiceMessage(choice);
  if (!message) return null;
  const content = message.content;
  if (typeof content === "string") {
    return content.trim() ? content : null;
  }
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const block of content) {
      if (!block || typeof block !== "object" || Array.isArray(block)) continue;
      const text = (block as Record<string, unknown>).text;
      if (typeof text === "string" && text.trim()) parts.push(text);
    }
    const joined = parts.join("\n").trim();
    return joined ? joined : null;
  }
  if (content && typeof content === "object") {
    const text = (content as Record<string, unknown>).text;
    return typeof text === "string" && text.trim() ? text : null;
  }
  return null;
}

export function replyRefusal(choice: unknown): string | null {
  const message = choiceMessage(choice);
  if (!message) return null;
  const refusal = message.refusal;
  return typeof refusal === "string" && refusal.trim() ? refusal : null;
}
