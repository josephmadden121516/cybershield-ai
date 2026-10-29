import type { SecurityActivityEvent } from '../components/SecurityActivityTimeline'

export interface SampleThreatReport {
  id: string
  message_text: string
  risk_level: 'low' | 'review' | 'high'
  findings: string[]
  summary: string
  created_at: string
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

const sampleReportsEn: SampleThreatReport[] = [
  {
    id: 'demo-report-1',
    message_text:
      'URGENT: Your business account will be suspended in 24 hours. Verify now: http://shieldpocket-billing.example.invalid/verify',
    risk_level: 'high',
    findings: [
      'Sender domain does not match the official service',
      'Urgency pressure with a 24-hour threat',
      'Link leads to a credential-harvest page',
    ],
    summary:
      'High-risk phishing attempt impersonating a billing notice. Do not click; verify through the official site.',
    created_at: hoursAgo(26),
  },
  {
    id: 'demo-report-2',
    message_text:
      'Hi, attaching the updated invoice for last month. Let me know if the new bank details work for the transfer.',
    risk_level: 'review',
    findings: [
      'Unexpected attachment',
      'Mentions changed bank details',
    ],
    summary:
      'Possible invoice-fraud attempt. Independently verify any bank-detail changes by phone before paying.',
    created_at: hoursAgo(49),
  },
  {
    id: 'demo-report-3',
    message_text:
      'Thanks for subscribing to the Riverside Bakery newsletter! Reply STOP to unsubscribe.',
    risk_level: 'low',
    findings: [],
    summary: 'Routine newsletter confirmation with no suspicious indicators.',
    created_at: hoursAgo(75),
  },
]

const sampleReportsEs: SampleThreatReport[] = [
  {
    id: 'demo-report-1',
    message_text:
      'URGENTE: Su cuenta comercial será suspendida en 24 horas. Verifique ahora: http://shieldpocket-billing.example.invalid/verify',
    risk_level: 'high',
    findings: [
      'El dominio del remitente no coincide con el servicio oficial',
      'Presión de urgencia con amenaza de 24 horas',
      'El enlace lleva a una página de robo de credenciales',
    ],
    summary:
      'Intento de phishing de alto riesgo que suplanta un aviso de facturación. No haga clic; verifique en el sitio oficial.',
    created_at: hoursAgo(26),
  },
  {
    id: 'demo-report-2',
    message_text:
      'Hola, adjunto la factura actualizada del mes pasado. Avíseme si los nuevos datos bancarios sirven para la transferencia.',
    risk_level: 'review',
    findings: [
      'Archivo adjunto inesperado',
      'Menciona cambios en los datos bancarios',
    ],
    summary:
      'Posible intento de fraude con facturas. Verifique los cambios bancarios por teléfono antes de pagar.',
    created_at: hoursAgo(49),
  },
  {
    id: 'demo-report-3',
    message_text:
      'Gracias por suscribirse al boletín de Riverside Bakery. Responda STOP para cancelar.',
    risk_level: 'low',
    findings: [],
    summary: 'Confirmación rutinaria sin indicadores sospechosos.',
    created_at: hoursAgo(75),
  },
]

const sampleActivityEn: SecurityActivityEvent[] = [
  {
    id: 'demo-ev-1',
    ownerId: 'demo',
    type: 'analysis',
    title: 'Analyzed suspicious billing message',
    detail: 'Risk: High risk. 3 findings recorded.',
    occurredAt: hoursAgo(26),
  },
  {
    id: 'demo-ev-2',
    ownerId: 'demo',
    type: 'checklist',
    title: 'Completed security checklist task',
    detail: 'Enable multifactor authentication marked complete.',
    occurredAt: hoursAgo(30),
  },
  {
    id: 'demo-ev-3',
    ownerId: 'demo',
    type: 'analysis',
    title: 'Analyzed invoice message',
    detail: 'Risk: Needs review. 2 findings recorded.',
    occurredAt: hoursAgo(49),
  },
  {
    id: 'demo-ev-4',
    ownerId: 'demo',
    type: 'checklist',
    title: 'Completed security checklist task',
    detail: 'Turn on automatic updates marked complete.',
    occurredAt: hoursAgo(52),
  },
]

const sampleActivityEs: SecurityActivityEvent[] = [
  {
    id: 'demo-ev-1',
    ownerId: 'demo',
    type: 'analysis',
    title: 'Analizó un mensaje de facturación sospechoso',
    detail: 'Riesgo: riesgo alto. 3 hallazgos registrados.',
    occurredAt: hoursAgo(26),
  },
  {
    id: 'demo-ev-2',
    ownerId: 'demo',
    type: 'checklist',
    title: 'Completó una tarea de seguridad',
    detail: 'Activar la autenticación multifactor marcada como completa.',
    occurredAt: hoursAgo(30),
  },
  {
    id: 'demo-ev-3',
    ownerId: 'demo',
    type: 'analysis',
    title: 'Analizó un mensaje de factura',
    detail: 'Riesgo: requiere revisión. 2 hallazgos registrados.',
    occurredAt: hoursAgo(49),
  },
  {
    id: 'demo-ev-4',
    ownerId: 'demo',
    type: 'checklist',
    title: 'Completó una tarea de seguridad',
    detail: 'Activar las actualizaciones automáticas marcada como completa.',
    occurredAt: hoursAgo(52),
  },
]

export function getSampleReports(
  language: 'en' | 'es'
): SampleThreatReport[] {
  return language === 'es' ? sampleReportsEs : sampleReportsEn
}

export function getSampleActivityEvents(
  language: 'en' | 'es'
): SecurityActivityEvent[] {
  return language === 'es' ? sampleActivityEs : sampleActivityEn
}
