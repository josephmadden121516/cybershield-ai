import { useState, type FormEvent } from 'react'
import { requestSecurityAdvisor } from '../lib/securityAdvisors'

const MAX_TRIAGE_INPUT_LENGTH = 12000

interface CveTriageAssistantProps {
  language: 'en' | 'es'
}

export function CveTriageAssistant({ language }: CveTriageAssistantProps) {
  const isEs = language === 'es'
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submitTriage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setLoading(true)
    setResult('')
    setErrorMessage('')
    try {
      const guidance = await requestSecurityAdvisor('cve', input, language)
      setResult(guidance)
    } catch (error) {
      console.error('Could not generate vulnerability triage guidance.', error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEs
            ? 'No se pudo generar la orientación de vulnerabilidades.'
            : 'Could not generate vulnerability triage guidance.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      id="cve-triage"
      className="content-card cve-triage"
      aria-labelledby="cve-triage-title"
    >
      <div className="card-heading">
        <div>
          <h2 id="cve-triage-title">
            {isEs ? 'Asistente de priorización de vulnerabilidades' : 'CVE & vulnerability triage'}
          </h2>
          <p>
            {isEs
              ? 'Pega un CVE o un extracto de un informe de vulnerabilidades para obtener una lista defensiva de prioridades y parches.'
              : 'Paste a CVE or vulnerability report excerpt for defensive prioritization and patch guidance.'}
          </p>
        </div>
        <span className="demo-tag">{isEs ? 'ORIENTACIÓN CON IA' : 'AI GUIDANCE'}</span>
      </div>

      <form onSubmit={(event) => void submitTriage(event)}>
        <label htmlFor="cve-triage-input">
          {isEs ? 'CVE o salida del escáner' : 'CVE or scanner output'}
        </label>
        <textarea
          id="cve-triage-input"
          value={input}
          maxLength={MAX_TRIAGE_INPUT_LENGTH}
          disabled={loading}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => {
            setInput(event.target.value)
            setResult('')
            setErrorMessage('')
          }}
          placeholder={
            isEs
              ? 'Incluye el identificador CVE, producto y versión afectada si los conoces. No pegues secretos, tokens ni datos personales.'
              : 'Include the CVE ID, product, and affected version if known. Do not paste secrets, tokens, or personal data.'
          }
        />
        <div className="cve-triage-input-meta">
          <span>
            {input.length} / {MAX_TRIAGE_INPUT_LENGTH}
          </span>
          <button type="submit" className="primary-button" disabled={loading || !input.trim()}>
            {loading
              ? isEs ? 'Priorizando...' : 'Preparing triage...'
              : isEs ? 'Generar lista de prioridades' : 'Generate triage checklist'}
          </button>
        </div>
      </form>

      <p className="cve-triage-disclaimer">
        {isEs
          ? 'Al solicitar orientación, el texto se envía a Supabase y Meta y usa créditos de API. No ejecuta escaneos ni prueba exploits. La prioridad depende de los datos proporcionados; confirma versiones afectadas y parches con el proveedor y fuentes oficiales.'
          : 'When you request guidance, the text is sent to Supabase and Meta and uses API credits. This does not run scans or test exploits. Prioritization depends on supplied details; verify affected versions and fixes with the vendor and official sources.'}
      </p>

      {errorMessage && (
        <p className="cve-triage-error" role="alert">{errorMessage}</p>
      )}
      {result && (
        <div className="advisor-result" role="status" aria-live="polite">
          <h3>{isEs ? 'Lista defensiva de prioridades' : 'Defensive triage checklist'}</h3>
          <pre>{result}</pre>
        </div>
      )}
    </section>
  )
}
