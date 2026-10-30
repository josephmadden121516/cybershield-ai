import { useState } from 'react'
import { requestDailyDigest } from '../lib/securityAdvisors'
import { useWarRoomCue } from '../lib/warRoom'
import type { SecurityActivityEvent } from './SecurityActivityTimeline'
import './ThreatDigest.css'

interface DigestReport {
  risk_level: string
  summary: string
}

interface ThreatDigestProps {
  language: 'en' | 'es'
  reports: DigestReport[]
  activity: SecurityActivityEvent[]
}

interface CachedDigest {
  date: string
  language: 'en' | 'es'
  digest: string
}

const DIGEST_KEY = 'shieldpocket-digest-v1'
const MAX_SOURCE_LENGTH = 8000

function todayKey(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function buildSource(
  reports: DigestReport[],
  activity: SecurityActivityEvent[]
): string {
  const lines: string[] = []
  reports.slice(0, 10).forEach((report, index) => {
    lines.push(`Report ${index + 1} [${report.risk_level}]: ${report.summary}`)
  })
  activity.slice(0, 15).forEach((event, index) => {
    lines.push(
      `Activity ${index + 1} (${event.type}): ${event.title} — ${event.detail}`
    )
  })
  return lines.join('\n').slice(0, MAX_SOURCE_LENGTH)
}

function loadCachedDigest(): CachedDigest | null {
  try {
    const raw = localStorage.getItem(DIGEST_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return null
    }
    const record = parsed as Record<string, unknown>
    if (
      typeof record.date !== 'string' ||
      (record.language !== 'en' && record.language !== 'es') ||
      typeof record.digest !== 'string' ||
      !record.digest.trim()
    ) {
      return null
    }
    return {
      date: record.date,
      language: record.language,
      digest: record.digest,
    }
  } catch {
    return null
  }
}

export function ThreatDigest({ language, reports, activity }: ThreatDigestProps) {
  const isEs = language === 'es'
  const [stored, setStored] = useState<CachedDigest | null>(loadCachedDigest)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const visibleDigest =
    stored !== null &&
    stored.date === todayKey() &&
    stored.language === language
      ? stored.digest
      : ''

  async function generateDigest() {
    if (loading) return
    setLoading(true)
    setErrorMessage('')
    try {
      const source = buildSource(reports, activity)
      const result = await requestDailyDigest(source, language)
      const record: CachedDigest = {
        date: todayKey(),
        language,
        digest: result,
      }
      setStored(record)
      setErrorMessage('')
      try {
        localStorage.setItem(DIGEST_KEY, JSON.stringify(record))
      } catch {
        // Cache failures must not break digest display.
      }
    } catch (error) {
      console.error('Could not generate daily digest.', error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEs
            ? 'No se pudo generar el resumen.'
            : 'Could not generate the digest.'
      )
    } finally {
      setLoading(false)
    }
  }

  const hasSource = reports.length > 0 || activity.length > 0

  useWarRoomCue('digest', () => {
    // Fresh accounts have nothing to summarize; the director moves on.
    if (!hasSource) return
    return generateDigest()
  })

  return (
    <section
      id="threat-digest"
      className="content-card threat-digest"
      aria-labelledby="threat-digest-title"
    >
      <div className="card-heading">
        <div>
          <h2 id="threat-digest-title">
            {isEs ? 'Resumen diario' : 'Daily digest'}
          </h2>
          <p>
            {isEs
              ? 'Un resumen generado por IA de tus informes y actividad recientes.'
              : 'An AI-generated summary of your recent reports and activity.'}
          </p>
        </div>
        <span className="demo-tag">AI GUIDANCE</span>
      </div>

      {!hasSource && !visibleDigest && (
        <p>
          {isEs
            ? 'Analiza mensajes o completa tareas para tener material que resumir.'
            : 'Analyze messages or complete tasks to have material to summarize.'}
        </p>
      )}

      <button
        type="button"
        className="primary-button"
        disabled={loading || !hasSource}
        onClick={() => void generateDigest()}
      >
        {loading
          ? isEs
            ? 'Generando...'
            : 'Generating...'
          : visibleDigest
            ? isEs
              ? 'Regenerar resumen'
              : 'Regenerate digest'
            : isEs
              ? "Generar resumen de hoy"
              : "Generate today's digest"}
      </button>

      {errorMessage && (
        <p className="threat-digest-error" role="alert">
          {errorMessage}
        </p>
      )}

      {visibleDigest && (
        <div className="threat-digest-result" role="status" aria-live="polite">
          <h3>
            {isEs ? 'Resumen del ' : 'Digest for '}
            {stored?.date ?? ''}
          </h3>
          <p>{visibleDigest}</p>
        </div>
      )}
    </section>
  )
}
