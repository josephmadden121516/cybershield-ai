import { useState, type FormEvent } from 'react'
import {
  requestAttackTreeSimulation,
  type AttackTreeSimulation,
} from '../lib/securityAdvisors'
import { AttackPathGraph } from './AttackPathGraph'
import './AttackTreeSimulator.css'

const MAX_ASSETS_LENGTH = 12000
const MAX_CUSTOM_SCENARIO_LENGTH = 500
const CUSTOM_SCENARIO_VALUE = 'custom'

interface AttackTreeSimulatorProps {
  language: 'en' | 'es'
}

const scenarioPresets: Array<{
  value: string
  labelEn: string
  labelEs: string
}> = [
  {
    value: 'Phishing-led account takeover',
    labelEn: 'Phishing-led account takeover',
    labelEs: 'Compromiso de cuentas por phishing',
  },
  {
    value: 'Ransomware via exposed remote access',
    labelEn: 'Ransomware via exposed remote access',
    labelEs: 'Ransomware por acceso remoto expuesto',
  },
  {
    value: 'Compromised software update',
    labelEn: 'Compromised software update',
    labelEs: 'Actualización de software comprometida',
  },
  {
    value: 'Malicious insider data theft',
    labelEn: 'Malicious insider data theft',
    labelEs: 'Robo de datos por personal interno',
  },
  {
    value: CUSTOM_SCENARIO_VALUE,
    labelEn: 'Custom scenario',
    labelEs: 'Situación personalizada',
  },
]

export function AttackTreeSimulator({ language }: AttackTreeSimulatorProps) {
  const isEs = language === 'es'
  const [scenario, setScenario] = useState(scenarioPresets[0].value)
  const [customScenario, setCustomScenario] = useState('')
  const [assets, setAssets] = useState('')
  const [simulation, setSimulation] = useState<AttackTreeSimulation | null>(
    null
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const effectiveScenario =
    scenario === CUSTOM_SCENARIO_VALUE ? customScenario : scenario

  async function submitSimulation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setLoading(true)
    setSimulation(null)
    setErrorMessage('')
    try {
      const result = await requestAttackTreeSimulation(
        effectiveScenario,
        assets,
        language
      )
      setSimulation(result)
    } catch (error) {
      console.error('Could not generate attack-tree simulation.', error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEs
            ? 'No se pudo generar la simulación.'
            : 'Could not generate the simulation.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      id="attack-simulator"
      className="content-card attack-simulator"
      aria-labelledby="attack-simulator-title"
    >
      <div className="card-heading">
        <div>
          <h2 id="attack-simulator-title">
            {isEs ? 'Simulador de árboles de ataque' : 'Attack-tree simulator'}
          </h2>
          <p>
            {isEs
              ? 'Selecciona una amenaza hipotética y describe tus activos para ver rutas de ataque, alcance potencial y defensas.'
              : 'Pick a hypothetical threat and describe your assets to explore attack paths, blast radius, and defenses.'}
          </p>
        </div>
        <span className="demo-tag">
          {isEs ? 'SIMULACIÓN HIPOTÉTICA' : 'HYPOTHETICAL SIMULATION'}
        </span>
      </div>

      <form onSubmit={(event) => void submitSimulation(event)}>
        <div className="attack-simulator-grid">
          <label htmlFor="attack-simulator-scenario">
            {isEs ? 'Situación de amenaza' : 'Threat scenario'}
            <select
              id="attack-simulator-scenario"
              value={scenario}
              disabled={loading}
              onChange={(event) => {
                setScenario(event.target.value)
                setSimulation(null)
                setErrorMessage('')
              }}
            >
              {scenarioPresets.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {isEs ? preset.labelEs : preset.labelEn}
                </option>
              ))}
            </select>
          </label>

          {scenario === CUSTOM_SCENARIO_VALUE && (
            <label htmlFor="attack-simulator-custom">
              {isEs ? 'Describe la situación' : 'Describe the scenario'}
              <input
                id="attack-simulator-custom"
                value={customScenario}
                maxLength={MAX_CUSTOM_SCENARIO_LENGTH}
                disabled={loading}
                autoComplete="off"
                onChange={(event) => {
                  setCustomScenario(event.target.value)
                  setSimulation(null)
                  setErrorMessage('')
                }}
              />
            </label>
          )}
        </div>

        <label htmlFor="attack-simulator-assets">
          {isEs ? 'Activos que proteger' : 'Assets to protect'}
        </label>
        <textarea
          id="attack-simulator-assets"
          value={assets}
          maxLength={MAX_ASSETS_LENGTH}
          disabled={loading}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => {
            setAssets(event.target.value)
            setSimulation(null)
            setErrorMessage('')
          }}
          placeholder={
            isEs
              ? 'P. ej., 3 computadoras con Windows, un servidor de archivos y Google Workspace. No incluyas secretos ni datos personales.'
              : 'E.g., 3 Windows workstations, a file server, and Google Workspace. Do not include secrets or personal data.'
          }
        />
        <div className="attack-simulator-input-meta">
          <span>
            {assets.length} / {MAX_ASSETS_LENGTH}
          </span>
          <button
            type="submit"
            className="primary-button"
            disabled={
              loading || !assets.trim() || !effectiveScenario.trim()
            }
          >
            {loading
              ? isEs
                ? 'Simulando...'
                : 'Simulating...'
              : isEs
                ? 'Generar simulación'
                : 'Generate simulation'}
          </button>
        </div>
      </form>

      <p className="attack-simulator-disclaimer">
        {isEs
          ? 'Al solicitar una simulación, el texto se envía a Supabase y Meta y usa créditos de API. Las rutas son hipotéticas: no verifican intrusiones reales ni confirman que un sistema esté comprometido.'
          : 'When you request a simulation, the text is sent to Supabase and Meta and uses API credits. Paths are hypothetical: they do not verify real intrusions or confirm any system is compromised.'}
      </p>

      {errorMessage && (
        <p className="attack-simulator-error" role="alert">
          {errorMessage}
        </p>
      )}

      {simulation && (
        <div
          className="attack-simulator-result"
          role="status"
          aria-live="polite"
        >
          <p className="attack-simulator-hypothetical">
            {simulation.hypotheticalNote}
          </p>

          <h3>{simulation.scenarioTitle}</h3>

          <AttackPathGraph simulation={simulation} language={language} />

          {simulation.attackPaths.map((path, index) => (
            <div key={index} className="attack-simulator-path">
              <h4>
                {isEs ? 'Ruta hipotética' : 'Hypothetical path'} {index + 1}:{' '}
                {path.title}
              </h4>
              <ol>
                {path.steps.map((step, stepIndex) => (
                  <li key={stepIndex}>{step}</li>
                ))}
              </ol>
            </div>
          ))}

          <h3>{isEs ? 'Alcance potencial' : 'Potential blast radius'}</h3>
          <p>{simulation.blastRadius}</p>

          <h3>{isEs ? 'Controles defensivos' : 'Defensive controls'}</h3>
          <ul className="attack-simulator-list">
            {simulation.defensiveControls.map((control, index) => (
              <li key={index}>{control}</li>
            ))}
          </ul>

          <h3>{isEs ? 'Mitigaciones recomendadas' : 'Recommended mitigations'}</h3>
          <ul className="attack-simulator-list">
            {simulation.mitigations.map((mitigation, index) => (
              <li key={index}>{mitigation}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
