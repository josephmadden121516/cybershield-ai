import { strict as assert } from "node:assert";
import { parsePhishGamePack } from "./phishGame.ts";

const VALID = {
  rounds: [
    {
      subject: "Updated invoice attached",
      sender: "billing@example.invalid",
      body: "Please review the attached invoice today.",
      isPhish: true,
      verdict: "Phish: unexpected attachment plus urgency.",
      redFlags: ["Unexpected attachment.", "Urgency pressure."],
    },
    {
      subject: "Team lunch Friday",
      sender: "office@example.invalid",
      body: "Lunch is at noon on Friday in the main room.",
      isPhish: false,
      verdict: "Legitimate: ordinary internal note, no red flags.",
      redFlags: [],
    },
  ],
};

Deno.test("parses a plain JSON game pack", () => {
  assert.deepEqual(parsePhishGamePack(JSON.stringify(VALID)), VALID);
});

Deno.test("parses a fenced JSON game pack", () => {
  const result = parsePhishGamePack(
    `Pack:\n\`\`\`json\n${JSON.stringify(VALID)}\n\`\`\``,
  );
  assert.deepEqual(result, VALID);
});

Deno.test("rejects packs with missing or malformed rounds", () => {
  assert.equal(parsePhishGamePack("just some prose"), null);
  assert.equal(parsePhishGamePack(JSON.stringify({ rounds: [] })), null);
  assert.equal(
    parsePhishGamePack(
      JSON.stringify({
        rounds: [{ ...VALID.rounds[0], redFlags: [] }],
      }),
    ),
    null,
  );
  assert.equal(
    parsePhishGamePack(
      JSON.stringify({
        rounds: [{ ...VALID.rounds[1], verdict: "  " }],
      }),
    ),
    null,
  );
});
