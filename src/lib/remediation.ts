import { isSupabaseConfigured, supabase } from './supabase'
import { assertWithinDailyBudget, trackUsage } from './usageMeter'

export type RemediationFileKind =
  | 'dockerfile'
  | 'terraform'
  | 'kubernetes'
  | 'code'

export interface RemediationVulnerability {
  id: string
  severity: string
  type: string
}

export interface RemediationRequest {
  vulnerability: RemediationVulnerability
  codeSnippet: string
  fileKind: RemediationFileKind
  codeLanguage: string
}

export interface RemediationPatch {
  patchedCode: string
  risk: string
  rationale: string
  validationSteps: string[]
  rollbackSteps: string[]
}

const MAX_CODE_SNIPPET_LENGTH = 12000
const MAX_FIELD_LENGTH = 200
const MAX_LANGUAGE_LENGTH = 64
export const MAX_REFINEMENT_LENGTH = 2000

const FILE_KIND_LANGUAGES: Record<
  Exclude<RemediationFileKind, 'code'>,
  string
> = {
  dockerfile: 'Dockerfile',
  terraform: 'Terraform',
  kubernetes: 'Kubernetes YAML',
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string')
  )
}

interface ValidatedRemediationInput {
  vulnerability: RemediationVulnerability
  codeSnippet: string
  language: string
}

function validateRemediationInput(request: RemediationRequest): ValidatedRemediationInput {
  const { vulnerability, fileKind } = request
  const codeSnippet = request.codeSnippet.trim()
  if (!codeSnippet) {
    throw new Error('Provide a code snippet to remediate.')
  }
  if (codeSnippet.length > MAX_CODE_SNIPPET_LENGTH) {
    throw new Error(
      `Code snippet must be ${MAX_CODE_SNIPPET_LENGTH} characters or fewer.`
    )
  }

  for (const field of ['id', 'severity', 'type'] as const) {
    const value = vulnerability[field]
    if (!isNonEmptyString(value)) {
      throw new Error(`Vulnerability ${field} is required.`)
    }
    if (value.length > MAX_FIELD_LENGTH) {
      throw new Error(`Vulnerability ${field} is too long.`)
    }
  }

  const language =
    fileKind === 'code'
      ? request.codeLanguage.trim() || 'TypeScript'
      : FILE_KIND_LANGUAGES[fileKind]
  if (language.length > MAX_LANGUAGE_LENGTH) {
    throw new Error('Language name is too long.')
  }

  return {
    vulnerability: {
      id: vulnerability.id.trim(),
      severity: vulnerability.severity.trim(),
      type: vulnerability.type.trim(),
    },
    codeSnippet,
    language,
  }
}

async function callRemediation(
  body: Record<string, unknown>
): Promise<RemediationPatch> {
  assertWithinDailyBudget()
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Remediation is not configured. Check the Supabase environment settings.'
    )
  }

  const { data, error } = await supabase.functions.invoke(
    'generate-remediation',
    { body }
  )

  if (error) throw error

  if (
    !data ||
    !isNonEmptyString(data.patchedCode) ||
    !isNonEmptyString(data.risk) ||
    !isNonEmptyString(data.rationale) ||
    !isStringArray(data.validationSteps) ||
    !isStringArray(data.rollbackSteps)
  ) {
    throw new Error('The AI service returned an unreadable remediation.')
  }
  trackUsage(data)

  return {
    patchedCode: data.patchedCode,
    risk: data.risk,
    rationale: data.rationale,
    validationSteps: data.validationSteps,
    rollbackSteps: data.rollbackSteps,
  }
}

export async function requestRemediationPatch(
  request: RemediationRequest,
  uiLanguage: 'en' | 'es'
): Promise<RemediationPatch> {
  const input = validateRemediationInput(request)
  return callRemediation({
    vulnerability: input.vulnerability,
    codeSnippet: input.codeSnippet,
    language: input.language,
    uiLanguage,
  })
}

export interface RemediationRefinementRequest extends RemediationRequest {
  priorPatch: RemediationPatch
  followup: string
}

export async function refineRemediationPatch(
  request: RemediationRefinementRequest,
  uiLanguage: 'en' | 'es'
): Promise<RemediationPatch> {
  const followup = request.followup.trim()
  if (!followup) {
    throw new Error('Describe the extra hardening you want.')
  }
  if (followup.length > MAX_REFINEMENT_LENGTH) {
    throw new Error(
      `Refinement request must be ${MAX_REFINEMENT_LENGTH} characters or fewer.`
    )
  }
  const input = validateRemediationInput(request)
  return callRemediation({
    vulnerability: input.vulnerability,
    codeSnippet: input.codeSnippet,
    language: input.language,
    uiLanguage,
    priorPatch: JSON.stringify(request.priorPatch),
    followup,
  })
}
