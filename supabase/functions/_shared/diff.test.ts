import { strict as assert } from "node:assert";
import { computeLineDiff } from "./diff.ts";

Deno.test("marks identical content as unchanged", () => {
  const result = computeLineDiff("a\nb", "a\nb");
  assert.deepEqual(result, [
    { type: "same", text: "a" },
    { type: "same", text: "b" },
  ]);
});

Deno.test("marks inserted lines as additions", () => {
  const result = computeLineDiff("FROM x", "FROM x\nRUN y");
  assert.deepEqual(result, [
    { type: "same", text: "FROM x" },
    { type: "add", text: "RUN y" },
  ]);
});

Deno.test("marks removed lines as removals", () => {
  const result = computeLineDiff("a\nb\nc", "a\nc");
  assert.deepEqual(result, [
    { type: "same", text: "a" },
    { type: "remove", text: "b" },
    { type: "same", text: "c" },
  ]);
});

Deno.test("marks replacements as remove plus add", () => {
  const result = computeLineDiff("FROM x:latest", "FROM x:1.2.3");
  assert.deepEqual(result, [
    { type: "remove", text: "FROM x:latest" },
    { type: "add", text: "FROM x:1.2.3" },
  ]);
});

Deno.test("handles empty input", () => {
  assert.deepEqual(computeLineDiff("", ""), [{ type: "same", text: "" }]);
  assert.deepEqual(computeLineDiff("", "a"), [
    { type: "remove", text: "" },
    { type: "add", text: "a" },
  ]);
});
