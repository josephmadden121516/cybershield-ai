import { strict as assert } from "node:assert";
import { parsePhishDrill } from "./phishDrill.ts";

const VALID = {
  lureTitle: "Fake invoice lure",
  subject: "Updated invoice attached",
  sender: "billing@example.invalid",
  body: "Please review the attached invoice today.",
  redFlags: ["Unexpected attachment.", "Urgency pressure."],
  teachingNotes: ["Verify sender domains."],
  debrief: "Ask the team to name two red flags.",
};

Deno.test("parses a plain JSON drill reply", () => {
  assert.deepEqual(parsePhishDrill(JSON.stringify(VALID)), VALID);
});

Deno.test("parses a fenced JSON drill reply", () => {
  const result = parsePhishDrill(
    `Drill:\n\`\`\`json\n${JSON.stringify(VALID)}\n\`\`\``,
  );
  assert.deepEqual(result, VALID);
});

Deno.test("rejects drills without lure content and red flags", () => {
  assert.equal(parsePhishDrill("just some prose"), null);
  assert.equal(
    parsePhishDrill(JSON.stringify({ ...VALID, redFlags: [] })),
    null,
  );
  assert.equal(
    parsePhishDrill(JSON.stringify({ ...VALID, body: "  " })),
    null,
  );
});
