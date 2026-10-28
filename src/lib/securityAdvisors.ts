import { isSupabaseConfigured, supabase } from './supabase'

export type SecurityAdvisorTask = 'compliance' | 'cve'
export type ComplianceFramework = 'NIST CSF 2.0' | 'ISO/IEC 27001:2022'

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
  return analysis
}
