import { isSupabaseConfigured, supabase } from './supabase'
import { assertWithinDailyBudget, trackUsage } from './usageMeter'

export type SecurityAdvisorTask = 'compliance' | 'cve'
export type ComplianceFramework =
  | 'NIST CSF 2.0'
  | 'ISO/IEC 27001:2022'
  | 'GDPR'
  | 'PCI DSS'
  | 'EU AI Act'

const MAX_ADVISOR_INPUT_LENGTH = 12000

export async function requestSecurityAdvisor(
  task: SecurityAdvisorTask,
  message: string,
  language: 'en' | 'es',
  frameworks?: ComplianceFramework[]
): Promise<string> {
  const trimmedMessage = message.trim()
  if (!trimmedMessage) {
    throw new Error('Provide assessment details before requesting guidance.')
  }
  if (trimmedMessage.length > MAX_ADVISOR_INPUT_LENGTH) {
    throw new Error(`Input must be ${MAX_ADVISOR_INPUT_LENGTH} characters or fewer.`)
  }
  if (task === 'compliance' && (!frameworks || frameworks.length === 0)) {
    throw new Error('Select at least one framework.')
  }
  assertWithinDailyBudget()
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('AI guidance is not configured. Check the Supabase environment settings.')
  }

  const { data, error } = await supabase.functions.invoke('analyze-threat', {
    body: {
      task,
      message: trimmedMessage,
      language,
      ...(task === 'compliance' ? { frameworks } : {}),
    },
  })

  if (error) throw error

  const analysis = typeof data?.analysis === 'string' ? data.analysis.trim() : ''
  if (!analysis) {
    throw new Error('The AI service returned no guidance.')
  }
  trackUsage(data)
  return analysis
}

export interface AttackPath {
  title: string
  steps: string[]
}

export interface AttackTreeSimulation {
  scenarioTitle: string
  attackPaths: AttackPath[]
  blastRadius: string
  defensiveControls: string[]
  mitigations: string[]
  hypotheticalNote: string
}

const MAX_SCENARIO_LENGTH = 500

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  )
}

function isAttackTreeSimulation(value: unknown): value is AttackTreeSimulation {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const record = value as Record<string, unknown>
  if (
    !isNonEmptyString(record.scenarioTitle) ||
    !isNonEmptyString(record.blastRadius) ||
    !isNonEmptyString(record.hypotheticalNote) ||
    !isStringArray(record.defensiveControls) ||
    !isStringArray(record.mitigations) ||
    !Array.isArray(record.attackPaths) ||
    record.attackPaths.length === 0
  ) {
    return false
  }
  return record.attackPaths.every((path) => {
    if (path === null || typeof path !== 'object' || Array.isArray(path)) {
      return false
    }
    const entry = path as Record<string, unknown>
    return (
      isNonEmptyString(entry.title) &&
      isStringArray(entry.steps) &&
      entry.steps.length > 0
    )
  })
}

export async function requestAttackTreeSimulation(
  scenario: string,
  assets: string,
  language: 'en' | 'es'
): Promise<AttackTreeSimulation> {
  const trimmedScenario = scenario.trim()
  const trimmedAssets = assets.trim()
  if (!trimmedScenario) {
    throw new Error('Select a threat scenario.')
  }
  if (trimmedScenario.length > MAX_SCENARIO_LENGTH) {
    throw new Error(
      `Scenario must be ${MAX_SCENARIO_LENGTH} characters or fewer.`
    )
  }
  if (!trimmedAssets) {
    throw new Error('Describe the assets to protect.')
  }
  if (trimmedAssets.length > MAX_ADVISOR_INPUT_LENGTH) {
    throw new Error(
      `Assets must be ${MAX_ADVISOR_INPUT_LENGTH} characters or fewer.`
    )
  }
  assertWithinDailyBudget()
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'AI guidance is not configured. Check the Supabase environment settings.'
    )
  }

  const { data, error } = await supabase.functions.invoke('analyze-threat', {
    body: {
      task: 'attacktree',
      scenario: trimmedScenario,
      assets: trimmedAssets,
      language,
    },
  })

  if (error) throw error
  if (!isAttackTreeSimulation(data?.simulation)) {
    throw new Error('The AI service returned an unreadable simulation.')
  }
  trackUsage(data)
  return data.simulation
}

export interface PhishDrill {
  lureTitle: string
  subject: string
  sender: string
  body: string
  redFlags: string[]
  teachingNotes: string[]
  debrief: string
}

