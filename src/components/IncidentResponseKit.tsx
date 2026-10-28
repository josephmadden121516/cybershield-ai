import { useEffect, useState, type FormEvent } from 'react'
import type { IncidentResponseProgress } from './incidentResponseProgress'
import './IncidentResponseKit.css'

type Language = 'en' | 'es'
type ScenarioId = 'account' | 'ransomware' | 'payment' | 'device'

interface ResponseStep {
  id: string
  title: string
  detail: string
}

interface Playbook {
  title: string
  summary: string
  steps: ResponseStep[]
}

interface IncidentKitData {
  contacts: {
    lead: string
    itSupport: string
    financialProvider: string
  }
  completed: Record<ScenarioId, string[]>
}

interface IncidentKitState {
  data: IncidentKitData
  storageError: boolean
}

const STORAGE_KEY = 'shieldpocket-incident-kit-v1'

const emptyData: IncidentKitData = {
  contacts: { lead: '', itSupport: '', financialProvider: '' },
  completed: { account: [], ransomware: [], payment: [], device: [] },
}

const playbooks: Record<Language, Record<ScenarioId, Playbook>> = {
  en: {
    account: {
      title: 'Suspected account takeover',
      summary: 'Use a trusted device and official account channels. Do not use links from suspicious messages.',
      steps: [
        { id: 'secure-email', title: 'Secure your email account first', detail: 'From a trusted device, go directly to the official service. Change an exposed password, sign out unfamiliar sessions, and review recovery details.' },
        { id: 'secure-accounts', title: 'Protect other affected accounts', detail: 'Change reused passwords to unique ones and enable multifactor authentication where available. Never share verification codes.' },
        { id: 'notify-provider', title: 'Contact the provider', detail: 'Use the provider’s official app, saved bookmark, or known support number and follow its recovery process.' },
        { id: 'preserve-account-evidence', title: 'Preserve relevant evidence', detail: 'Keep suspicious messages and note the time and actions taken. Do not include passwords or codes in your incident notes.' },
        { id: 'notify-team', title: 'Notify your response lead', detail: 'Use the contact details in your local response plan and follow your organization’s incident process.' },
      ],
    },
    ransomware: {
      title: 'Ransomware or suspicious device activity',
      summary: 'If a work device appears actively compromised, contact IT/security support immediately and follow their containment instructions.',
      steps: [
        { id: 'stop-device-use', title: 'Stop using the affected device', detail: 'Do not sign in to additional accounts or connect backup drives. Avoid deleting files or attempting cleanup before getting advice.' },
        { id: 'contact-it', title: 'Contact IT/security support using another device', detail: 'Describe what you observed and when. Follow your organization’s incident plan; do not make changes that could destroy evidence.' },
        { id: 'protect-other-systems', title: 'Avoid connecting other devices', detail: 'Do not connect shared storage or backup media to the affected device. Let your IT/security team guide safe isolation steps.' },
        { id: 'preserve-device-evidence', title: 'Record observations safely', detail: 'Note the device, time, and visible messages. Do not photograph or share sensitive business/customer data unless responders request it securely.' },
        { id: 'restore-with-guidance', title: 'Restore only from known-good backups with guidance', detail: 'Have qualified support verify the recovery approach and backup integrity before restoring business operations.' },
      ],
    },
    payment: {
      title: 'Payment fraud or changed payment instructions',
      summary: 'Act quickly, but verify every request using independently known contact details.',
      steps: [
        { id: 'call-provider', title: 'Contact your bank or payment provider now', detail: 'Use the number on your card or the official app/site. Ask whether the payment can be stopped, recalled, or disputed.' },
        { id: 'notify-finance', title: 'Notify your finance lead and response contact', detail: 'Use a trusted channel, share only necessary transaction details, and follow your organization’s fraud-reporting process.' },
        { id: 'verify-vendor', title: 'Verify the request independently', detail: 'Call a known, previously verified number—not a number or link in the message. Confirm any changed payment instructions verbally.' },
        { id: 'preserve-payment-evidence', title: 'Preserve receipts and communications', detail: 'Keep transaction references and relevant messages for your bank and responders. Do not alter or delete the original evidence.' },
        { id: 'report-fraud', title: 'Report suspected fraud', detail: 'Follow your bank’s and organization’s reporting instructions. If personal information was exposed, ask the provider what additional steps are appropriate.' },
      ],
    },
    device: {
      title: 'Lost or stolen work device',
      summary: 'Use the device maker’s or organization’s official recovery tools; do not try to track or confront anyone yourself.',
      steps: [
        { id: 'report-device', title: 'Tell your IT/security contact promptly', detail: 'Share the device type, approximate time/location last seen, and whether it was locked. Avoid posting identifying details publicly.' },
        { id: 'secure-accounts-device', title: 'Secure important accounts from another trusted device', detail: 'Change credentials if needed, revoke sessions for the lost device, and review account recovery settings.' },
        { id: 'official-device-tools', title: 'Use official lost-device controls', detail: 'Follow the platform’s official instructions to mark the device lost or remotely lock it. Confirm actions with your organization if managed.' },
        { id: 'carrier-report', title: 'Contact your carrier if a phone or tablet was stolen', detail: 'Use the carrier’s official contact channel to ask about suspending the SIM or service.' },
        { id: 'document-device-loss', title: 'Document and report the loss', detail: 'Record when it was noticed, actions taken, and any relevant device identifier requested by your support team.' },
      ],
    },
  },
  es: {
    account: {
      title: 'Posible toma de control de una cuenta',
      summary: 'Usa un dispositivo confiable y los canales oficiales de la cuenta. No abras enlaces de mensajes sospechosos.',
      steps: [
        { id: 'secure-email', title: 'Protege primero tu cuenta de correo', detail: 'Desde un dispositivo confiable, ve directamente al servicio oficial. Cambia la contraseña expuesta, cierra sesiones desconocidas y revisa los datos de recuperación.' },
        { id: 'secure-accounts', title: 'Protege las demás cuentas afectadas', detail: 'Cambia las contraseñas reutilizadas por otras únicas y activa la autenticación multifactor. Nunca compartas códigos de verificación.' },
        { id: 'notify-provider', title: 'Contacta al proveedor', detail: 'Usa la aplicación oficial, un marcador guardado o un número de soporte conocido y sigue el proceso de recuperación.' },
        { id: 'preserve-account-evidence', title: 'Conserva la evidencia relevante', detail: 'Guarda los mensajes sospechosos y anota la hora y las acciones realizadas. No incluyas contraseñas ni códigos en tus notas.' },
        { id: 'notify-team', title: 'Avisa a la persona responsable', detail: 'Usa los datos de contacto de tu plan local y sigue el proceso de incidentes de tu organización.' },
      ],
    },
    ransomware: {
      title: 'Ransomware o actividad sospechosa en un dispositivo',
      summary: 'Si un dispositivo de trabajo parece estar comprometido, contacta de inmediato a soporte de TI/seguridad y sigue sus indicaciones.',
      steps: [
        { id: 'stop-device-use', title: 'Deja de usar el dispositivo afectado', detail: 'No inicies sesión en otras cuentas ni conectes discos de respaldo. Evita borrar archivos o intentar limpiarlo antes de recibir orientación.' },
        { id: 'contact-it', title: 'Contacta a TI/seguridad desde otro dispositivo', detail: 'Describe lo que observaste y cuándo. Sigue el plan de incidentes; no hagas cambios que puedan destruir evidencia.' },
        { id: 'protect-other-systems', title: 'No conectes otros dispositivos', detail: 'No conectes almacenamiento compartido ni respaldos al equipo afectado. Deja que el equipo de TI indique cómo aislarlo de forma segura.' },
        { id: 'preserve-device-evidence', title: 'Registra lo observado de forma segura', detail: 'Anota el dispositivo, la hora y los mensajes visibles. No fotografíes ni compartas datos empresariales o de clientes sin que los respondientes lo soliciten por un canal seguro.' },
        { id: 'restore-with-guidance', title: 'Restaura solo con respaldos confiables y orientación', detail: 'Pide a personal calificado que verifique el método de recuperación y los respaldos antes de reanudar las operaciones.' },
      ],
    },
    payment: {
      title: 'Fraude de pago o cambio de instrucciones bancarias',
      summary: 'Actúa pronto, pero verifica cada solicitud con datos de contacto conocidos de forma independiente.',
      steps: [
        { id: 'call-provider', title: 'Contacta ahora a tu banco o proveedor de pagos', detail: 'Usa el número de tu tarjeta o la aplicación/sitio oficial. Pregunta si se puede detener, recuperar o disputar el pago.' },
        { id: 'notify-finance', title: 'Avisa a finanzas y a la persona responsable', detail: 'Usa un canal confiable, comparte solo los datos necesarios y sigue el proceso de reporte de fraude de tu organización.' },
        { id: 'verify-vendor', title: 'Verifica la solicitud por separado', detail: 'Llama a un número conocido y verificado, no al del mensaje. Confirma verbalmente cualquier cambio de instrucciones de pago.' },
        { id: 'preserve-payment-evidence', title: 'Conserva recibos y comunicaciones', detail: 'Guarda referencias de transacción y mensajes pertinentes para el banco y los respondientes. No alteres ni borres la evidencia original.' },
        { id: 'report-fraud', title: 'Reporta el posible fraude', detail: 'Sigue las instrucciones del banco y de tu organización. Si expusiste información personal, pregunta al proveedor qué pasos adicionales recomienda.' },
      ],
    },
    device: {
      title: 'Dispositivo de trabajo perdido o robado',
      summary: 'Usa las herramientas oficiales del fabricante o de tu organización; no intentes rastrear ni confrontar a nadie.',
      steps: [
        { id: 'report-device', title: 'Avisa pronto a TI/seguridad', detail: 'Indica el tipo de dispositivo, cuándo y dónde lo viste por última vez y si estaba bloqueado. No publiques detalles identificables.' },
        { id: 'secure-accounts-device', title: 'Protege tus cuentas desde otro dispositivo confiable', detail: 'Cambia credenciales si es necesario, revoca sesiones del dispositivo perdido y revisa la recuperación de cuentas.' },
        { id: 'official-device-tools', title: 'Usa controles oficiales para dispositivos perdidos', detail: 'Sigue las instrucciones oficiales de la plataforma para marcarlo como perdido o bloquearlo a distancia. Consulta a tu organización si está administrado.' },
        { id: 'carrier-report', title: 'Contacta a tu operador si robaron un teléfono o tableta', detail: 'Usa un canal oficial del operador para preguntar cómo suspender la SIM o el servicio.' },
        { id: 'document-device-loss', title: 'Documenta y reporta la pérdida', detail: 'Anota cuándo la notaste, qué acciones realizaste y cualquier identificador que solicite tu equipo de soporte.' },
      ],
    },
  },
}

