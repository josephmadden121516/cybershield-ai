export type AuditSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface SyntheticAuditEvent {
  id: string;
  timestamp: string;
  eventType: string;
  severity: AuditSeverity;
  asset: string;
  actor: string;
  correlationId: string;
  summary: string;
  simulated: true;
}

export const MAX_AUDIT_BATCH = 100;
export const DEFAULT_AUDIT_BATCH = 25;

const EVENT_TYPES: Array<{
  type: string;
  severities: AuditSeverity[];
  summaries: string[];
}> = [
  {
    type: "auth.failure",
    severities: ["low", "medium", "high"],
    summaries: [
      "Repeated sign-in failures exceeded the threshold.",
      "Sign-in blocked after too many failed attempts.",
    ],
  },
  {
    type: "auth.success",
    severities: ["info"],
    summaries: ["Interactive sign-in completed."],
  },
  {
    type: "malware.quarantine",
    severities: ["high", "critical"],
    summaries: ["Suspicious file moved to quarantine."],
  },
  {
    type: "firewall.block",
    severities: ["low", "medium"],
    summaries: ["Outbound connection to untrusted host blocked."],
  },
  {
    type: "patch.applied",
    severities: ["info"],
    summaries: ["Scheduled security update applied successfully."],
  },
  {
    type: "config.change",
    severities: ["medium"],
    summaries: ["Security policy setting modified."],
  },
  {
    type: "data.export",
    severities: ["medium", "high"],
    summaries: ["Large export from shared storage detected."],
  },
  {
    type: "phishing.report",
    severities: ["low", "medium"],
    summaries: ["Suspicious message reported for review."],
  },
];

const ASSETS = [
  "sim-fw-01",
  "sim-ws-04",
  "sim-ws-12",
  "sim-srv-files-02",
  "sim-mx-01",
  "sim-vpn-gw-01",
];

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hex(random: () => number, length: number): string {
  let out = "";
  const digits = "0123456789abcdef";
  for (let i = 0; i < length; i++) {
    out += digits[Math.floor(random() * 16)];
  }
  return out;
}

export function generateSyntheticAuditEvents(
  count: number,
  seed: number = Math.floor(Math.random() * 2 ** 31),
): SyntheticAuditEvent[] {
  const bounded = Math.max(1, Math.min(MAX_AUDIT_BATCH, Math.floor(count)));
  const random = mulberry32(seed);
  const now = Date.now();
  const events: SyntheticAuditEvent[] = [];
  let currentCorrelation = `sim-corr-${hex(random, 8)}`;
  let remainingInCorrelation = 1 + Math.floor(random() * 3);

  for (let i = 0; i < bounded; i++) {
    if (remainingInCorrelation <= 0) {
      currentCorrelation = `sim-corr-${hex(random, 8)}`;
      remainingInCorrelation = 1 + Math.floor(random() * 3);
    }
    remainingInCorrelation--;

    const template = EVENT_TYPES[Math.floor(random() * EVENT_TYPES.length)];
    const severity =
      template.severities[Math.floor(random() * template.severities.length)];
    const asset = ASSETS[Math.floor(random() * ASSETS.length)];
    const actor = `sim.user.${String(1 + Math.floor(random() * 40)).padStart(2, "0")}@example.invalid`;
    const minutesAgo = Math.floor(random() * 24 * 60);

    events.push({
      id: `sim-evt-${hex(random, 8)}`,
      timestamp: new Date(now - minutesAgo * 60_000).toISOString(),
      eventType: template.type,
      severity,
      asset,
      actor,
      correlationId: currentCorrelation,
      summary:
        template.summaries[Math.floor(random() * template.summaries.length)],
      simulated: true,
    });
  }

  events.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return events;
}
