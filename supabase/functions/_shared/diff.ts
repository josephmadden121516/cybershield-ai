export type DiffLineType = "same" | "add" | "remove";

export interface DiffLine {
  type: DiffLineType;
  text: string;
}

const MAX_DIFF_LINES = 1000;

export function computeLineDiff(original: string, patched: string): DiffLine[] {
  const a = original.split("\n").slice(0, MAX_DIFF_LINES);
  const b = patched.split("\n").slice(0, MAX_DIFF_LINES);
  const n = a.length;
  const m = b.length;

  const table: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      lines.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      lines.push({ type: "remove", text: a[i] });
      i++;
    } else {
      lines.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < n) {
    lines.push({ type: "remove", text: a[i] });
    i++;
  }
  while (j < m) {
    lines.push({ type: "add", text: b[j] });
    j++;
  }
  return lines;
}