const labels = {
  en: {
    heading: 'Incident response kit',
    intro: 'Offline-ready playbooks for common small-business incidents. Select a scenario to see practical next steps.',
    offline: 'These playbooks work without AI or an internet connection.',
    urgent: 'If someone is in immediate physical danger, contact local emergency services. For active cyber incidents, contact your organization’s qualified IT/security support.',
    contacts: 'Response contacts',
    contactsIntro: 'Save trusted contacts on this device for quick reference. Do not store passwords or verification codes here.',
    lead: 'Incident lead or owner',
    it: 'IT/security support',
    finance: 'Bank or payment provider',
    save: 'Save contacts on this device',
    saved: 'Contacts saved on this device.',
    saveError: 'Could not save contacts in this browser or device storage.',
    steps: 'Response steps',
    progress: 'steps completed',
    copy: 'Copy playbook',
    copied: 'Playbook copied.',
    copyError: 'Could not copy. Check clipboard permission or copy the steps manually.',
    print: 'Print playbook',
    loadError: 'Could not read saved incident-kit data. Defaults are shown; save again to replace the damaged local data.',
    clear: 'Clear saved contacts and progress',
    clearConfirm: 'Clear incident contacts and completed steps saved on this device?',
    cleared: 'Local incident-kit data cleared.',
    disclaimer: 'General guidance only; not a substitute for your organization’s incident plan, qualified responders, legal advice, or emergency services. Steps can vary by device, provider, and jurisdiction.',
    select: 'Choose an incident scenario',
  },
  es: {
    heading: 'Kit de respuesta a incidentes',
    intro: 'Guías listas para usar sin conexión para incidentes comunes en pequeñas empresas. Elige un escenario para ver los siguientes pasos.',
    offline: 'Estas guías funcionan sin IA ni conexión a internet.',
    urgent: 'Si alguien está en peligro físico inmediato, contacta a los servicios de emergencia locales. Para incidentes cibernéticos activos, contacta a personal calificado de TI/seguridad.',
    contacts: 'Contactos de respuesta',
    contactsIntro: 'Guarda contactos confiables en este dispositivo para consultarlos rápidamente. No guardes contraseñas ni códigos de verificación aquí.',
    lead: 'Responsable del incidente o propietario',
    it: 'Soporte de TI/seguridad',
    finance: 'Banco o proveedor de pagos',
    save: 'Guardar contactos en este dispositivo',
    saved: 'Contactos guardados en este dispositivo.',
    saveError: 'No se pudieron guardar los contactos en el almacenamiento del navegador o dispositivo.',
    steps: 'Pasos de respuesta',
    progress: 'pasos completados',
    copy: 'Copiar guía',
    copied: 'Guía copiada.',
    copyError: 'No se pudo copiar. Revisa el permiso del portapapeles o copia los pasos manualmente.',
    print: 'Imprimir guía',
    loadError: 'No se pudieron leer los datos guardados del kit. Se muestran valores iniciales; vuelve a guardar para reemplazar los datos locales dañados.',
    clear: 'Borrar contactos y progreso guardados',
    clearConfirm: '¿Borrar los contactos y pasos completados guardados en este dispositivo?',
    cleared: 'Se borraron los datos locales del kit.',
    disclaimer: 'Orientación general; no sustituye el plan de incidentes de tu organización, a personal calificado, asesoría legal ni a los servicios de emergencia. Los pasos pueden variar según el dispositivo, proveedor y jurisdicción.',
    select: 'Elige un escenario de incidente',
  },
} satisfies Record<Language, Record<string, string>>

