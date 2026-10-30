import { strict as assert } from "node:assert";
import {
  buildDepFindings,
  cleanDepPackages,
  cleanKeywords,
  findKevEntry,
  matchKevEntries,
  normalizeCveId,
  parseEpssScore,
} from "./vulnIntel.ts";

Deno.test("normalizeCveId accepts valid ids and rejects the rest", () => {
  assert.equal(normalizeCveId("cve-2024-3094"), "CVE-2024-3094");
  assert.equal(normalizeCveId(" CVE-2019-10744 "), "CVE-2019-10744");
  assert.equal(normalizeCveId("CVE-2024-123"), null);
  assert.equal(normalizeCveId("XSS in login form"), null);
  assert.equal(normalizeCveId(42), null);
});

Deno.test("cleanDepPackages validates package lists", () => {
  assert.deepEqual(
    cleanDepPackages([{ name: " lodash ", version: "4.17.20", ecosystem: "npm" }]),
    [{ name: "lodash", version: "4.17.20", ecosystem: "npm" }],
  );
  assert.equal(cleanDepPackages([]), null);
  assert.equal(
    cleanDepPackages([{ name: "x", version: "1", ecosystem: "rubygems" }]),
    null,
  );
  assert.equal(
    cleanDepPackages([{ name: "", version: "1", ecosystem: "npm" }]),
    null,
  );
  assert.equal(cleanDepPackages("lodash"), null);
});

Deno.test("buildDepFindings shapes OSV batch results", () => {
  const packages = [
    { name: "lodash", version: "4.17.20", ecosystem: "npm" as const },
    { name: "requests", version: "2.32.0", ecosystem: "PyPI" as const },
  ];
  const results = [
    {
      vulns: [
        {
          id: "CVE-2019-10744",
          aliases: ["GHSA-4xc9-xhrj-v574"],
          summary: "Prototype pollution in lodash.",
          severity: [{ type: "CVSS_V3", score: "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H" }],
          affected: [
            { ranges: [{ type: "SEMVER", events: [{ introduced: "0" }, { fixed: "4.17.21" }] }] },
          ],
        },
      ],
    },
    {},
  ];
  assert.deepEqual(buildDepFindings(results, packages), [
    {
      package: "lodash",
      version: "4.17.20",
      ecosystem: "npm",
      cves: [
        {
          id: "CVE-2019-10744",
          aliases: ["GHSA-4xc9-xhrj-v574"],
          severity: "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H",
          summary: "Prototype pollution in lodash.",
          fixedVersion: "4.17.21",
        },
      ],
    },
    { package: "requests", version: "2.32.0", ecosystem: "PyPI", cves: [] },
  ]);
});

Deno.test("buildDepFindings rejects misaligned results", () => {
  const packages = [{ name: "a", version: "1", ecosystem: "npm" as const }];
  assert.equal(buildDepFindings([], packages), null);
  assert.equal(buildDepFindings({}, packages), null);
});

Deno.test("findKevEntry matches case-insensitively", () => {
  const feed = {
    vulnerabilities: [
      {
        cveID: "CVE-2024-3094",
        vendorProject: "Tukaani",
        productName: "XZ Utils",
        dateAdded: "2024-03-29",
        shortDescription: "XZ Utils supply chain backdoor.",
        requiredAction: "Apply updates.",
        dueDate: "2024-04-19",
      },
    ],
  };
  const hit = findKevEntry(feed, "cve-2024-3094");
  assert.equal(hit?.inKev, true);
  assert.equal(hit?.product, "XZ Utils");
  assert.equal(findKevEntry(feed, "CVE-2000-0001")?.inKev, false);
  assert.equal(findKevEntry({}, "CVE-2024-3094"), null);
});

Deno.test("parseEpssScore reads string scores", () => {
  const payload = {
    data: [{ cve: "CVE-2024-3094", epss: "0.01234", percentile: "0.85" }],
  };
  assert.deepEqual(parseEpssScore(payload, "CVE-2024-3094"), {
    epss: 0.01234,
    percentile: 0.85,
  });
  assert.equal(parseEpssScore(payload, "CVE-2000-0001"), null);
  assert.equal(parseEpssScore({}, "CVE-2024-3094"), null);
});

Deno.test("cleanKeywords validates watchlists", () => {
  assert.deepEqual(cleanKeywords([" Fortinet ", "fortinet"]), ["Fortinet", "fortinet"]);
  assert.equal(cleanKeywords([]), null);
  assert.equal(cleanKeywords(["  "]), null);
  assert.equal(cleanKeywords("Fortinet"), null);
});

Deno.test("matchKevEntries finds vendor and product hits", () => {
  const feed = {
    vulnerabilities: [
      {
        cveID: "CVE-2024-0001",
        vendorProject: "Acme Corp",
        productName: "Acme VPN",
        dateAdded: "2024-01-01",
        shortDescription: "Buffer overflow.",
        requiredAction: "Apply updates.",
        dueDate: "2024-01-22",
      },
      {
        cveID: "CVE-2024-0002",
        vendorProject: "Other",
        productName: "Other App",
        dateAdded: "2024-02-01",
        shortDescription: "XSS.",
        requiredAction: "Apply updates.",
        dueDate: "2024-02-22",
      },
    ],
  };
  const hits = matchKevEntries(feed, ["acme", "missing"]);
  assert.equal(hits?.length, 1);
  assert.equal(hits?.[0].cveId, "CVE-2024-0001");
  assert.equal(hits?.[0].matchedKeyword, "acme");
  assert.deepEqual(matchKevEntries(feed, ["missing"]), []);
  assert.equal(matchKevEntries({}, ["acme"]), null);
});
