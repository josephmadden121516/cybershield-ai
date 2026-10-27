import { useState } from 'react'
import './PhishingResponseGuide.css'

type RiskLevel = 'low' | 'review' | 'high'
type Scenario =
  | 'not-interacted'
  | 'clicked-link'
  | 'shared-credentials'
  | 'opened-attachment'
  | 'sent-payment'

interface ResponseStep {
  id: string
  title: string
  detail: string
}

interface PhishingResponseGuideProps {
  language: 'es' | 'en'
  riskLevel: RiskLevel
  findings: string[]
}

const scenarioLabelsEs: Record<Scenario, string> = {
  'not-interacted': 'No he interactuado con el mensaje',
  'clicked-link': 'Hice clic en un enlace, pero no ingresé información',
  'shared-credentials': 'Ingresé una contraseña o compartí un código de verificación',
  'opened-attachment': 'Abrí o descargué un archivo adjunto',
  'sent-payment': 'Envié dinero o compartí datos de pago',
}

const scenarioLabels: Record<Scenario, string> = {
  'not-interacted': 'I have not interacted with it',
  'clicked-link': 'I clicked a link, but entered nothing',
  'shared-credentials': 'I entered a password or shared a verification code',
  'opened-attachment': 'I opened or downloaded an attachment',
  'sent-payment': 'I sent money or shared payment details',
}

const scenarioSteps: Record<Scenario, ResponseStep[]> = {
  'not-interacted': [
    {
      id: 'avoid-interaction',
      title: 'Do not reply, click links, or open attachments',
      detail: 'Keep the message available as evidence, but do not follow its instructions.',
    },
    {
      id: 'verify-request',
      title: 'Verify the request independently',
      detail: 'Contact the person or organization using a number, app, or website you already trust—not the details in the message.',
    },
    {
      id: 'report-message',
      title: 'Report or delete the message',
      detail: 'Use your email or messaging app’s report-phishing option, or follow your organization’s reporting process.',
    },
  ],
  'clicked-link': [
    {
      id: 'close-page',
      title: 'Close the page and do not enter information',
      detail: 'Do not download anything or approve prompts. If you did enter a password or code, choose that option above for account recovery steps.',
    },
    {
      id: 'check-downloads',
      title: 'Check whether anything was downloaded',
      detail: 'Do not open an unexpected file. If you opened one, follow the attachment steps and contact your IT support if available.',
    },
    {
      id: 'report-click',
      title: 'Report the message and link',
      detail: 'Report it through your email provider or organization so others can be warned.',
    },
  ],
  'shared-credentials': [
    {
      id: 'change-password',
      title: 'Change the exposed password from a trusted device',
      detail: 'Go directly to the real service using its official app or a saved bookmark. Never use the message link.',
    },
    {
      id: 'secure-reused-passwords',
      title: 'Update any accounts that reused that password',
      detail: 'Use a different, unique password for each account. Do not share passwords or verification codes with anyone.',
    },
    {
      id: 'review-account',
      title: 'Review sign-ins and recovery settings',
      detail: 'Use the service’s official security settings to sign out unfamiliar sessions, check recovery details, and enable multifactor authentication.',
    },
    {
      id: 'contact-service',
      title: 'Contact the service through its official support channel',
      detail: 'Tell them credentials or a verification code may have been exposed and follow their account-recovery guidance.',
    },
  ],
  'opened-attachment': [
    {
      id: 'stop-using-file',
      title: 'Stop interacting with the file',
      detail: 'Do not enable macros, approve additional prompts, or reopen the attachment.',
    },
    {
      id: 'contact-support',
      title: 'Contact your IT or device support team',
      detail: 'Describe what you opened and when. Follow their instructions before deleting files or changing device settings.',
    },
    {
      id: 'check-accounts',
      title: 'Watch for unexpected account activity',
      detail: 'From a trusted device, review important account activity and contact the official service if you see unfamiliar sign-ins.',
    },
  ],
  'sent-payment': [
    {
      id: 'contact-bank',
      title: 'Contact your bank or payment provider immediately',
      detail: 'Use the number on your card or the provider’s official app or website. Ask whether the payment can be stopped or disputed.',
    },
    {
      id: 'notify-business',
      title: 'Notify your finance lead or security contact',
      detail: 'Share the payment details through a trusted channel so your organization can follow its incident process.',
    },
    {
      id: 'preserve-evidence',
      title: 'Preserve the message and transaction details',
      detail: 'Keep copies of the message, payment receipt, and related communications for your bank or incident responders.',
    },
  ],
}