function loadData(): IncidentKitState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return { data: emptyData, storageError: false }
    const parsed: unknown = JSON.parse(saved)
    if (!parsed || typeof parsed !== 'object') {
      return { data: emptyData, storageError: true }
    }
    const value = parsed as Partial<IncidentKitData>
    const contacts = value.contacts && typeof value.contacts === 'object'
      ? value.contacts
      : emptyData.contacts
    const completed = value.completed && typeof value.completed === 'object'
      ? value.completed
      : emptyData.completed
    return {
      data: {
        contacts: {
          lead: typeof contacts.lead === 'string' ? contacts.lead : '',
          itSupport: typeof contacts.itSupport === 'string' ? contacts.itSupport : '',
          financialProvider: typeof contacts.financialProvider === 'string' ? contacts.financialProvider : '',
        },
        completed: {
          account: Array.isArray(completed.account) ? completed.account.filter((id): id is string => typeof id === 'string') : [],
          ransomware: Array.isArray(completed.ransomware) ? completed.ransomware.filter((id): id is string => typeof id === 'string') : [],
          payment: Array.isArray(completed.payment) ? completed.payment.filter((id): id is string => typeof id === 'string') : [],
          device: Array.isArray(completed.device) ? completed.device.filter((id): id is string => typeof id === 'string') : [],
        },
      },
      storageError: false,
    }
  } catch {
    return { data: emptyData, storageError: true }
  }
}

