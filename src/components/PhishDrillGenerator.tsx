import { useState, type FormEvent } from 'react'
import {
  requestPhishDrill,
  type PhishDrill,
} from '../lib/securityAdvisors'
import './PhishDrillGenerator.css'

const MAX_AUDIENCE_LENGTH = 12000
const MAX_CUSTOM_DRILL_LENGTH = 200
const CUSTOM_DRILL_VALUE = 'custom'

interface PhishDrillGeneratorProps {
  language: 'en' | 'es'
}

const drillPresets: Array<{
  value: string
  labelEn: string
  labelEs: string
}> = [
  {
    value: 'Fake invoice',
    labelEn: 'Fake invoice',
    labelEs: 'Factura falsa',
  },
  {
    value: 'Password reset',
    labelEn: 'Password reset',
    labelEs: 'Restablecimiento de contraseña',
  },
  {
    value: 'Delivery notice',
    labelEn: 'Delivery notice',
    labelEs: 'Aviso de entrega',
  },
  {
    value: 'Executive request',
    labelEn: 'Executive request',
    labelEs: 'Solicitud ejecutiva',
  },
  {
    value: CUSTOM_DRILL_VALUE,
    labelEn: 'Custom drill',
    labelEs: 'Ejercicio personalizado',
  },
]

export function PhishDrillGenerator({ language }: PhishDrillGeneratorProps) {
  const isEs = language === 'es'
  const [drillType, setDrillType] = useState(drillPresets[0].value)
  const [customDrill, setCustomDrill] = useState('')
  const [audience, setAudience] = useState('')
  const [drill, setDrill] = useState<PhishDrill | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const effectiveDrillType =
    drillType === CUSTOM_DRILL_VALUE ? customDrill : drillType

  async function submitDrill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setLoading(true)
    setDrill(null)
    setErrorMessage('')
    try {
      const result = await requestPhishDrill(
        effectiveDrillType,
        audience,
        language
      )
      setDrill(result)
    } catch (error) {
      console.error('Could not generate phishing drill.', error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEs
            ? 'No se pudo generar el ejercicio.'
            : 'Could not generate the drill.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      id="phish-drill"
      className="content-card phish-drill"
      aria-labelledby="phish-drill-title"
    >
      <div className="card-heading">
        <div>
          <h2 id="phish-drill-title">
            {isEs ? 'Generador de simulacros' : 'Phish drill generator'}
          </h2>
          <p>
            {isEs
              ? 'Crea señuelos ficticios para capacitar a tu equipo, con señales de alerta y guía didáctica.'
              : 'Create fictional training lures for your team, with red flags and teaching guidance.'}
          </p>
        </div>
        <span className="demo-tag">
          {isEs ? 'CAPACITACIÓN SIMULADA' : 'SIMULATED TRAINING'}
        </span>
      </div>

      <form onSubmit={(event) => void submitDrill(event)}>
        <div className="phish-drill-grid">
          <label htmlFor="phish-drill-type">
            {isEs ? 'Tipo de ejercicio' : 'Drill type'}
            <select
              id="phish-drill-type"
              value={drillType}
              disabled={loading}
              onChange={(event) => {
                setDrillType(event.target.value)
                setDrill(null)
                setErrorMessage('')
              }}
            >
              {drillPresets.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {isEs ? preset.labelEs : preset.labelEn}
                </option>
              ))}
            </select>
          </label>

          {drillType === CUSTOM_DRILL_VALUE && (
            <label htmlFor="phish-drill-custom">
              {isEs ? 'Describe el ejercicio' : 'Describe the drill'}
              <input
                id="phish-drill-custom"
                value={customDrill}
                maxLength={MAX_CUSTOM_DRILL_LENGTH}
                disabled={loading}
                autoComplete="off"
                onChange={(event) => {
                  setCustomDrill(event.target.value)
                  setDrill(null)
                  setErrorMessage('')
                }}
              />
            </label>
          )}
        </div>

        <label htmlFor="phish-drill-audience">
          {isEs ? 'Audiencia del equipo' : 'Team audience'}
        </label>
        <textarea
          id="phish-drill-audience"
          value={audience}
          maxLength={MAX_AUDIENCE_LENGTH}
          disabled={loading}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => {
            setAudience(event.target.value)
            setDrill(null)
            setErrorMessage('')
          }}
          placeholder={
            isEs
              ? 'P. ej., personal de almacén con poca experiencia técnica. No incluyas personas ni empresas reales.'
              : 'E.g., warehouse staff with mixed tech experience. Do not include real people or companies.'
          }
        />
        <div className="phish-drill-input-meta">
          <span>
            {audience.length} / {MAX_AUDIENCE_LENGTH}
          </span>
          <button
            type="submit"
            className="primary-button"
            disabled={
              loading || !audience.trim() || !effectiveDrillType.trim()
            }
          >
            {loading
              ? isEs
                ? 'Generando...'
                : 'Generating...'
              : isEs
                ? 'Generar ejercicio'
                : 'Generate drill'}
          </button>
        </div>
      </form>

      <p className="phish-drill-disclaimer">
        {isEs
          ? 'Al solicitar un ejercicio, el texto se envía a Supabase y Meta y usa créditos de API. Los señuelos usan personas y dominios ficticios y son solo para capacitación: no los uses para engañar a víctimas reales.'
          : 'When you request a drill, the text is sent to Supabase and Meta and uses API credits. Lures use fictional people and domains and are for training only: never use them to deceive real victims.'}
      </p>

      {errorMessage && (
        <p className="phish-drill-error" role="alert">
          {errorMessage}
        </p>
      )}

      {drill && (
        <div className="phish-drill-result" role="status" aria-live="polite">
          <p className="phish-drill-training-note">
            {isEs
              ? 'SEÑUELO DE CAPACITACIÓN: ficticio. No lo reenvíes fuera del ejercicio.'
              : 'TRAINING LURE: fictional. Do not forward it outside the drill.'}
          </p>

          <h3>{drill.lureTitle}</h3>

          <div className="phish-drill-lure">
            <p>
              <strong>{isEs ? 'Asunto' : 'Subject'}:</strong> {drill.subject}
            </p>
            <p>
              <strong>{isEs ? 'Remitente' : 'From'}:</strong>{' '}
              <code>{drill.sender}</code>
            </p>
            <pre>{drill.body}</pre>
          </div>

          <h3>{isEs ? 'Señales de alerta' : 'Planted red flags'}</h3>
          <ul className="phish-drill-list">
            {drill.redFlags.map((flag, index) => (
              <li key={index}>{flag}</li>
            ))}
          </ul>

          <h3>{isEs ? 'Notas didácticas' : 'Teaching notes'}</h3>
          <ul className="phish-drill-list">
            {drill.teachingNotes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>

          <h3>{isEs ? 'Informe del ejercicio' : 'Drill debrief'}</h3>
          <p>{drill.debrief}</p>
        </div>
      )}
    </section>
  )
}