const MAX_DRILL_TYPE_LENGTH = 200

function isPhishDrill(value: unknown): value is PhishDrill {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    isNonEmptyString(record.lureTitle) &&
    isNonEmptyString(record.subject) &&
    isNonEmptyString(record.sender) &&
    isNonEmptyString(record.body) &&
    isStringArray(record.redFlags) &&
    record.redFlags.length > 0 &&
    isStringArray(record.teachingNotes) &&
    isNonEmptyString(record.debrief)
  )
}

export async function requestPhishDrill(
  drillType: string,
  audience: string,
  language: 'en' | 'es'
): Promise<PhishDrill> {
  const trimmedDrillType = drillType.trim()
  const trimmedAudience = audience.trim()
  if (!trimmedDrillType) {
    throw new Error('Select a drill type.')
  }
  if (trimmedDrillType.length > MAX_DRILL_TYPE_LENGTH) {
    throw new Error(
      `Drill type must be ${MAX_DRILL_TYPE_LENGTH} characters or fewer.`
    )
  }
  if (!trimmedAudience) {
    throw new Error('Describe the training audience.')
  }
  if (trimmedAudience.length > MAX_ADVISOR_INPUT_LENGTH) {
    throw new Error(
      `Audience must be ${MAX_ADVISOR_INPUT_LENGTH} characters or fewer.`
    )
  }
  assertWithinDailyBudget()
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'AI guidance is not configured. Check the Supabase environment settings.'
    )
  }

  const { data, error } = await supabase.functions.invoke('analyze-threat', {
    body: {
      task: 'phishdrill',
      drillType: trimmedDrillType,
      audience: trimmedAudience,
      language,
    },
  })

  if (error) throw error
  if (!isPhishDrill(data?.drill)) {
    throw new Error('The AI service returned an unreadable drill.')
  }
  trackUsage(data)
  return data.drill
}

export interface PhishGameRound {
  subject: string
  sender: string
  body: string
  isPhish: boolean
  verdict: string
  redFlags: string[]
}

export interface PhishGamePack {
  rounds: PhishGameRound[]
}

function isPhishGameRound(value: unknown): value is PhishGameRound {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    isNonEmptyString(record.subject) &&
    isNonEmptyString(record.sender) &&
    isNonEmptyString(record.body) &&
    typeof record.isPhish === 'boolean' &&
    isNonEmptyString(record.verdict) &&
    isStringArray(record.redFlags)
  )
}

function isPhishGamePack(value: unknown): value is PhishGamePack {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    Array.isArray(record.rounds) &&
    record.rounds.length > 0 &&
    record.rounds.every(isPhishGameRound)
  )
}

export async function requestPhishingGamePack(
  language: 'en' | 'es',
  rounds = 5
): Promise<PhishGamePack> {
  if (!Number.isInteger(rounds) || rounds < 3 || rounds > 8) {
    throw new Error('Rounds must be a whole number from 3 to 8.')
  }
  assertWithinDailyBudget()
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'AI guidance is not configured. Check the Supabase environment settings.'
    )
  }

  const { data, error } = await supabase.functions.invoke('analyze-threat', {
    body: {
      task: 'phishgame',
      rounds,
      language,
    },
  })

  if (error) throw error
  if (!isPhishGamePack(data?.pack)) {
    throw new Error('The AI service returned an unreadable game.')
  }
  trackUsage(data)
  return data.pack
}

export async function requestDailyDigest(
  sourceText: string,
  language: 'en' | 'es'
): Promise<string> {
  const trimmed = sourceText.trim()
  if (!trimmed) {
    throw new Error('There is no activity to summarize yet.')
  }
  if (trimmed.length > MAX_ADVISOR_INPUT_LENGTH) {
    throw new Error(
      `Input must be ${MAX_ADVISOR_INPUT_LENGTH} characters or fewer.`
    )
  }
  assertWithinDailyBudget()
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'AI guidance is not configured. Check the Supabase environment settings.'
    )
  }

  const { data, error } = await supabase.functions.invoke('analyze-threat', {
    body: {
      task: 'digest',
      message: trimmed,
      language,
    },
  })

  if (error) throw error
  const digest =
    typeof data?.analysis === 'string' ? data.analysis.trim() : ''
  if (!digest) {
    throw new Error('The AI service returned no digest.')
  }
  trackUsage(data)
  return digest
}

