import { strict as assert } from "node:assert";
import {
  toTokenUsage,
  usageCost,
} from "./usage.ts";

Deno.test("reads token counts from provider usage", () => {
  assert.deepEqual(
    toTokenUsage({ usage: { prompt_tokens: 1500, completion_tokens: 400 } }),
    { promptTokens: 1500, completionTokens: 400 },
  );
});

Deno.test("defaults missing usage to zero", () => {
  assert.deepEqual(toTokenUsage({}), { promptTokens: 0, completionTokens: 0 });
  assert.deepEqual(toTokenUsage(null), {
    promptTokens: 0,
    completionTokens: 0,
  });
  assert.deepEqual(
    toTokenUsage({ usage: { prompt_tokens: -5, completion_tokens: "x" } }),
    { promptTokens: 0, completionTokens: 0 },
  );
});

Deno.test("prices usage at the published rates", () => {
  assert.equal(
    usageCost({ promptTokens: 1_000_000, completionTokens: 1_000_000 }),
    5.5,
  );
  assert.equal(usageCost({ promptTokens: 0, completionTokens: 0 }), 0);
});
