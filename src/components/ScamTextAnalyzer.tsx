import { useState, type FormEvent } from 'react'
import './ScamTextAnalyzer.css'

interface ScamTextAnalyzerProps {
  language: 'en' | 'es'
}

interface ScamRule {
  id: string
  weight: number
  pattern: RegExp
  labelEn: string
  labelEs: string
}

// Local heuristic patterns only. They highlight why a pasted message looks
// risky; they never send the text anywhere or open any links.
const RULES: ScamRule[] = [
  {
    id: 'urgency',
    weight: 25,
    pattern:
      /\b(urgent|immediately|act now|within 24 hours|expires today|last chance|final notice|suspended|locked out)\b|urgente|inmediatamente|act[úu]a ahora|24 horas|aviso final|suspendida|bloqueada/i,
    labelEn: 'Urgency and pressure tactics ("act now", "suspended").',
    labelEs: 'Tácticas de urgencia y presión ("actúa ahora", "suspendida").',
  },
  {
    id: 'threats',
    weight: 30,
    pattern:
      /\b(warrant|arrest|police|sheriff|legal action|lawsuit|jail|deportation)\b|orden de arresto|polic[íi]a|acci[óo]n legal|demanda|c[áa]rcel/i,
    labelEn: 'Scare tactics invoking arrest, police, or lawsuits.',
    labelEs: 'Tácticas de miedo con arrestos, policía o demandas.',
  },
  {
    id: 'financial',
    weight: 30,
    pattern:
      /\b(wire transfer|western union|moneygram|gift ?card|itunes card|bitcoin|crypto|wallet address|bank details|routing number|ssn|social security)\b|transferencia|tarjeta de regalo|criptomoneda|billetera|n[úu]mero de seguro social/i,
    labelEn: 'Demands for money, gift cards, crypto, or bank details.',
    labelEs: 'Exige dinero, tarjetas de regalo, criptomonedas o datos bancarios.',
  },
  {
    id: 'credentials',
    weight: 25,
    pattern:
      /\b(verify your account|confirm your password|update your payment|log ?in to|sign in to|validate your identity)\b|verifica tu cuenta|confirma tu contrase[ñn]a|inicia sesi[óo]n/i,
    labelEn: 'Asks you to log in or "verify" through the message.',
    labelEs: 'Pide iniciar sesión o "verificar" desde el mensaje.',
  },
  {
    id: 'prize',
    weight: 20,
    pattern:
      /\b(you (won|have been selected)|congratulations|lottery|prize|claim your reward|free iphone|selected winner)\b|ganaste|felicidades|loter[íi]a|premio|reclama tu recompensa/i,
    labelEn: 'Too-good-to-be-true prize or lottery claim.',
    labelEs: 'Premio o lotería demasiado bueno para ser verdad.',
  },
  {
    id: 'shortlink',
    weight: 15,
    pattern:
      /\b(bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly|s\.id|cutt\.ly)\b|\bhttps?:\/\/\d{1,3}(\.\d{1,3}){3}\b/i,
    labelEn: 'Shortened link or raw IP address hiding the real destination.',
    labelEs: 'Enlace acortado o dirección IP que oculta el destino real.',
  },
  {
    id: 'generic-link',
    weight: 10,
    pattern: /https?:\/\/\S+/i,
    labelEn: 'Contains a link. Check it with the link checker before tapping.',
    labelEs: 'Contiene un enlace. Revísalo con el verificador antes de tocarlo.',
  },
]

function riskLevel(score: number): 'low' | 'moderate' | 'high' {
  if (score >= 50) return 'high'
  if (score >= 20) return 'moderate'
  return 'low'
}

export function ScamTextAnalyzer({ language }: ScamTextAnalyzerProps) {
  const isEs = language === 'es'
  const [draft, setDraft] = useState('')
  const [factors, setFactors] = useState<ScamRule[] | null>(null)
  const [score, setScore] = useState(0)

  function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const matched = RULES.filter((rule) => rule.pattern.test(draft))
    const total = Math.min(
      100,
      matched.reduce((sum, rule) => sum + rule.weight, 0)
    )
    // Reset lastIndex-style state is unnecessary (no /g flag), but rescan
    // guard: patterns are stateless, so repeated submits stay consistent.
    setFactors(matched)
    setScore(total)
  }

  const level = factors === null ? null : riskLevel(score)

  return (
    <section
      id="scam-text"
      className="panel"
      aria-labelledby="scam-text-heading"
      style={{ marginTop: 18, padding: 20 }}
    >
      <h2 id="scam-text-heading" style={{ marginTop: 0 }}>
        {isEs ? 'Analizador de mensajes sospechosos' : 'Scam-text analyzer'}
      </h2>
      <p style={{ marginTop: 0 }}>
        {isEs
          ? 'Pega un mensaje de texto o correo. El análisis se hace en tu dispositivo: nada se envía ni se abre ningún enlace.'
          : 'Paste a suspicious text or email. Analysis runs on your device: nothing is sent anywhere and no links are opened.'}
      </p>
      <form onSubmit={analyze}>
        <label htmlFor="scam-text-input" className="scam-text-label">
          {isEs ? 'Mensaje para analizar' : 'Message to analyze'}
        </label>
        <textarea
          id="scam-text-input"
          className="scam-text-input"
          rows={6}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={
            isEs
              ? '“Tu cuenta será suspendida en 24 horas. Verifica aquí: …”'
              : '“Your account will be suspended in 24 hours. Verify here: …”'
          }
        />
        <button
          type="submit"
          className="scam-text-button"
          disabled={draft.trim().length === 0}
        >
          {isEs ? 'Analizar mensaje' : 'Analyze message'}
        </button>
      </form>

      {factors !== null && level !== null && (
        <div className="scam-text-results" aria-live="polite">
          <p
            className={
              level === 'high'
                ? 'scam-text-high'
                : level === 'moderate'
                  ? 'scam-text-moderate'
                  : 'scam-text-low'
            }
          >
            {level === 'high'
              ? isEs
                ? `Riesgo alto (${score}/100). No respondas ni toques enlaces.`
                : `High risk (${score}/100). Do not reply or tap links.`
              : level === 'moderate'
                ? isEs
                  ? `Riesgo moderado (${score}/100). Verifica por otro canal.`
                  : `Moderate risk (${score}/100). Verify through another channel.`
                : isEs
                  ? `Riesgo bajo (${score}/100). Sin señales claras de estafa.`
                  : `Low risk (${score}/100). No clear scam signals.`}
          </p>
          {factors.length > 0 ? (
            <ul>
              {factors.map((factor) => (
                <li key={factor.id}>
                  {isEs ? factor.labelEs : factor.labelEn}
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {isEs
                ? 'Si aun así desconfías, contacta a la empresa por su sitio oficial, nunca desde este mensaje.'
                : 'If it still feels off, contact the company through its official site — never from this message.'}
            </p>
          )}
        </div>
      )}
      <p className="scam-text-disclaimer">
        {isEs
          ? 'Guía educativa basada en patrones comunes, no un veredicto definitivo.'
          : 'Educational guidance based on common patterns, not a final verdict.'}
      </p>
    </section>
  )
}
