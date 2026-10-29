import { strict as assert } from "node:assert";
import { parseAttackTreeSimulation } from "./attackTree.ts";

const VALID = {
  scenarioTitle: "Phishing-led account takeover",
  attackPaths: [
    { title: "Credential theft", steps: ["Lure click", "Fake login"] },
    { title: "Session abuse", steps: ["Replay session"] },
  ],
  blastRadius: "Email and connected file storage.",
  defensiveControls: ["Enforce MFA.", "Alert on impossible travel."],
  mitigations: ["Revoke sessions.", "Reset passwords."],
  hypotheticalNote: "All paths are hypothetical simulations, not verified findings.",
};

Deno.test("parses a plain JSON simulation reply", () => {
  assert.deepEqual(parseAttackTreeSimulation(JSON.stringify(VALID)), VALID);
});

Deno.test("parses a fenced JSON simulation reply", () => {
  const result = parseAttackTreeSimulation(
    `Results:\n\`\`\`json\n${JSON.stringify(VALID)}\n\`\`\``,
  );
  assert.deepEqual(result, VALID);
});

Deno.test("rejects replies without a valid attack tree", () => {
  assert.equal(parseAttackTreeSimulation("just some prose"), null);
  assert.equal(
    parseAttackTreeSimulation(JSON.stringify({ ...VALID, attackPaths: [] })),
    null,
  );
  assert.equal(
    parseAttackTreeSimulation(
      JSON.stringify({
        ...VALID,
        attackPaths: [{ title: "Empty", steps: [] }],
      }),
    ),
    null,
  );
  assert.equal(
    parseAttackTreeSimulation(JSON.stringify({ ...VALID, blastRadius: "" })),
    null,
  );
});
