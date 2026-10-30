import { useState, type FormEvent } from 'react'
import { requestUrlCheck, type UrlCheckResult } from '../lib/securityAdvisors'
import './LinkSafetyChecker.css'

interface LinkSafetyCheckerProps {
  language: 'en' | 'es'
}

export function LinkSafetyChecker({ language }: LinkSafetyCheckerProps) {
  const isEs = language === 'es'
  const [draft, setDraft] = useState('')
  const [result, setResult] = useState<UrlCheckResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed || checking) return
    setChecking(true)
    setErrorMessage('')
    try {
      setResult(await requestUrlCheck(trimmed))
    } catch (error) {
      setResult(null)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEs
            ? 'No se pudo revisar el enlace.'
            : 'The link could not be checked.'
      )
    } finally {
      setChecking(false)
    }
  }

  return (
    <section
      id="link-safety"
      className="panel"
      aria-labelledby="link-safety-heading"
      style={{ marginTop: 18, padding: 20 }}
    >
      <h2 id="link-safety-heading" style={{ marginTop: 0 }}>
        {isEs ? 'Verificador de enlaces' : 'Link safety checker'}
      </h2>
      <p style={{ marginTop: 0 }}>
        {isEs
          ? 'Pega un enlace antes de abrirlo. Revisamos listas de bloqueo, la antigüedad del dominio y señales de imitación. La página nunca se abre.'
          : 'Paste a link before opening it. We check blocklists, domain age, and lookalike signals. The page is never opened.'}
      </p>
      <form onSubmit={check} className="link-safety-row">
        <input
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={isEs ? 'pega-un-enlace.com/pago' : 'paste-a-link.com/pay'}
          aria-label={isEs ? 'Enlace para revisar' : 'Link to check'}
        />
        <button type="submit" disabled={draft.trim().length === 0 || checking}>
          {checking
            ? isEs
              ? 'Revisando…'
              : 'Checking…'
            : isEs
              ? 'Revisar enlace'
              : 'Check link'}
        </button>
      </form>

      {errorMessage && (
        <p className="link-safety-error" role="alert">
          {errorMessage}
        </p>
      )}

      {result && (
        <div className="link-safety-results" aria-live="polite">
          <p
            className={
              result.verdict === 'Dangerous'
                ? 'link-safety-dangerous'
                : result.verdict === 'Suspicious'
                  ? 'link-safety-suspicious'
                  : 'link-safety-safe'
            }
          >
            {result.verdict === 'Dangerous'
              ? isEs
                ? `Peligroso: no abras ${result.hostname}.`
                : `Dangerous: do not open ${result.hostname}.`
              : result.verdict === 'Suspicious'
                ? isEs
                  ? `Sospechoso: trata ${result.hostname} con cautela.`
                  : `Suspicious: treat ${result.hostname} with caution.`
                : isEs
                  ? `Sin señales de peligro en ${result.hostname}.`
                  : `No danger signals on ${result.hostname}.`}
          </p>
          <ul>
            {result.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <dl className="link-safety-facts">
            <div>
              <dt>{isEs ? 'Lista de bloqueo' : 'Blocklist'}</dt>
              <dd>
                {result.gsbAvailable
                  ? result.gsbMatch
                    ? isEs
                      ? 'En la lista (inseguro)'
                      : 'Listed (unsafe)'
                    : isEs
                      ? 'No está en la lista'
                      : 'Not listed'
                  : isEs
                    ? 'Aún no conectada'
                    : 'Not connected yet'}
              </dd>
            </div>
            <div>
              <dt>{isEs ? 'Antigüedad del dominio' : 'Domain age'}</dt>
              <dd>
                {result.ageAvailable && result.domainAgeDays !== null
                  ? isEs
                    ? `unos ${result.domainAgeDays} días`
                    : `about ${result.domainAgeDays} day(s)`
                  : isEs
                    ? 'No disponible'
                    : 'Unavailable'}
              </dd>
            </div>
          </dl>
        </div>
      )}
      <p className="link-safety-disclaimer">
        {isEs
          ? '“Sin señales” no garantiza seguridad: los sitios nuevos o comprometidos pueden pasar desapercibidos.'
          : '“No signals” is not a guarantee: new or compromised sites can slip through.'}
      </p>
    </section>
  )
}
