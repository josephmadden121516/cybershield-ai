import { strict as assert } from "node:assert";
import {
  generateSyntheticAuditEvents,
  MAX_AUDIT_BATCH,
} from "./syntheticAuditLog.ts";

const SEVERITIES = ["info", "low", "medium", "high", "critical"];

Deno.test("generates the requested batch size", () => {
  assert.equal(generateSyntheticAuditEvents(10, 7).length, 10);
});

Deno.test("bounds batches to the documented limits", () => {
  assert.equal(generateSyntheticAuditEvents(0, 7).length, 1);
  assert.equal(
    generateSyntheticAuditEvents(MAX_AUDIT_BATCH + 50, 7).length,
    MAX_AUDIT_BATCH,
  );
});

Deno.test("marks every event and identity as synthetic", () => {
  for (const event of generateSyntheticAuditEvents(25, 7)) {
    assert.equal(event.simulated, true);
    assert.match(event.id, /^sim-evt-[0-9a-f]+$/);
    assert.match(event.correlationId, /^sim-corr-[0-9a-f]+$/);
    assert.match(event.actor, /^sim\.user\.\d+@example\.invalid$/);
    assert.match(event.asset, /^sim-/);
    assert.ok(SEVERITIES.includes(event.severity));
    assert.ok(event.eventType.length > 0);
    assert.ok(event.summary.length > 0);
  }
});

Deno.test("emits valid descending timestamps", () => {
  const events = generateSyntheticAuditEvents(20, 7);
  let previous = Number.POSITIVE_INFINITY;
  for (const event of events) {
    const time = Date.parse(event.timestamp);
    assert.ok(!Number.isNaN(time));
    assert.ok(time <= previous);
    previous = time;
  }
});

Deno.test("reproduces the same batch for the same seed", () => {
  const withoutTimestamps = (events: ReturnType<typeof generateSyntheticAuditEvents>) =>
    JSON.stringify(events, (key, value) =>
      key === "timestamp" ? undefined : value);
  assert.equal(
    withoutTimestamps(generateSyntheticAuditEvents(15, 42)),
    withoutTimestamps(generateSyntheticAuditEvents(15, 42)),
  );
});
