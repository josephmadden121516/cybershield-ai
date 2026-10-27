import './SecurityActivityTimeline.css'

export interface SecurityActivityEvent {
  id: string
  ownerId: string
  type: 'analysis' | 'checklist'
  title: string
  detail: string
  occurredAt: string
}

interface SecurityActivityTimelineProps {
  language: 'en' | 'es'
  events: SecurityActivityEvent[]
  storageError: boolean
  onClear: () => void
}

export function SecurityActivityTimeline({
  language,
  events,
  storageError,
  onClear,
}: SecurityActivityTimelineProps) {
  const isEs = language === 'es'

  return (
    <section className="content-card security-activity" aria-labelledby="security-activity-title">
      <div className="card-heading">
        <div>
          <h2 id="security-activity-title">
            {isEs ? 'Actividad de seguridad reciente' : 'Recent security activity'}
          </h2>
          <p>
            {isEs
              ? 'Análisis completados y cambios en tu lista de verificación.'
              : 'Completed analyses and changes to your security checklist.'}
          </p>
        </div>
        <span className="demo-tag">
          {isEs ? 'SOLO EN ESTE DISPOSITIVO' : 'THIS DEVICE ONLY'}
        </span>
      </div>

      {events.length === 0 ? (
        <p className="security-activity-empty">
          {isEs
            ? 'Aún no hay actividad. Analiza un mensaje o actualiza una tarea de seguridad.'
            : 'No activity yet. Analyze a message or update a security checklist item.'}
        </p>
      ) : (
        <>
          <ol className="security-activity-list" aria-live="polite">
            {events.map((event) => (
              <li className="security-activity-item" key={event.id}>
                <span
                  className={`security-activity-icon security-activity-${event.type}`}
                  aria-hidden="true"
                >
                  {event.type === 'analysis' ? '⌕' : '✓'}
                </span>
                <div>
                  <strong>{event.title}</strong>
                  <p>{event.detail}</p>
                  <time dateTime={event.occurredAt}>
                    {new Intl.DateTimeFormat(isEs ? 'es-MX' : 'en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(event.occurredAt))}
                  </time>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="secondary-button" onClick={onClear}>
            {isEs ? 'Borrar actividad' : 'Clear activity'}
          </button>
        </>
      )}

      <p className="security-activity-privacy">
        {isEs
          ? 'El historial se guarda localmente en este navegador o dispositivo, separado por cuenta. No incluye el texto de los mensajes ni se sincroniza. Si el almacenamiento está bloqueado, no se conservará.'
          : 'History is stored locally in this browser or device, separated by account. It excludes message text and is not synced. If storage is blocked, history will not persist.'}
      </p>
      {storageError && (
        <p className="security-activity-warning" role="status">
          {isEs
            ? 'No se pudo guardar o borrar el historial local.'
            : 'Could not save or clear local activity history.'}
        </p>
      )}
    </section>
  )
}