function persistData(data: IncidentKitData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

interface IncidentResponseKitProps {
  language: Language
  onProgressChange: (progress: IncidentResponseProgress) => void
}

export function IncidentResponseKit({
  language,
  onProgressChange,
}: IncidentResponseKitProps) {
  const [stored, setStored] = useState<IncidentKitState>(loadData)
  const [scenario, setScenario] = useState<ScenarioId>('account')
  const [status, setStatus] = useState('')
  const copy = labels[language]
  const data = stored.data
  const playbook = playbooks[language][scenario]
  const completed = data.completed[scenario]

  useEffect(() => {
    const scenarios: ScenarioId[] = ['account', 'ransomware', 'payment', 'device']
    onProgressChange({
      scenarios: scenarios.map((scenarioId) => {
        const scenarioPlaybook = playbooks[language][scenarioId]
        const completedIds = data.completed[scenarioId]
        return {
          scenarioTitle: scenarioPlaybook.title,
          completedSteps: scenarioPlaybook.steps
            .filter((step) => completedIds.includes(step.id))
            .map((step) => step.title),
          totalSteps: scenarioPlaybook.steps.length,
        }
      }),
      storageError: stored.storageError,
    })
  }, [data.completed, language, onProgressChange, stored.storageError])

  function updateData(next: IncidentKitData) {
    const saved = persistData(next)
    setStored({ data: next, storageError: !saved })
    if (!saved) {
      setStatus(copy.saveError)
      return false
    }
    setStatus('')
    return true
  }

  function updateContact(
    field: keyof IncidentKitData['contacts'],
    value: string
  ) {
    setStored((current) => ({
      ...current,
      data: {
        ...current.data,
        contacts: { ...current.data.contacts, [field]: value },
      },
    }))
    setStatus('')
  }

  function saveContacts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const saved = updateData(data)
    if (saved) setStatus(copy.saved)
  }

  function toggleStep(stepId: string) {
    const nextCompleted = completed.includes(stepId)
      ? completed.filter((id) => id !== stepId)
      : [...completed, stepId]
    updateData({
      ...data,
      completed: { ...data.completed, [scenario]: nextCompleted },
    })
  }

  async function copyPlaybook() {
    const text = [
      playbook.title,
      playbook.summary,
      ...playbook.steps.map((step, index) => `${index + 1}. ${step.title}\n${step.detail}`),
    ].join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      setStatus(copy.copied)
    } catch {
      setStatus(copy.copyError)
    }
  }

  function clearSavedData() {
    if (!window.confirm(copy.clearConfirm)) return
    const cleared = updateData(emptyData)
    if (cleared) setStatus(copy.cleared)
  }

  const scenarioLabels: Record<ScenarioId, string> = {
    account: language === 'es' ? 'Cuenta comprometida' : 'Account takeover',
    ransomware: language === 'es' ? 'Ransomware o dispositivo sospechoso' : 'Ransomware or suspicious device',
    payment: language === 'es' ? 'Fraude de pago' : 'Payment fraud',
    device: language === 'es' ? 'Dispositivo perdido o robado' : 'Lost or stolen device',
  }

  return (
    <section
      id="incident-response"
      className="content-card incident-response-kit"
      aria-labelledby="incident-response-title"
    >
      <div className="card-heading">
        <div>
          <h2 id="incident-response-title">{copy.heading}</h2>
          <p>{copy.intro}</p>
        </div>
        <span className="demo-tag">{language === 'es' ? 'GUÍAS SIN CONEXIÓN' : 'OFFLINE PLAYBOOKS'}</span>
      </div>

      <p className="incident-response-offline">{copy.offline}</p>
      <p className="incident-response-urgent">{copy.urgent}</p>

      <label className="incident-response-scenario-label" htmlFor="incident-scenario">
        {copy.select}
      </label>
      <select
        id="incident-scenario"
        value={scenario}
        onChange={(event) => {
          setScenario(event.target.value as ScenarioId)
          setStatus('')
        }}
      >
        {(Object.keys(scenarioLabels) as ScenarioId[]).map((id) => (
          <option value={id} key={id}>{scenarioLabels[id]}</option>
        ))}
      </select>

      <article className="incident-response-playbook" aria-live="polite">
        <div className="incident-response-playbook-heading">
          <div>
            <p className="incident-response-eyebrow">{copy.steps}</p>
            <h3>{playbook.title}</h3>
            <p>{playbook.summary}</p>
          </div>
          <div className="incident-response-actions">
            <button type="button" className="secondary-button" onClick={() => void copyPlaybook()}>
              {copy.copy}
            </button>
            <button type="button" className="secondary-button" onClick={() => window.print()}>
              {copy.print}
            </button>
          </div>
        </div>

        <p className="incident-response-progress">
          {completed.length} / {playbook.steps.length} {copy.progress}
        </p>
        <ol className="incident-response-steps">
          {playbook.steps.map((step) => {
            const checked = completed.includes(step.id)
            return (
              <li className={checked ? 'is-complete' : ''} key={step.id}>
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
      </article>

      <form className="incident-response-contacts" onSubmit={saveContacts}>
        <div>
          <h3>{copy.contacts}</h3>
          <p>{copy.contactsIntro}</p>
        </div>
        <label>
          {copy.lead}
          <input
            type="text"
            autoComplete="name"
            maxLength={120}
            value={data.contacts.lead}
            onChange={(event) => updateContact('lead', event.target.value)}
          />
        </label>
        <label>
          {copy.it}
          <input
            type="text"
            autoComplete="off"
            maxLength={160}
            value={data.contacts.itSupport}
            onChange={(event) => updateContact('itSupport', event.target.value)}
          />
        </label>
        <label>
          {copy.finance}
          <input
            type="text"
            autoComplete="off"
            maxLength={160}
            value={data.contacts.financialProvider}
            onChange={(event) => updateContact('financialProvider', event.target.value)}
          />
        </label>
        <button type="submit" className="primary-button">{copy.save}</button>
        <button type="button" className="secondary-button" onClick={clearSavedData}>
          {copy.clear}
        </button>
      </form>

      {(status || stored.storageError) && (
        <p className="incident-response-status" role="status" aria-live="polite">
          {status || copy.loadError}
        </p>
      )}
      <p className="incident-response-disclaimer">{copy.disclaimer}</p>
    </section>
  )
}
