import { useState, type FormEvent } from 'react'
import {
  DEFAULT_AUDIT_BATCH,
  MAX_AUDIT_BATCH,
  generateSyntheticAuditEvents,
  type SyntheticAuditEvent,
} from '../../supabase/functions/_shared/syntheticAuditLog'
import './SyntheticAuditLab.css'

interface SyntheticAuditLabProps {
  language: 'en' | 'es'
}

const batchOptions = [10, 25, 50, 100]

function formatTime(value: string, language: 'en' | 'es') {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function SyntheticAuditLab({ language }: SyntheticAuditLabProps) {
  const isEs = language === 'es'
  const [batchSize, setBatchSize] = useState(DEFAULT_AUDIT_BATCH)
  const [seedInput, setSeedInput] = useState('')
  const [events, setEvents] = useState<SyntheticAuditEvent[]>([])

  function submitBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedSeed = Number.parseInt(seedInput.trim(), 10)
    const seed = Number.isFinite(parsedSeed) ? parsedSeed : undefined
    setEvents(
      seed === undefined
        ? generateSyntheticAuditEvents(batchSize)
        : generateSyntheticAuditEvents(batchSize, seed)
    )
  }

  function downloadBatch() {
    const blob = new Blob([JSON.stringify(events, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `shieldpocket-simulated-audit-${events.length}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <section
      id="audit-log-lab"
      className="content-card synthetic-audit-lab"
      aria-labelledby="audit-log-lab-title"
    >
      <div className="card-heading">
        <div>
          <h2 id="audit-log-lab-title">
            {isEs ? 'Laboratorio de registros' : 'Audit log lab'}
          </h2>
          <p>
            {isEs
              ? 'Genera eventos de seguridad simulados para paneles y pruebas, con identidades sintéticas.'
              : 'Generate simulated security events for dashboards and testing, using synthetic identities.'}
          </p>
        </div>
        <span className="demo-tag">
          {isEs ? 'DATOS SIMULADOS' : 'SIMULATED DATA'}
        </span>
      </div>

      <form onSubmit={submitBatch}>
        <div className="audit-lab-grid">
          <label htmlFor="audit-lab-batch">
            {isEs ? 'Tamaño del lote' : 'Batch size'}
            <select
              id="audit-lab-batch"
              value={batchSize}
              onChange={(event) => {
                setBatchSize(Number(event.target.value))
                setEvents([])
              }}
            >
              {batchOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="audit-lab-seed">
            {isEs ? 'Semilla (opcional)' : 'Seed (optional)'}
            <input
              id="audit-lab-seed"
              value={seedInput}
              inputMode="numeric"
              autoComplete="off"
              placeholder={isEs ? 'Vacía para aleatorio' : 'Blank for random'}
              onChange={(event) => {
                setSeedInput(event.target.value)
                setEvents([])
              }}
            />
          </label>

          <button type="submit" className="primary-button">
            {isEs ? 'Generar lote' : 'Generate batch'}
          </button>
        </div>
      </form>

      <p className="audit-lab-disclaimer">
        {isEs
          ? `Todo en esta sección es simulado: lotes de máximo ${MAX_AUDIT_BATCH} eventos con activos y actores ficticios. No representa incidentes reales.`
          : `Everything here is simulated: batches of up to ${MAX_AUDIT_BATCH} events with fictitious assets and actors. Nothing represents real incidents.`}
      </p>

      {events.length > 0 && (
        <div className="audit-lab-result" role="status" aria-live="polite">
          <div className="audit-lab-result-head">
            <h3>
              {isEs
                ? `${events.length} eventos simulados`
                : `${events.length} simulated events`}
            </h3>
            <button
              type="button"
              className="secondary-button"
              onClick={downloadBatch}
            >
              {isEs ? 'Descargar JSON' : 'Download JSON'}
            </button>
          </div>
          <div className="audit-lab-table-wrap">
            <table className="audit-lab-table">
              <thead>
                <tr>
                  <th>{isEs ? 'Hora' : 'Time'}</th>
                  <th>{isEs ? 'Tipo' : 'Type'}</th>
                  <th>{isEs ? 'Severidad' : 'Severity'}</th>
                  <th>{isEs ? 'Activo' : 'Asset'}</th>
                  <th>{isEs ? 'Actor' : 'Actor'}</th>
                  <th>{isEs ? 'Correlación' : 'Correlation'}</th>
                  <th>{isEs ? 'Resumen' : 'Summary'}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>{formatTime(event.timestamp, language)}</td>
                    <td>
                      <code>{event.eventType}</code>
                    </td>
                    <td>
                      <span
                        className={`audit-severity audit-severity-${event.severity}`}
                      >
                        {event.severity}
                      </span>
                    </td>
                    <td>
                      <code>{event.asset}</code>
                    </td>
                    <td>
                      <code>{event.actor}</code>
                    </td>
                    <td>
                      <code>{event.correlationId}</code>
                    </td>
                    <td>{event.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
