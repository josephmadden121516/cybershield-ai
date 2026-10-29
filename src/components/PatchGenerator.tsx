import { useMemo, useState, type FormEvent } from 'react'
import {
  requestRemediationPatch,
  type RemediationFileKind,
  type RemediationPatch,
} from '../lib/remediation'
import { computeLineDiff } from '../../supabase/functions/_shared/diff'
import './PatchGenerator.css'

const MAX_SNIPPET_LENGTH = 12000

interface PatchGeneratorProps {
  language: 'en' | 'es'
}

const fileKinds: Array<{
  value: RemediationFileKind
  labelEn: string
  labelEs: string
}> = [
  { value: 'dockerfile', labelEn: 'Dockerfile', labelEs: 'Dockerfile' },
  { value: 'terraform', labelEn: 'Terraform', labelEs: 'Terraform' },
  { value: 'kubernetes', labelEn: 'Kubernetes YAML', labelEs: 'Kubernetes YAML' },
  { value: 'code', labelEn: 'Application code', labelEs: 'Código de aplicación' },
]

const severities = ['Critical', 'High', 'Medium', 'Low'] as const

export function PatchGenerator({ language }: PatchGeneratorProps) {
  const isEs = language === 'es'
  const [fileKind, setFileKind] = useState<RemediationFileKind>('dockerfile')
  const [codeLanguage, setCodeLanguage] = useState('TypeScript')
  const [vulnId, setVulnId] = useState('')
  const [severity, setSeverity] =
    useState<(typeof severities)[number]>('High')
  const [vulnType, setVulnType] = useState('')
  const [snippet, setSnippet] = useState('')
  const [patch, setPatch] = useState<RemediationPatch | null>(null)
  const [originalSnippet, setOriginalSnippet] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const diffLines = useMemo(
    () => (patch ? computeLineDiff(originalSnippet, patch.patchedCode) : []),
    [patch, originalSnippet]
  )

  async function submitPatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setLoading(true)
    setPatch(null)
    setErrorMessage('')
    setCopied(false)
    try {
      const result = await requestRemediationPatch(
        {
          vulnerability: { id: vulnId, severity, type: vulnType },
          codeSnippet: snippet,
          fileKind,
          codeLanguage,
        },
        language
      )
      setOriginalSnippet(snippet.trim())
      setPatch(result)
    } catch (error) {
      console.error('Could not generate remediation patch.', error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEs
            ? 'No se pudo generar el parche.'
            : 'Could not generate the patch.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function copyPatch() {
    if (!patch) return
    try {
      await navigator.clipboard.writeText(patch.patchedCode)
      setCopied(true)
    } catch {
      setCopied(false)
      setErrorMessage(
        isEs ? 'No se pudo copiar el parche.' : 'Could not copy the patch.'
      )
    }
  }

  return (
    <section
      id="patch-generator"
      className="content-card patch-generator"
      aria-labelledby="patch-generator-title"
    >
      <div className="card-heading">
        <div>
          <h2 id="patch-generator-title">
            {isEs ? 'Generador de parches' : 'Patch generator'}
          </h2>
          <p>
            {isEs
              ? 'Propón parches para Dockerfiles, Terraform, YAML de Kubernetes y código, con riesgo, justificación, validación y reversión.'
              : 'Propose patches for Dockerfiles, Terraform, Kubernetes YAML, and code, with risk, rationale, validation, and rollback.'}
          </p>
        </div>
        <span className="demo-tag">
          {isEs ? 'PROPUESTA PARA REVISIÓN' : 'REVIEW-ONLY PROPOSAL'}
        </span>
      </div>

      <form onSubmit={(event) => void submitPatch(event)}>
        <div className="patch-generator-grid">
          <label htmlFor="patch-generator-kind">
            {isEs ? 'Tipo de archivo' : 'File kind'}
            <select
              id="patch-generator-kind"
              value={fileKind}
              disabled={loading}
              onChange={(event) => {
                setFileKind(event.target.value as RemediationFileKind)
                setPatch(null)
                setErrorMessage('')
              }}
            >
              {fileKinds.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {isEs ? kind.labelEs : kind.labelEn}
                </option>
              ))}
            </select>
          </label>

          {fileKind === 'code' && (
            <label htmlFor="patch-generator-language">
              {isEs ? 'Lenguaje' : 'Language'}
              <input
                id="patch-generator-language"
                value={codeLanguage}
                maxLength={64}
                disabled={loading}
                autoComplete="off"
                onChange={(event) => {
                  setCodeLanguage(event.target.value)
                  setPatch(null)
                  setErrorMessage('')
                }}
              />
            </label>
          )}

          <label htmlFor="patch-generator-id">
            {isEs ? 'Identificador' : 'Vulnerability ID'}
            <input
              id="patch-generator-id"
              value={vulnId}
              maxLength={200}
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
              placeholder="CVE-2026-9912"
              onChange={(event) => {
                setVulnId(event.target.value)
                setPatch(null)
                setErrorMessage('')
              }}
            />
          </label>

          <label htmlFor="patch-generator-severity">
            {isEs ? 'Severidad' : 'Severity'}
            <select
              id="patch-generator-severity"
              value={severity}
              disabled={loading}
              onChange={(event) => {
                setSeverity(
                  event.target.value as (typeof severities)[number]
                )
                setPatch(null)
                setErrorMessage('')
              }}
            >
              {severities.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="patch-generator-type">
            {isEs ? 'Tipo' : 'Vulnerability type'}
            <input
              id="patch-generator-type"
              value={vulnType}
              maxLength={200}
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
              placeholder={
                isEs ? 'Inyección SQL' : 'SQL Injection'
              }
              onChange={(event) => {
                setVulnType(event.target.value)
                setPatch(null)
                setErrorMessage('')
              }}
            />
          </label>
        </div>

        <label htmlFor="patch-generator-snippet">
          {isEs ? 'Fragmento vulnerable' : 'Vulnerable snippet'}
        </label>
        <textarea
          id="patch-generator-snippet"
          value={snippet}
          maxLength={MAX_SNIPPET_LENGTH}
          disabled={loading}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => {
            setSnippet(event.target.value)
            setPatch(null)
            setErrorMessage('')
          }}
          placeholder={
            isEs
              ? 'Pega el Dockerfile, Terraform, YAML o código. No incluyas secretos, tokens ni datos personales.'
              : 'Paste the Dockerfile, Terraform, YAML, or code. Do not include secrets, tokens, or personal data.'
          }
        />
        <div className="patch-generator-input-meta">
          <span>
            {snippet.length} / {MAX_SNIPPET_LENGTH}
          </span>
          <button
            type="submit"
            className="primary-button"
            disabled={
              loading ||
              !snippet.trim() ||
              !vulnId.trim() ||
              !vulnType.trim()
            }
          >
            {loading
              ? isEs
                ? 'Generando parche...'
                : 'Generating patch...'
              : isEs
                ? 'Generar propuesta de parche'
                : 'Generate patch proposal'}
          </button>
        </div>
      </form>

      <p className="patch-generator-disclaimer">
        {isEs
          ? 'Al solicitar un parche, el texto se envía a Supabase y Meta y usa créditos de API. La propuesta es solo para revisión humana: ShieldPocket no ejecuta, aplica ni despliega cambios.'
          : 'When you request a patch, the text is sent to Supabase and Meta and uses API credits. Proposals are for human review only: ShieldPocket does not run, apply, or deploy changes.'}
      </p>

      {errorMessage && (
        <p className="patch-generator-error" role="alert">
          {errorMessage}
        </p>
      )}

      {patch && (
        <div className="patch-generator-result" role="status" aria-live="polite">
          <h3>{isEs ? 'Riesgo identificado' : 'Identified risk'}</h3>
          <p>{patch.risk}</p>

          <h3>{isEs ? 'Diferencia propuesta' : 'Proposed diff'}</h3>
          <pre className="patch-generator-diff" aria-label={isEs ? 'Diferencia propuesta' : 'Proposed diff'}>
            {diffLines.map((line, index) => (
              <span
                key={index}
                className={
                  line.type === 'add'
                    ? 'diff-add'
                    : line.type === 'remove'
                      ? 'diff-remove'
                      : 'diff-same'
                }
              >
                {line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  '}
                {line.text}
                {'\n'}
              </span>
            ))}
          </pre>

          <h3>{isEs ? 'Justificación' : 'Rationale'}</h3>
          <p>{patch.rationale}</p>

          <h3>{isEs ? 'Pasos de validación' : 'Validation steps'}</h3>
          {patch.validationSteps.length ? (
            <ol className="patch-generator-steps">
              {patch.validationSteps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          ) : (
            <p>
              {isEs
                ? 'La IA no devolvió pasos de validación.'
                : 'The AI returned no validation steps.'}
            </p>
          )}

          <h3>{isEs ? 'Reversión' : 'Rollback'}</h3>
          {patch.rollbackSteps.length ? (
            <ol className="patch-generator-steps">
              {patch.rollbackSteps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          ) : (
            <p>
              {isEs
                ? 'La IA no devolvió pasos de reversión.'
                : 'The AI returned no rollback steps.'}
            </p>
          )}

          <button
            type="button"
            className="secondary-button"
            onClick={() => void copyPatch()}
          >
            {copied
              ? isEs
                ? 'Parche copiado'
                : 'Patch copied'
              : isEs
                ? 'Copiar código corregido'
                : 'Copy patched code'}
          </button>
        </div>
      )}
    </section>
  )
}
