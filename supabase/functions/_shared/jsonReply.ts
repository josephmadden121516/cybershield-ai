export function candidateJsonPayloads(reply: string): string[] {
  const candidates = [reply.trim()];
  const fenced = reply.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) {
    candidates.push(fenced[1].trim());
  }
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const span = reply.slice(start, end + 1).trim();
    if (!candidates.includes(span)) {
      candidates.push(span);
    }
  }
  return candidates;
}
