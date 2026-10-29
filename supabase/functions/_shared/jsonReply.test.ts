import { strict as assert } from "node:assert";
import { candidateJsonPayloads } from "./jsonReply.ts";

Deno.test("returns the raw reply first", () => {
  assert.deepEqual(candidateJsonPayloads('{"a":1}'), ['{"a":1}']);
});

Deno.test("extracts fenced JSON", () => {
  assert.deepEqual(
    candidateJsonPayloads('Here:\n```json\n{"a":1}\n```'),
    ['Here:\n```json\n{"a":1}\n```', '{"a":1}'],
  );
});

Deno.test("extracts the brace span around prose", () => {
  assert.deepEqual(
    candidateJsonPayloads('Sure! {"a":1} Done.'),
    ['Sure! {"a":1} Done.', '{"a":1}'],
  );
});

Deno.test("returns only raw text when no object exists", () => {
  assert.deepEqual(candidateJsonPayloads("no json here"), ["no json here"]);
});
