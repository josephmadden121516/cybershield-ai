import { useState } from 'react'
import type { ComplianceFramework } from '../lib/securityAdvisors'
import { requestSecurityAdvisor } from '../lib/securityAdvisors'

interface ComplianceFrameworkMapperProps {
  language: 'en' | 'es'
  assessment: string
}

const frameworkOptions: Array<{ value: ComplianceFramework; label: string }> = [
  { value: 'NIST CSF 2.0', label: 'NIST CSF 2.0' },
  { value: 'ISO/IEC 27001:2022', label: 'ISO/IEC 27001:2022' },
  { value: 'GDPR', label: 'GDPR' },
  { value: 'PCI DSS', label: 'PCI DSS' },
  { value: 'EU AI Act', label: 'EU AI Act' },
]

export function ComplianceFrameworkMapper({
  language,
  assessment,
}: ComplianceFrameworkMapperProps) {
  const isEs = language === 'es'
  const [isOpen, setIsOpen] = useState(false)
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([
    'NIST CSF 2.0',
    'ISO/IEC 27001:2022',
  ])
  const [mapping, setMapping] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleFramework(framework: ComplianceFramework) {
    setFrameworks((selected) =>
      selected.includes(framework)
        ? selected.filter((item) => item !== framework)
        : [...selected, framework]
    )
    setMapping('')
    setErrorMessage('')
  }

  async function generateMapping() {
    if (!frameworks.length || loading) return

    setLoading(true)
    setMapping('')
    setErrorMessage('')
    try {
      const result = await requestSecurityAdvisor(
        'compliance',
        assessment,
        language,
        frameworks
      )
      setMapping(result)
    } catch (error) {
      console.error('Could not generate compliance guidance.', error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEs
            ? 'No se pudo generar la orientación de cumplimiento.'
            : 'Could not generate compliance guidance.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="compliance-mapper">
      <label className="compliance-toggle">
        <input
          type="checkbox"
          checked={isOpen}
          onChange={(event) => {
            setIsOpen(event.target.checked)
            setMapping('')
            setErrorMessage('')
          }}
        />
        <span>
          {isEs
            ? 'Mapear esta evaluación a marcos de cumplimiento'
            : 'Map this assessment to compliance frameworks'}
        </span>
      </label>

      {isOpen && (
        <div className="compliance-mapper-options">
          <p>
            {isEs
              ? 'El resumen de evaluación se enviará a Muse Spark al solicitar el mapeo y usará créditos de API.'
              : 'The assessment summary will be sent to Muse Spark when you request a mapping and will use API credits.'}
          </p>
          <fieldset>
            <legend>{isEs ? 'Selecciona los marcos' : 'Select frameworks'}</legend>
            {frameworkOptions.map((framework) => (
              <label key={framework.value}>
                <input
                  type="checkbox"
                  checked={frameworks.includes(framework.value)}
                  disabled={loading}
                  onChange={() => toggleFramework(framework.value)}
                />
                <span>{framework.label}</span>
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            className="secondary-button"
            disabled={loading || frameworks.length === 0}
            onClick={() => void generateMapping()}
          >
            {loading
              ? isEs ? 'Generando mapeo...' : 'Generating mapping...'
              : isEs ? 'Generar mapeo' : 'Generate framework mapping'}
          </button>
          <p className="compliance-disclaimer">
            {isEs
              ? 'Orientación preliminar, no una auditoría, certificación ni determinación de incumplimiento. Verifica las referencias y aplicabilidad con los estándares oficiales y personal calificado.'
              : 'Preliminary guidance, not an audit, certification, or finding of noncompliance. Verify references and applicability against official standards with qualified personnel.'}
          </p>
          {errorMessage && (
            <p className="compliance-error" role="alert">{errorMessage}</p>
          )}
          {mapping && (
            <div className="advisor-result" role="status" aria-live="polite">
              <h4>{isEs ? 'Mapeo preliminar' : 'Preliminary framework mapping'}</h4>
              <pre>{mapping}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