const scenarioStepsEs: Record<Scenario, ResponseStep[]> = {
  'not-interacted': [
    {
      id: 'avoid-interaction',
      title: 'No respondas, no abras enlaces ni archivos adjuntos',
      detail: 'Conserva el mensaje como evidencia, pero no sigas sus instrucciones.',
    },
    {
      id: 'verify-request',
      title: 'Verifica la solicitud por separado',
      detail: 'Contacta a la persona u organización con un número, aplicación o sitio web que ya sepas que es legítimo; no uses los datos del mensaje.',
    },
    {
      id: 'report-message',
      title: 'Reporta o elimina el mensaje',
      detail: 'Usa la opción para reportar phishing de tu correo o sigue el proceso de reporte de tu organización.',
    },
  ],
  'clicked-link': [
    {
      id: 'close-page',
      title: 'Cierra la página y no ingreses información',
      detail: 'No descargues archivos ni aceptes solicitudes. Si ingresaste una contraseña o un código, elige esa opción para ver los pasos de recuperación.',
    },
    {
      id: 'check-downloads',
      title: 'Comprueba si se descargó algún archivo',
      detail: 'No abras archivos inesperados. Si abriste uno, sigue los pasos para archivos adjuntos y contacta a tu equipo de TI si está disponible.',
    },
    {
      id: 'report-click',
      title: 'Reporta el mensaje y el enlace',
      detail: 'Repórtalo a tu proveedor de correo o a tu organización para que puedan alertar a otras personas.',
    },
  ],
  'shared-credentials': [
    {
      id: 'change-password',
      title: 'Cambia la contraseña expuesta desde un dispositivo confiable',
      detail: 'Ve directamente al servicio legítimo con su aplicación oficial o un marcador guardado. No uses el enlace del mensaje.',
    },
    {
      id: 'secure-reused-passwords',
      title: 'Cambia las contraseñas reutilizadas en otras cuentas',
      detail: 'Usa una contraseña diferente y única para cada cuenta. No compartas contraseñas ni códigos de verificación.',
    },
    {
      id: 'review-account',
      title: 'Revisa los inicios de sesión y las opciones de recuperación',
      detail: 'En la configuración oficial del servicio, cierra sesiones desconocidas, revisa los datos de recuperación y activa la autenticación multifactor.',
    },
    {
      id: 'contact-service',
      title: 'Contacta al servicio mediante su canal oficial',
      detail: 'Indica que tus credenciales o un código de verificación podrían haberse expuesto y sigue sus instrucciones para recuperar la cuenta.',
    },
  ],
  'opened-attachment': [
    {
      id: 'stop-using-file',
      title: 'Deja de interactuar con el archivo',
      detail: 'No habilites macros, no aceptes más solicitudes ni vuelvas a abrir el archivo adjunto.',
    },
    {
      id: 'contact-support',
      title: 'Contacta a tu equipo de TI o soporte técnico',
      detail: 'Explica qué abriste y cuándo. Sigue sus instrucciones antes de borrar archivos o cambiar la configuración del dispositivo.',
    },
    {
      id: 'check-accounts',
      title: 'Vigila la actividad inesperada en tus cuentas',
      detail: 'Desde un dispositivo confiable, revisa la actividad de tus cuentas importantes y contacta al servicio oficial si ves accesos desconocidos.',
    },
  ],
  'sent-payment': [
    {
      id: 'contact-bank',
      title: 'Contacta de inmediato a tu banco o proveedor de pagos',
      detail: 'Usa el número de tu tarjeta o la aplicación o sitio web oficial del proveedor. Pregunta si se puede detener o disputar el pago.',
    },
    {
      id: 'notify-business',
      title: 'Avisa a la persona responsable de finanzas o seguridad',
      detail: 'Comparte los datos del pago por un canal confiable para que tu organización siga su proceso de respuesta.',
    },
    {
      id: 'preserve-evidence',
      title: 'Conserva el mensaje y los datos de la transacción',
      detail: 'Guarda copias del mensaje, el recibo del pago y las comunicaciones relacionadas para el banco o el equipo de respuesta.',
    },
  ],
}

