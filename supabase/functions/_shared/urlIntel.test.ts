import { strict as assert } from "node:assert";
import {
  buildVerdict,
  cleanTargetUrl,
  daysSince,
  detectTypoSquat,
  rdapCreationDate,
} from "./urlIntel.ts";

Deno.test("cleanTargetUrl accepts http(s) and rejects the rest", () => {
  assert.equal(cleanTargetUrl("example.com/a")?.hostname, "example.com");
  assert.equal(cleanTargetUrl("https://Example.COM/")?.hostname, "example.com");
  assert.equal(cleanTargetUrl("javascript:alert(1)"), null);
  assert.equal(cleanTargetUrl("ftp://example.com"), null);
  assert.equal(cleanTargetUrl("https://user:pass@example.com"), null);
  assert.equal(cleanTargetUrl(""), null);
  assert.equal(cleanTargetUrl(42), null);
});

Deno.test("detectTypoSquat flags lookalikes and clears clean hosts", () => {
  assert.deepEqual(detectTypoSquat("login.microsoft.com"), []);
  const extra = detectTypoSquat("microsoft-login-support.com");
  assert.ok(extra.some((flag) => flag.includes("microsoft")));
  const swap = detectTypoSquat("micros0ft.com");
  assert.ok(swap.length > 0);
  const tld = detectTypoSquat("invoice-update.zip");
  assert.ok(tld.some((flag) => flag.includes(".zip")));
  const ip = detectTypoSquat("192.0.2.44");
  assert.ok(ip.some((flag) => flag.includes("IP address")));
});

Deno.test("buildVerdict ranks blocklist over suspicion over safe", () => {
  const dangerous = buildVerdict({
    gsbMatch: true,
    gsbAvailable: true,
    domainAgeDays: 900,
    ageAvailable: true,
    typoFlags: [],
  });
  assert.equal(dangerous.verdict, "Dangerous");
  const suspicious = buildVerdict({
    gsbMatch: false,
    gsbAvailable: true,
    domainAgeDays: 3,
    ageAvailable: true,
    typoFlags: [],
  });
  assert.equal(suspicious.verdict, "Suspicious");
  const safe = buildVerdict({
    gsbMatch: false,
    gsbAvailable: true,
    domainAgeDays: 900,
    ageAvailable: true,
    typoFlags: [],
  });
  assert.equal(safe.verdict, "Safe");
  const weak = buildVerdict({
    gsbMatch: false,
    gsbAvailable: false,
    domainAgeDays: null,
    ageAvailable: false,
    typoFlags: [],
  });
  assert.equal(weak.verdict, "Suspicious");
});

Deno.test("rdapCreationDate and daysSince compute domain age", () => {
  const payload = {
    events: [
      { eventAction: "last update", eventDate: "2024-01-01T00:00:00Z" },
      { eventAction: "registration", eventDate: "2020-06-15T00:00:00Z" },
    ],
  };
  assert.equal(rdapCreationDate(payload), "2020-06-15T00:00:00Z");
  assert.equal(rdapCreationDate({}), null);
  assert.equal(daysSince("2020-06-15T00:00:00Z", Date.parse("2020-06-20T00:00:00Z")), 5);
});
