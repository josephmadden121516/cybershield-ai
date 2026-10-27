import './SecurityScoreWidget.css'

interface SecurityScoreProps {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  recommendation: string
  language: 'en' | 'es'
}

export function SecurityScoreWidget({
  score,
  grade,
  recommendation,
  language,
}: SecurityScoreProps) {
  const isEs = language === 'es'
  const scoreColor =
    score >= 80
      ? 'security-score-high'
      : score >= 60
        ? 'security-score-medium'
        : 'security-score-low'

  return (
    <section className="security-score-widget" aria-labelledby="security-score-title">
      <div className="security-score-overview">
        <div
          className={`security-score-grade ${scoreColor}`}
          role="img"
          aria-label={isEs ? `Calificación ${grade}` : `Grade ${grade}`}
        >
          {grade}
        </div>
        <div>
          <h3 id="security-score-title">
            {isEs ? 'Puntuación de la lista de seguridad' : 'Security Checklist Score'}
          </h3>
          <p>
            {isEs ? `Tareas completadas: ${score}/100` : `Checklist completion: ${score}/100`}
          </p>
        </div>
      </div>

      <div className="security-score-recommendation">
        <span>
          {isEs ? 'Siguiente paso recomendado' : 'Recommended next step'}
        </span>
        <p>{recommendation}</p>
        <small>
          {isEs
            ? 'Esta puntuación refleja solo las tareas marcadas; no es una auditoría de seguridad.'
            : 'This score reflects checked tasks only; it is not a security audit.'}
        </small>
      </div>
    </section>
  )
}
