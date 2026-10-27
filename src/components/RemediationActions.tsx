import { useState } from 'react'
import './RemediationActions.css'

export type RemediationActionId = 'revoke' | 'passkey' | 'quarantine'

interface RemediationProps {
  threatId: string
  threatTitle: string
  language: 'en' | 'es'
  onExecuteAction: (
    threatId: string,
    actionId: RemediationActionId
  ) => Promise<void>
  onActionComplete: (actionName: string) => void
}

const actions: Array<{
  id: RemediationActionId
  labelEn: string
  labelEs: string
}> = [
  {
    id: 'revoke',
    labelEn: 'Revoke compromised sessions',
    labelEs: 'Revocar sesiones comprometidas',
  },
  {
    id: 'passkey',
    labelEn: 'Require biometric or passkey re-authentication',
    labelEs: 'Solicitar reautenticación biométrica o con llave de acceso',
  },
  {
    id: 'quarantine',
    labelEn: 'Quarantine sender domain',
    labelEs: 'Poner en cuarentena el dominio del remitente',
  },
]

export function RemediationActions({
  threatId,
  threatTitle,
  language,
  onExecuteAction,
  onActionComplete,
}: RemediationProps) {
  const [executing, setExecuting] = useState<RemediationActionId | null>(null)
  const [completedActions, setCompletedActions] = useState<RemediationActionId[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const isEs = language === 'es'

  async function handleExecute(
    actionId: RemediationActionId,
    label: string
  ) {
    if (executing || completedActions.includes(actionId)) return

    setExecuting(actionId)
    setErrorMessage('')

    try {
      await onExecuteAction(threatId, actionId)
      setCompletedActions((previous) => [...previous, actionId])
      onActionComplete(label)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEs
            ? 'No se pudo completar la acción. Inténtalo de nuevo.'
            : 'The action could not be completed. Please try again.'
      )
    } finally {
      setExecuting(null)
    }
  }

  return (
    <section className="remediation-actions" aria-labelledby="remediation-actions-title">
      <h3 id="remediation-actions-title">
        {isEs ? 'Acciones de respuesta' : 'Response actions'} —{' '}
        <span>{threatTitle}</span>
      </h3>
      <p className="remediation-actions-note">
        {isEs
          ? 'Cada acción requiere un controlador de servidor configurado. Solo se marcará como completada después de que ese controlador confirme el éxito.'
          : 'Each action requires a configured server handler. An action is marked complete only after that handler confirms success.'}
      </p>

      <div className="remediation-action-list">
        {actions.map((action) => {
          const label = isEs ? action.labelEs : action.labelEn
          const isDone = completedActions.includes(action.id)
          const isRunning = executing === action.id

          return (
            <button
              key={action.id}
              type="button"
              disabled={executing !== null || isDone}
              onClick={() => void handleExecute(action.id, label)}
              className={`remediation-action-button${isDone ? ' completed' : ''}`}
            >
              {isRunning
                ? isEs
                  ? 'Ejecutando…'
                  : 'Executing…'
                : isDone
                  ? `✓ ${label}`
                  : label}
            </button>
          )
        })}
      </div>

      {errorMessage && (
        <p className="remediation-action-error" role="alert">
          {errorMessage}
        </p>
      )}
    </section>
  )
}
