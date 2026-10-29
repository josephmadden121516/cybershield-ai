import { strict as assert } from "node:assert";
import { parseRemediationReply } from "./parse.ts";

Deno.test("parses a plain JSON remediation reply", () => {
  const result = parseRemediationReply(
    '{"patchedCode": "SELECT 1", "explanation": "Fixed."}',
  );
  assert.deepEqual(result, { patchedCode: "SELECT 1", explanation: "Fixed." });
});

Deno.test("parses a fenced JSON remediation reply", () => {
  const result = parseRemediationReply(
    'Here is the fix:\n```json\n{"patchedCode": "SELECT 1", "explanation": "Fixed."}\n```',
  );
  assert.deepEqual(result, { patchedCode: "SELECT 1", explanation: "Fixed." });
});

Deno.test("rejects replies without both required fields", () => {
  assert.equal(parseRemediationReply("just some prose"), null);
  assert.equal(parseRemediationReply('{"patchedCode": "SELECT 1"}'), null);
  assert.equal(parseRemediationReply('{"patchedCode": "", "explanation": ""}'), null);
});
