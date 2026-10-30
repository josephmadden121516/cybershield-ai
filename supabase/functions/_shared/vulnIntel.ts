// Pure helpers for the depscan + exploitintel edge tasks (no network here,
// so they stay unit-testable). All sources are public, read-only databases:
// OSV.dev (known CVEs per package version), CISA KEV (actively exploited),
// FIRST EPSS (exploitation probability). Nothing here touches a live target.

export interface DepPackage {
  name: string;
  version: string;
  ecosystem: "npm" | "PyPI" | "Go";
}

export interface DepCve {
  id: string;
  aliases: string[];
  severity: string | null;
  summary: string;
  fixedVersion: string | null;
}

export interface DepFinding {
  package: string;
  version: string;
  ecosystem: string;
  cves: DepCve[];
}

export interface KevMatch {
  inKev: boolean;
  vendorProject: string | null;
  product: string | null;
  dateAdded: string | null;
  shortDescription: string | null;
  requiredAction: string | null;
  dueDate: string | null;
}

export interface EpssScore {
  epss: number | null;
  percentile: number | null;
}

const CVE_PATTERN = /^CVE-\d{4}-\d{4,}$/;

export function normalizeCveId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toUpperCase();
  return CVE_PATTERN.test(trimmed) ? trimmed : null;
}

export function cleanDepPackages(value: unknown): DepPackage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    return null;
  }
  const ecosystems = ["npm", "PyPI", "Go"];
  const packages: DepPackage[] = [];
  for (const entry of value) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      return null;
    }
    const record = entry as Record<string, unknown>;
    if (
      typeof record.name !== "string" ||
      !record.name.trim() ||
      record.name.length > 200 ||
      typeof record.version !== "string" ||
      !record.version.trim() ||
      record.version.length > 50 ||
      typeof record.ecosystem !== "string" ||
      !ecosystems.includes(record.ecosystem)
    ) {
      return null;
    }
    packages.push({
      name: record.name.trim(),
      version: record.version.trim(),
      ecosystem: record.ecosystem as DepPackage["ecosystem"],
    });
  }
  return packages;
}

function nonEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const items: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) items.push(item.trim());
  }
  return items;
}

/** Pick a CVSS v3 score when present, else the first score available. */
function pickSeverity(vuln: Record<string, unknown>): string | null {
  if (!Array.isArray(vuln.severity)) return null;
  let fallback: string | null = null;
  for (const entry of vuln.severity) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.score !== "string" || !record.score.trim()) continue;
    const score = record.score.trim();
    if (record.type === "CVSS_V3") return score;
    fallback = fallback ?? score;
  }
  return fallback;
}

/** First fixed version across all affected ranges, if any. */
function pickFixedVersion(vuln: Record<string, unknown>): string | null {
  if (!Array.isArray(vuln.affected)) return null;
  for (const entry of vuln.affected) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const affected = entry as Record<string, unknown>;
    if (!Array.isArray(affected.ranges)) continue;
    for (const range of affected.ranges) {
      if (range === null || typeof range !== "object" || Array.isArray(range)) {
        continue;
      }
      const events = (range as Record<string, unknown>).events;
      if (!Array.isArray(events)) continue;
      for (const event of events) {
        if (event === null || typeof event !== "object" || Array.isArray(event)) {
          continue;
        }
        const fixed = (event as Record<string, unknown>).fixed;
        if (typeof fixed === "string" && fixed.trim()) return fixed.trim();
      }
    }
  }
  return null;
}

/**
 * Shape one OSV v1/querybatch `results` array into per-package findings.
 * `results[i]` aligns with `packages[i]`; missing entries mean no vulns.
 */
export function buildDepFindings(
  results: unknown,
  packages: DepPackage[],
): DepFinding[] | null {
  if (!Array.isArray(results) || results.length !== packages.length) {
    return null;
  }
  return packages.map((pkg, index) => {
    const entry = results[index];
    const cves: DepCve[] = [];
    if (
      entry !== null && typeof entry === "object" && !Array.isArray(entry)
    ) {
      const vulns = (entry as Record<string, unknown>).vulns;
      if (Array.isArray(vulns)) {
        for (const vuln of vulns) {
          if (
            vuln === null || typeof vuln !== "object" || Array.isArray(vuln)
          ) {
            continue;
          }
          const record = vuln as Record<string, unknown>;
          if (typeof record.id !== "string" || !record.id.trim()) continue;
          cves.push({
            id: record.id.trim(),
            aliases: cleanStringArray(record.aliases),
            severity: pickSeverity(record),
            summary: nonEmpty(record.summary) || nonEmpty(record.details),
            fixedVersion: pickFixedVersion(record),
          });
        }
      }
    }
    return {
      package: pkg.name,
      version: pkg.version,
      ecosystem: pkg.ecosystem,
      cves,
    };
  });
}

export function findKevEntry(feed: unknown, cveId: string): KevMatch | null {
  if (feed === null || typeof feed !== "object" || Array.isArray(feed)) {
    return null;
  }
  const list = (feed as Record<string, unknown>).vulnerabilities;
  if (!Array.isArray(list)) return null;
  const wanted = cveId.toUpperCase();
  for (const entry of list) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    if (
      typeof record.cveID === "string" &&
      record.cveID.toUpperCase() === wanted
    ) {
      const text = (key: string): string | null => {
        const value = record[key];
        return typeof value === "string" && value.trim() ? value.trim() : null;
      };
      return {
        inKev: true,
        vendorProject: text("vendorProject"),
        product: text("productName"),
        dateAdded: text("dateAdded"),
        shortDescription: text("shortDescription"),
        requiredAction: text("requiredAction"),
        dueDate: text("dueDate"),
      };
    }
  }
  return {
    inKev: false,
    vendorProject: null,
    product: null,
    dateAdded: null,
    shortDescription: null,
    requiredAction: null,
    dueDate: null,
  };
}

export function parseEpssScore(payload: unknown, cveId: string): EpssScore | null {
  if (
    payload === null || typeof payload !== "object" || Array.isArray(payload)
  ) {
    return null;
  }
  const list = (payload as Record<string, unknown>).data;
  if (!Array.isArray(list)) return null;
  const wanted = cveId.toUpperCase();
  for (const entry of list) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    if (
      typeof record.cve === "string" && record.cve.toUpperCase() === wanted
    ) {
      const epss = Number(record.epss);
      const percentile = Number(record.percentile);
      return {
        epss: Number.isFinite(epss) ? epss : null,
        percentile: Number.isFinite(percentile) ? percentile : null,
      };
    }
  }
  return null;
}
