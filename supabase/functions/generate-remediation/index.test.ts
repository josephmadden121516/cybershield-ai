import { strict as assert } from "node:assert";
import { parseRemediationReply } from "./parse.ts";

const VALID = {
  patchedCode: "SELECT 1",
  risk: "SQL injection via string interpolation.",
  rationale: "Parameterize the query so input is never executed.",
  validationSteps: ["Run the unit tests.", "Review the query plan."],
  rollbackSteps: ["Revert the commit.", "Redeploy the previous build."],
};

Deno.test("parses a plain JSON remediation reply", () => {
  assert.deepEqual(parseRemediationReply(JSON.stringify(VALID)), VALID);
});

Deno.test("parses a fenced JSON remediation reply", () => {
  const result = parseRemediationReply(
    `Here is the fix:\n\`\`\`json\n${JSON.stringify(VALID)}\n\`\`\``,
  );
  assert.deepEqual(result, VALID);
});

Deno.test("rejects replies without all required fields", () => {
  assert.equal(parseRemediationReply("just some prose"), null);
  assert.equal(
    parseRemediationReply(JSON.stringify({ patchedCode: "SELECT 1" })),
    null,
  );
  assert.equal(
    parseRemediationReply(
      JSON.stringify({ ...VALID, validationSteps: "not-an-array" }),
    ),
    null,
  );
  assert.equal(
    parseRemediationReply(JSON.stringify({ ...VALID, risk: "  " })),
    null,
  );
});

Deno.test("drops blank steps but keeps the reply", () => {
  const result = parseRemediationReply(
    JSON.stringify({
      ...VALID,
      validationSteps: ["  ", "Run the unit tests."],
      rollbackSteps: [],
    }),
  );
  assert.deepEqual(result, {
    ...VALID,
    validationSteps: ["Run the unit tests."],
    rollbackSteps: [],
  });
});
