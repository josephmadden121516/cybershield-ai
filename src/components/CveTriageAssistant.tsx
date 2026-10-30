import { useState, type FormEvent } from 'react'
import {
  requestDependencyScan,
  requestExploitIntel,
  requestPlainExplanation,
  requestSecurityAdvisor,
  type DepScanFinding,
  type ExploitIntel,
} from '../lib/securityAdvisors'
import { parseManifestFile } from '../lib/manifestAudit'
import { WAR_ROOM_SCENARIO, useWarRoomCue } from '../lib/warRoom'

const MAX_TRIAGE_INPUT_LENGTH = 12000
const MAX_MANIFEST_LENGTH = 60000
const CVE_PATTERN = /\bCVE-\d{4}-\d{4,}\b/i

interface CveTriageAssistantProps {
  language: 'en' | 'es'
}

type TriageTab = 'triage' | 'scan'

export function CveTriageAssistant({ language }: CveTriageAssistantProps) {
  const isEs = language === 'es'
  const [tab, setTab] = useState<TriageTab>('triage')
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [explainedFor, setExplainedFor] = useState('')
  const [explanationLoading, setExplanationLoading] = useState(false)
  const [explanationError, setExplanationError] = useState('')
  const [intel, setIntel] = useState<ExploitIntel | null>(null)
  const [intelLoading, setIntelLoading] = useState(false)
  const [manifest, setManifest] = useState('')
  const [findings, setFindings] = useState<DepScanFinding[] | null>(null)
  const [scanFormat, setScanFormat] = useState('')
  const [scanError, setScanError] = useState('')
  const [scanning, setScanning] = useState(false)

  async function runTriage(text: string) {
    if (loading) return

    setLoading(true)
    setResult('')
    setErrorMessage('')
    setIntel(null)
    const cveMatch = CVE_PATTERN.exec(text)
    if (cveMatch) {
      setIntelLoading(true)
      requestExploitIntel(cveMatch[0])
        .then(setIntel)
        .catch(() => setIntel(null))
        .finally(() => setIntelLoading(false))
    }
    try {
      const guidance = await requestSecurityAdvisor('cve', text, language)
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

  async function submitTriage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runTriage(input)
  }

  useWarRoomCue('triage', () => {
    const text = WAR_ROOM_SCENARIO.triageInput[language]
    setTab('triage')
    setInput(text)
    return runTriage(text)
  })

  async function submitScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (scanning) return
    setScanning(true)
    setFindings(null)
    setScanError('')
    try {
      const parsed = parseManifestFile(manifest)
      setScanFormat(parsed.format)
      const scanFindings = await requestDependencyScan(parsed.packages)
      setFindings(scanFindings)
    } catch (error) {
      console.error('Could not scan the manifest.', error)
      setScanError(
        error instanceof Error
          ? error.message
          : isEs
            ? 'No se pudo analizar el manifiesto.'
            : 'Could not scan the manifest.'
      )
    } finally {
      setScanning(false)
    }
  }

  async function explainGuidance() {
    if (explanationLoading || !result.trim()) return
    setExplanationLoading(true)
    setExplanationError('')
    try {
      const text = await requestPlainExplanation(result, language)
      setExplanation(text)
      setExplainedFor(result)
    } catch (error) {
      console.error('Could not explain triage guidance.', error)
      setExplanationError(
        error instanceof Error
          ? error.message
          : isEs
            ? 'No se pudo explicar este resultado.'
            : 'Could not explain this finding.'
      )
    } finally {
      setExplanationLoading(false)
    }
  }

  const vulnerableCount = findings?.filter((finding) => finding.cves.length > 0).length ?? 0
  const totalCves = findings?.reduce((sum, finding) => sum + finding.cves.length, 0) ?? 0

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
              ? 'Pide una lista defensiva, consulta si un CVE se explota en el mundo real o analiza tu manifiesto de dependencias.'
              : 'Get a defensive checklist, check real-world exploit intel for a CVE, or scan your dependency manifest.'}
          </p>
        </div>
        <span className="demo-tag">{isEs ? 'ORIENTACIÓN CON IA' : 'AI GUIDANCE'}</span>
      </div>

      <div className="cve-triage-tabs" role="tablist" aria-label={isEs ? 'Modos de análisis' : 'Analysis modes'}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'triage'}
          className={tab === 'triage' ? 'cve-triage-tab active' : 'cve-triage-tab'}
          onClick={() => setTab('triage')}
        >
          {isEs ? 'Priorizar CVE' : 'Triage CVE'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'scan'}
          className={tab === 'scan' ? 'cve-triage-tab active' : 'cve-triage-tab'}
          onClick={() => setTab('scan')}
        >
          {isEs ? 'Analizar manifiesto' : 'Scan manifest'}
        </button>
      </div>

      {tab === 'triage' && (
        <>
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
                setIntel(null)
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

          {intelLoading && (
            <p className="cve-triage-intel-loading" role="status">
              {isEs ? 'Consultando inteligencia de explotación…' : 'Checking exploit intel…'}
            </p>
          )}

          {intel && (
            <div className="cve-triage-intel" role="status" aria-live="polite">
              <h3>
                {isEs ? 'Inteligencia de explotación' : 'Exploit intel'} · {intel.cve}
              </h3>
              {intel.kevAvailable && intel.kev ? (
                intel.kev.inKev ? (
                  <p className="cve-triage-intel-bad">
                    {isEs
                      ? `Explotado activamente: está en el catálogo KEV de CISA${intel.kev.dueDate ? ` (fecha límite ${intel.kev.dueDate})` : ''}.`
                      : `Actively exploited: listed in CISA's KEV catalog${intel.kev.dueDate ? ` (due ${intel.kev.dueDate})` : ''}.`}
                    {intel.kev.requiredAction ? ` ${intel.kev.requiredAction}` : ''}
                  </p>
                ) : (
                  <p className="cve-triage-intel-good">
                    {isEs
                      ? 'No aparece en el catálogo KEV de CISA de exploits activos.'
                      : 'Not on the CISA KEV catalog of actively exploited bugs.'}
                  </p>
                )
              ) : (
                <p>{isEs ? 'Catálogo KEV no disponible ahora.' : 'KEV catalog unavailable right now.'}</p>
              )}
              {intel.epssAvailable && intel.epss && intel.epss.epss !== null ? (
                <p>
                  {isEs ? 'Probabilidad EPSS de explotación en 30 días' : 'EPSS 30-day exploitation probability'}:{' '}
                  <strong>{(intel.epss.epss * 100).toFixed(1)}%</strong>
                  {intel.epss.percentile !== null &&
                    ` (${isEs ? 'percentil' : 'percentile'} ${(intel.epss.percentile * 100).toFixed(0)})`}
                </p>
              ) : (
                <p>{isEs ? 'Puntaje EPSS no disponible ahora.' : 'EPSS score unavailable right now.'}</p>
              )}
            </div>
          )}

          {errorMessage && (
            <p className="cve-triage-error" role="alert">{errorMessage}</p>
          )}
          {result && (
            <div className="advisor-result" role="status" aria-live="polite">
              <h3>{isEs ? 'Lista defensiva de prioridades' : 'Defensive triage checklist'}</h3>
              <pre>{result}</pre>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void explainGuidance()}
                disabled={explanationLoading}
                style={{ marginTop: '12px' }}
              >
                {explanationLoading
                  ? isEs
                    ? 'Explicando...'
                    : 'Explaining...'
                  : isEs
                    ? 'Explicar en simple'
                    : 'Explain simply'}
              </button>
              {explanationError && (
                <p className="cve-triage-error" role="alert">{explanationError}</p>
              )}
              {explanation && explainedFor === result && (
                <div style={{ marginTop: '12px' }}>
                  <h4>{isEs ? 'Explicación simple' : 'Plain explanation'}</h4>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{explanation}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'scan' && (
        <>
          <form onSubmit={(event) => void submitScan(event)}>
            <label htmlFor="cve-scan-input">
              {isEs ? 'Manifiesto del proyecto' : 'Project manifest'}
            </label>
            <textarea
              id="cve-scan-input"
              value={manifest}
              maxLength={MAX_MANIFEST_LENGTH}
              disabled={scanning}
              spellCheck={false}
              autoComplete="off"
              className="cve-scan-mono"
              onChange={(event) => {
                setManifest(event.target.value)
                setFindings(null)
                setScanError('')
              }}
              placeholder={
                isEs
                  ? 'Pega tu package.json, package-lock.json, requirements.txt o go.mod. Solo se leen nombres y versiones.'
                  : 'Paste your package.json, package-lock.json, requirements.txt, or go.mod. Only names and versions are read.'
              }
            />
            <div className="cve-triage-input-meta">
              <span>
                {manifest.length} / {MAX_MANIFEST_LENGTH}
              </span>
              <button type="submit" className="primary-button" disabled={scanning || !manifest.trim()}>
                {scanning
                  ? isEs ? 'Analizando...' : 'Scanning...'
                  : isEs ? 'Analizar dependencias' : 'Scan dependencies'}
              </button>
            </div>
          </form>

          {scanError && (
            <p className="cve-triage-error" role="alert">{scanError}</p>
          )}

          {findings && (
            <div className="cve-scan-results" role="status" aria-live="polite">
              <h3>
                {isEs ? 'Resultado del análisis' : 'Scan results'}
                {scanFormat ? ` · ${scanFormat}` : ''}
              </h3>
              <p>
                {isEs
                  ? `${findings.length} dependencias revisadas, ${vulnerableCount} con CVE conocidos (${totalCves} en total).`
                  : `${findings.length} dependencies checked, ${vulnerableCount} with known CVEs (${totalCves} total).`}
              </p>
              {vulnerableCount === 0 ? (
                <p className="cve-triage-intel-good">
                  {isEs
                    ? 'Sin CVE conocidos en estas versiones según la base pública OSV.'
                    : 'No known CVEs in these versions per the public OSV database.'}
                </p>
              ) : (
                <ul className="cve-scan-list">
                  {findings
                    .filter((finding) => finding.cves.length > 0)
                    .map((finding) => (
                      <li key={`${finding.ecosystem}:${finding.package}@${finding.version}`}>
                        <p className="cve-scan-package">
                          {finding.package}@{finding.version}
                          <span> · {finding.ecosystem}</span>
                        </p>
                        <ul>
                          {finding.cves.map((cve) => (
                            <li key={cve.id}>
                              <p>
                                <strong>{cve.id}</strong>
                                {cve.severity && (
                                  <code className="cve-scan-severity" title={cve.severity}>
                                    {cve.severity.length > 42
                                      ? `${cve.severity.slice(0, 42)}…`
                                      : cve.severity}
                                  </code>
                                )}
                              </p>
                              {cve.summary && <p>{cve.summary}</p>}
                              <p className="cve-scan-fix">
                                {cve.fixedVersion
                                  ? isEs
                                    ? `Corrección: actualiza a ${cve.fixedVersion}.`
                                    : `Fix: upgrade to ${cve.fixedVersion}.`
                                  : isEs
                                    ? 'Sin versión corregida publicada.'
                                    : 'No fixed version published.'}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      <p className="cve-triage-disclaimer">
        {isEs
          ? 'La lista defensiva usa IA (el texto se envía a Supabase y Meta y usa créditos). El análisis de manifiesto consulta la base pública OSV y la inteligencia de explotación consulta los catálogos públicos KEV y EPSS: son lecturas gratuitas que no tocan ningún sistema en vivo ni prueban exploits. Verifica siempre versiones y parches con el proveedor y fuentes oficiales.'
          : 'The defensive checklist uses AI (text is sent to Supabase and Meta and uses credits). Manifest scans query the public OSV database and exploit intel queries the public KEV and EPSS catalogs: free read-only lookups that never touch a live system or test exploits. Always verify versions and fixes with the vendor and official sources.'}
      </p>
    </section>
  )
}
