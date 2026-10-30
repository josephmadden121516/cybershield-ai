// Pure helpers for the urlcheck edge task. Typosquat detection and verdict
// logic stay here (unit-tested); network lookups live in the edge handler.

export interface TypoSquatFlags {
  flags: string[];
}

const WATCH_BRANDS = [
  "microsoft",
  "office365",
  "outlook",
  "apple",
  "icloud",
  "google",
  "gmail",
  "amazon",
  "paypal",
  "okta",
  "chase",
  "bankofamerica",
  "wellsfargo",
  "instagram",
  "facebook",
  "netflix",
  "dhl",
  "fedex",
  "irs",
];

const RISKY_TLDS = [
  "zip",
  "mov",
  "tk",
  "ml",
  "ga",
  "cf",
  "gq",
  "top",
  "xyz",
  "buzz",
  "sbs",
  "cyou",
];

/** Canonicalize user input into a URL object, or null when unusable. */
export function cleanTargetUrl(value: unknown): URL | null {
  if (typeof value !== "string") return null;
  let trimmed = value.trim();
  if (!trimmed || trimmed.length > 2000) return null;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) trimmed = `https://${trimmed}`;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    if (!parsed.hostname || parsed.username || parsed.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

function levenshtein(a: string, b: string): number {
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    rows.push([i]);
    for (let j = 1; j <= b.length; j++) {
      rows[i].push(0);
    }
  }
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return rows[a.length][b.length];
}

function rootSecondLevel(hostname: string): { sld: string; tld: string } {
  const parts = hostname.toLowerCase().split(".").filter(Boolean);
  if (parts.length < 2) return { sld: parts[0] ?? "", tld: "" };
  // Best-effort public-suffix handling for common two-part suffixes.
  const twoPart = new Set(["co.uk", "com.au", "co.jp", "com.br", "co.in"]);
  const lastTwo = parts.slice(-2).join(".");
  if (twoPart.has(lastTwo) && parts.length >= 3) {
    return { sld: parts[parts.length - 3], tld: lastTwo };
  }
  return { sld: parts[parts.length - 2], tld: parts[parts.length - 1] };
}

/**
 * Inspect a hostname for lookalike/phishing traits. Returns short,
 * user-facing flag strings (empty when nothing looks off).
 */
export function detectTypoSquat(hostname: string): string[] {
  const flags: string[] = [];
  const host = hostname.toLowerCase();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[") ) {
    flags.push("Host is a raw IP address, not a named domain.");
    return flags;
  }
  const { sld, tld } = rootSecondLevel(host);
  if (!sld) return flags;
  if (host.includes("xn--")) {
    flags.push("Internationalized domain name (punycode), often used to mimic real brands.");
  }
  if (RISKY_TLDS.includes(tld)) {
    flags.push(`Unusual top-level domain ".${tld}", common in short-lived phishing sites.`);
  }
  const subdomains = host.split(".").length - sld.split(".").length - tld.split(".").length;
  if (subdomains >= 3) {
    flags.push("Deeply nested subdomains, often used to bury the real domain.");
  }
  const squashed = sld.replace(/[^a-z0-9]/g, "");
  for (const brand of WATCH_BRANDS) {
    if (squashed === brand) continue;
    if (squashed.includes(brand) && squashed.length > brand.length) {
      flags.push(`Second-level domain contains "${brand}" with extra characters.`);
      break;
    }
    const distance = levenshtein(squashed, brand);
    if (distance > 0 && distance <= 2 && squashed.length >= 4) {
      flags.push(`Second-level domain is ${distance} change(s) away from "${brand}".`);
      break;
    }
  }
  if (/[0-9]/.test(squashed) && /[a-z]/.test(squashed)) {
    const deswapped = squashed.replace(/0/g, "o").replace(/1/g, "l");
    for (const brand of WATCH_BRANDS) {
      if (deswapped === brand || deswapped.includes(brand)) {
        flags.push("Letter/number swaps (0 for o, 1 for l) resembling a known brand.");
        break;
      }
    }
  }
  return [...new Set(flags)];
}

export type UrlVerdict = "Safe" | "Suspicious" | "Dangerous";

export interface VerdictInput {
  gsbMatch: boolean;
  gsbAvailable: boolean;
  domainAgeDays: number | null;
  ageAvailable: boolean;
  typoFlags: string[];
}

/**
 * Deterministic verdict: blocklist hits are dangerous; young domains or
 * lookalike traits are suspicious; otherwise safe (with caveats surfaced
 * by the caller when a source was unavailable).
 */
export function buildVerdict(input: VerdictInput): { verdict: UrlVerdict; reasons: string[] } {
  const reasons: string[] = [];
  if (input.gsbMatch) {
    reasons.push("Listed as unsafe by Google Safe Browsing.");
    return { verdict: "Dangerous", reasons };
  }
  if (input.ageAvailable && input.domainAgeDays !== null && input.domainAgeDays < 30) {
    reasons.push(
      `Domain is about ${Math.max(input.domainAgeDays, 0)} day(s) old; phishing domains are often brand new.`,
    );
  }
  for (const flag of input.typoFlags) reasons.push(flag);
  if (reasons.length > 0) return { verdict: "Suspicious", reasons };
  if (!input.gsbAvailable || !input.ageAvailable) {
    reasons.push("Some checks were unavailable; treat this as a weak all-clear.");
    return { verdict: "Suspicious", reasons };
  }
  return { verdict: "Safe", reasons: ["No blocklist hits, established domain, no lookalike traits."] };
}

/** Pull a creation date out of an RDAP response, if present. */
export function rdapCreationDate(payload: unknown): string | null {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const events = (payload as Record<string, unknown>).events;
  if (!Array.isArray(events)) return null;
  for (const event of events) {
    if (event === null || typeof event !== "object" || Array.isArray(event)) {
      continue;
    }
    const record = event as Record<string, unknown>;
    if (
      record.eventAction === "registration" &&
      typeof record.eventDate === "string" &&
      !Number.isNaN(Date.parse(record.eventDate))
    ) {
      return record.eventDate;
    }
  }
  return null;
}

/** Whole days between now and an ISO date string. */
export function daysSince(isoDate: string, nowMs = Date.now()): number {
  return Math.max(0, Math.floor((nowMs - Date.parse(isoDate)) / 86_400_000));
}