export async function requestPlainExplanation(
  finding: string,
  language: 'en' | 'es'
): Promise<string> {
  const trimmed = finding.trim()
  if (!trimmed) {
    throw new Error('There is no finding to explain yet.')
  }
  if (trimmed.length > MAX_ADVISOR_INPUT_LENGTH) {
    throw new Error(
      `Input must be ${MAX_ADVISOR_INPUT_LENGTH} characters or fewer.`
    )
  }
  assertWithinDailyBudget()
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'AI guidance is not configured. Check the Supabase environment settings.'
    )
  }

  const { data, error } = await supabase.functions.invoke('analyze-threat', {
    body: {
      task: 'explain',
      message: trimmed,
      language,
    },
  })

  if (error) throw error
  const explanation =
    typeof data?.analysis === 'string' ? data.analysis.trim() : ''
  if (!explanation) {
    throw new Error('The AI service returned no explanation.')
  }
  trackUsage(data)
  return explanation
}

export async function requestNarrativePolish(
  briefing: string,
  language: 'en' | 'es'
): Promise<string> {
  const trimmed = briefing.trim()
  if (!trimmed) {
    throw new Error('Generate a briefing before polishing it.')
  }
  if (trimmed.length > MAX_ADVISOR_INPUT_LENGTH) {
    throw new Error(
      `Input must be ${MAX_ADVISOR_INPUT_LENGTH} characters or fewer.`
    )
  }
  assertWithinDailyBudget()
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'AI guidance is not configured. Check the Supabase environment settings.'
    )
  }

  const { data, error } = await supabase.functions.invoke('analyze-threat', {
    body: {
      task: 'polish',
      message: trimmed,
      language,
    },
  })

  if (error) throw error
  const polished =
    typeof data?.analysis === 'string' ? data.analysis.trim() : ''
  if (!polished) {
    throw new Error('The AI service returned no polished briefing.')
  }
  trackUsage(data)
  return polished
}

export async function requestIncidentTimeline(
  notes: string,
  language: 'en' | 'es'
): Promise<string> {
  const trimmed = notes.trim()
  if (!trimmed) {
    throw new Error('Paste incident notes to reconstruct.')
  }
  if (trimmed.length > MAX_ADVISOR_INPUT_LENGTH) {
    throw new Error(
      `Input must be ${MAX_ADVISOR_INPUT_LENGTH} characters or fewer.`
    )
  }
  assertWithinDailyBudget()
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'AI guidance is not configured. Check the Supabase environment settings.'
    )
  }

  const { data, error } = await supabase.functions.invoke('analyze-threat', {
    body: {
      task: 'timeline',
      message: trimmed,
      language,
    },
  })

  if (error) throw error
  const timeline =
    typeof data?.analysis === 'string' ? data.analysis.trim() : ''
  if (!timeline) {
    throw new Error('The AI service returned no timeline.')
  }
  trackUsage(data)
  return timeline
}

export interface DepScanPackage {
  name: string
  version: string
  ecosystem: 'npm' | 'PyPI' | 'Go'
}

export interface DepScanCve {
  id: string
  aliases: string[]
  severity: string | null
  summary: string
  fixedVersion: string | null
}

export interface DepScanFinding {
  package: string
  version: string
  ecosystem: string
  cves: DepScanCve[]
}

function isDepScanFinding(value: unknown): value is DepScanFinding {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    isNonEmptyString(record.package) &&
    isNonEmptyString(record.version) &&
    isNonEmptyString(record.ecosystem) &&
    Array.isArray(record.cves) &&
    record.cves.every(
      (cve): cve is DepScanCve =>
        cve !== null &&
        typeof cve === 'object' &&
        !Array.isArray(cve) &&
        isNonEmptyString((cve as Record<string, unknown>).id) &&
        isStringArray((cve as Record<string, unknown>).aliases) &&
        isNonEmptyString((cve as Record<string, unknown>).summary)
    )
  )
}

/**
 * Scan exact package versions against the public OSV database. A pure data
 * lookup: no model call, no credits, and nothing touches a live target.
 */
export async function requestDependencyScan(
  packages: DepScanPackage[]
): Promise<DepScanFinding[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Scanning is not configured. Check the Supabase environment settings.'
    )
  }

  const { data, error } = await supabase.functions.invoke('analyze-threat', {
    body: { task: 'depscan', packages },
  })

  if (error) throw error
  if (
    !data ||
    !Array.isArray(data.findings) ||
    !data.findings.every(isDepScanFinding)
  ) {
    throw new Error('The scan service returned an unreadable result.')
  }
  return data.findings
}

