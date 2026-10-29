import { useState, type FormEvent } from 'react'
import { requestIncidentTimeline } from '../lib/securityAdvisors'
import './IncidentTimelineReconstructor.css'

const MAX_NOTES_LENGTH = 12000

interface IncidentTimelineReconstructorProps {
  language: 'en' | 'es'
}

export function IncidentTimelineReconstructor({
  language,
}: IncidentTimelineReconstructorProps) {
  const isEs = language === 'es'
  const [notes, setNotes] = useState('')
  const [timeline, setTimeline] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submitNotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setLoading(true)
    setTimeline('')
    setErrorMessage('')
    try {
      const result = await requestIncidentTimeline(notes, language)
      setTimeline(result)
    } catch (error) {
      console.error('Could not reconstruct the timeline.', error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEs
            ? 'No se pudo reconstruir la cronología.'
            : 'Could not reconstruct the timeline.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      id="incident-timeline"
      className="content-card incident-timeline"
      aria-labelledby="incident-timeline-title"
    >
      <div className="card-heading">
        <div>
          <h2 id="incident-timeline-title">
            {isEs ? 'Reconstrucción de cronología' : 'Incident timeline reconstructor'}
          </h2>
          <p>
            {isEs
              ? 'Pega notas dispersas del incidente y obtén una cronología ordenada con secuencia probable y vacíos.'
              : 'Paste scattered incident notes and get an ordered timeline with a likely sequence and gaps.'}
          </p>
        </div>
        <span className="demo-tag">
          {isEs ? 'BORRADOR PARA REVISIÓN' : 'REVIEW-ONLY DRAFT'}
        </span>
      </div>

      <form onSubmit={(event) => void submitNotes(event)}>
        <label htmlFor="incident-timeline-notes">
          {isEs ? 'Notas del incidente' : 'Incident notes'}
        </label>
        <textarea
          id="incident-timeline-notes"
          value={notes}
          maxLength={MAX_NOTES_LENGTH}
          disabled={loading}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => {
            setNotes(event.target.value)
            setTimeline('')
            setErrorMessage('')
          }}
          placeholder={
            isEs
              ? 'Pega registros, horas y observaciones en cualquier orden. No incluyas secretos, tokens ni datos personales.'
              : 'Paste log lines, timestamps, and observations in any order. Do not include secrets, tokens, or personal data.'
          }
        />
        <div className="incident-timeline-input-meta">
          <span>
            {notes.length} / {MAX_NOTES_LENGTH}
          </span>
          <button
            type="submit"
            className="primary-button"
            disabled={loading || !notes.trim()}
          >
            {loading
              ? isEs
                ? 'Reconstruyendo...'
                : 'Reconstructing...'
              : isEs
                ? 'Reconstruir cronología'
                : 'Reconstruct timeline'}
          </button>
        </div>
      </form>

      <p className="incident-timeline-disclaimer">
        {isEs
          ? 'Al reconstruir, el texto se envía a Supabase y Meta y usa créditos de API. El resultado es un borrador para revisión humana: verifica cada entrada contra las fuentes originales.'
          : 'When you reconstruct, the text is sent to Supabase and Meta and uses API credits. The result is a draft for human review: verify every entry against the original sources.'}
      </p>

      {errorMessage && (
        <p className="incident-timeline-error" role="alert">
          {errorMessage}
        </p>
      )}

      {timeline && (
        <div className="incident-timeline-result" role="status" aria-live="polite">
          <h3>{isEs ? 'Cronología reconstruida' : 'Reconstructed timeline'}</h3>
          <pre>{timeline}</pre>
        </div>
      )}
    </section>
  )
}