export function PhishingResponseGuide({
  language,
  riskLevel,
  findings,
}: PhishingResponseGuideProps) {
  const [scenario, setScenario] = useState<Scenario>('not-interacted')
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const isEs = language === 'es'
  const labels = isEs ? scenarioLabelsEs : scenarioLabels
  const steps = (isEs ? scenarioStepsEs : scenarioSteps)[scenario]
  const riskLabel =
    isEs
      ? riskLevel === 'high'
        ? 'Indicadores de riesgo alto'
        : riskLevel === 'review'
          ? 'Requiere revisión cuidadosa'
          : 'No se detectaron alertas comunes'
      : riskLevel === 'high'
        ? 'High risk indicators'
        : riskLevel === 'review'
          ? 'Needs careful review'
          : 'No common warning patterns found'

  function changeScenario(value: Scenario) {
    setScenario(value)
    setCompletedSteps([])
  }

  function toggleStep(stepId: string) {
    setCompletedSteps((current) =>
      current.includes(stepId)
        ? current.filter((id) => id !== stepId)
        : [...current, stepId]
    )
  }

  return (
    <section
      className="phishing-response-guide"
      aria-labelledby="response-guide-title"
      lang={language === 'es' ? 'es-MX' : 'en'}
    >
      <div className="phishing-response-heading">
        <div>
          <p className="phishing-response-eyebrow">
            {isEs ? 'GUÍA DE RESPUESTA' : 'GUIDED RESPONSE'}
          </p>
          <h3 id="response-guide-title">
            {isEs ? 'Elige qué ocurrió' : 'Choose what happened'}
          </h3>
          <p>
            {isEs
              ? 'Obtén pasos prácticos según tu situación. ShieldPocket no realiza estas acciones por ti.'
              : 'Get practical next steps based on your situation. ShieldPocket does not perform these actions for you.'}
          </p>
        </div>
        <span className={`phishing-risk-badge phishing-risk-${riskLevel}`}>
          {riskLabel}
        </span>
      </div>

      <label htmlFor="phishing-scenario">
        {isEs ? '¿Qué hiciste con este mensaje?' : 'What did you do with this message?'}
      </label>
      <select
        id="phishing-scenario"
        value={scenario}
        onChange={(event) => changeScenario(event.target.value as Scenario)}
      >
        {(Object.keys(scenarioLabels) as Scenario[]).map((value) => (
          <option value={value} key={value}>
            {labels[value]}
          </option>
        ))}
      </select>

      {findings.length > 0 && (
        <details className="phishing-response-context">
          <summary>
            {isEs ? 'Revisar el contexto del análisis' : 'Review the analysis context'}
          </summary>
          <ul>
            {findings.slice(0, 5).map((finding, index) => (
              <li key={`${index}-${finding}`}>{finding}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="phishing-response-progress" aria-live="polite">
        <span>
          {isEs
            ? `${completedSteps.length} de ${steps.length} pasos marcados como completados`
            : `${completedSteps.length} of ${steps.length} steps marked complete`}
        </span>
        <progress value={completedSteps.length} max={steps.length}>
          {completedSteps.length} of {steps.length}
        </progress>
      </div>

      <ol className="phishing-response-steps">
        {steps.map((step) => {
          const checked = completedSteps.includes(step.id)
          return (
            <li
              className={checked ? 'phishing-response-step is-complete' : 'phishing-response-step'}
              key={step.id}
            >
              <label>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleStep(step.id)}
                />
                <span>
                  <strong>{step.title}</strong>
                  <small>{step.detail}</small>
                </span>
              </label>
            </li>
          )
        })}
      </ol>

      <p className="phishing-response-disclaimer">
        {isEs
          ? 'Un resultado de riesgo bajo no demuestra que el mensaje sea seguro. Si hubo una pérdida financiera, sospechas que tomaron una cuenta o puede haber malware, contacta pronto al proveedor correspondiente o a personal calificado de TI o seguridad.'
          : 'A low-risk result does not prove a message is safe. For financial loss, suspected account takeover, or possible malware, contact the relevant provider or qualified IT/security support promptly.'}
      </p>
    </section>
  )
}