export interface KevIntel {
  inKev: boolean
  vendorProject: string | null
  product: string | null
  dateAdded: string | null
  shortDescription: string | null
  requiredAction: string | null
  dueDate: string | null
}

export interface EpssIntel {
  epss: number | null
  percentile: number | null
}

export interface ExploitIntel {
  cve: string
  kev: KevIntel | null
  kevAvailable: boolean
  epss: EpssIntel | null
  epssAvailable: boolean
}

function isExploitIntel(value: unknown): value is ExploitIntel {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    isNonEmptyString(record.cve) &&
    typeof record.kevAvailable === 'boolean' &&
    typeof record.epssAvailable === 'boolean'
  )
}

/**
 * Look up public exploitability signals for one CVE: CISA's actively-
 * exploited catalog plus the FIRST EPSS probability score. Read-only
 * database lookups; nothing is executed or probed.
 */
export async function requestExploitIntel(cve: string): Promise<ExploitIntel> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Exploit intel is not configured. Check the Supabase environment settings.'
    )
  }

  const { data, error } = await supabase.functions.invoke('analyze-threat', {
    body: { task: 'exploitintel', cve },
  })

  if (error) throw error
  if (!isExploitIntel(data?.intel)) {
    throw new Error('The intel service returned an unreadable result.')
  }
  return data.intel
}

export interface KevWatchHit {
  cveId: string
  vendorProject: string | null
  product: string | null
  dateAdded: string | null
  shortDescription: string | null
  requiredAction: string | null
  dueDate: string | null
  matchedKeyword: string
}

export interface KevWatchResult {
  matches: KevWatchHit[]
  checkedAt: string
}

function isKevWatchHit(value: unknown): value is KevWatchHit {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    isNonEmptyString(record.cveId) &&
    isNonEmptyString(record.matchedKeyword)
  )
}

/**
 * Match a watchlist against CISA's actively-exploited catalog. A free
 * read-only lookup; nothing is scanned or probed.
 */
export async function requestKevWatch(
  keywords: string[]
): Promise<KevWatchResult> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'The watcher is not configured. Check the Supabase environment settings.'
    )
  }

  const { data, error } = await supabase.functions.invoke('analyze-threat', {
    body: { task: 'kevwatch', keywords },
  })

  if (error) throw error
  if (
    !data ||
    !Array.isArray(data.matches) ||
    !data.matches.every(isKevWatchHit) ||
    typeof data.checkedAt !== 'string'
  ) {
    throw new Error('The watcher returned an unreadable result.')
  }
  return { matches: data.matches, checkedAt: data.checkedAt }
}

export interface UrlCheckResult {
  url: string
  hostname: string
  verdict: 'Safe' | 'Suspicious' | 'Dangerous'
  reasons: string[]
  gsbAvailable: boolean
  gsbMatch: boolean
  domainAgeDays: number | null
  ageAvailable: boolean
  typoFlags: string[]
}

function isUrlCheckResult(value: unknown): value is UrlCheckResult {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    isNonEmptyString(record.url) &&
    isNonEmptyString(record.hostname) &&
    (record.verdict === 'Safe' ||
      record.verdict === 'Suspicious' ||
      record.verdict === 'Dangerous') &&
    Array.isArray(record.reasons) &&
    record.reasons.every(isNonEmptyString) &&
    typeof record.gsbAvailable === 'boolean' &&
    typeof record.gsbMatch === 'boolean' &&
    (record.domainAgeDays === null ||
      typeof record.domainAgeDays === 'number') &&
    typeof record.ageAvailable === 'boolean' &&
    Array.isArray(record.typoFlags) &&
    record.typoFlags.every(isNonEmptyString)
  )
}

/**
 * Check a URL against Google Safe Browsing (when a key is configured),
 * domain-age records, and lookalike heuristics. Read-only lookups; the
 * page is never opened and nothing is executed.
 */
export async function requestUrlCheck(url: string): Promise<UrlCheckResult> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Link check is not configured. Check the Supabase environment settings.'
    )
  }

  const { data, error } = await supabase.functions.invoke('analyze-threat', {
    body: { task: 'urlcheck', url },
  })

  if (error) throw error
  if (!isUrlCheckResult(data)) {
    throw new Error('The link checker returned an unreadable result.')
  }
  return data
}
