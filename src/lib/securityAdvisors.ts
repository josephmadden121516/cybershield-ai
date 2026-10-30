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
