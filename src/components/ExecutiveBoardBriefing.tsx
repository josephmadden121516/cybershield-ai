import { useState } from 'react'
import type { SecurityActivityEvent } from './SecurityActivityTimeline'
import type { IncidentResponseProgress } from './incidentResponseProgress'
import './ExecutiveBoardBriefing.css'

interface SavedThreatReport {
  id: string
  risk_level: 'low' | 'review' | 'high'
  summary: string
  created_at: string
}

interface ChecklistTask {
  title: string
  completed: boolean
}

interface ExecutiveBoardBriefingProps {
  language: 'en' | 'es'
  activityEvents: SecurityActivityEvent[]
  savedReports: SavedThreatReport[]
  checklistTasks: ChecklistTask[]
  incidentProgress: IncidentResponseProgress
}

function formatDate(value: string, language: 'en' | 'es') {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function markdownEscape(value: string) {
  return value.replace(/\r?\n/g, ' ').trim()
}

export function ExecutiveBoardBriefing({
  language,
  activityEvents,
  savedReports,
  checklistTasks,
  incidentProgress,
}: ExecutiveBoardBriefingProps) {
  const isEs = language === 'es'
  const [briefing, setBriefing] = useState('')
  const [generatedAt, setGeneratedAt] = useState('')
  const [incidentStorageWarning, setIncidentStorageWarning] = useState(false)

  function generateBriefing() {
    const now = new Date()
    const timestamp = now.toISOString()
    const completedTasks = checklistTasks.filter((task) => task.completed)
    const recentReports = savedReports.slice(0, 5)
    const recentEvents = activityEvents.slice(0, 10)
    const riskCounts = savedReports.reduce(
      (counts, report) => {
        counts[report.risk_level] += 1
        return counts
      },
      { high: 0, review: 0, low: 0 }
    )
    const lines = isEs
      ? [
          '# Informe ejecutivo de seguridad',
          '',
          `Generado: ${formatDate(timestamp, language)}`,
          '',
          '## Resumen ejecutivo',
          `- Lista de seguridad autodeclarada: ${completedTasks.length} de ${checklistTasks.length} tareas marcadas como completas (${checklistTasks.length ? Math.round((completedTasks.length / checklistTasks.length) * 100) : 0}%).`,
          `- Informes de amenazas cargados: ${savedReports.length} (máximo 20); ${riskCounts.high} de riesgo alto, ${riskCounts.review} requieren revisión y ${riskCounts.low} de riesgo bajo.`,
          `- Actividad reciente disponible localmente: ${activityEvents.length} eventos.`,
          '',
          '## Evaluaciones de amenazas guardadas más recientes',
          ...(recentReports.length
            ? recentReports.map(
                (report) =>
                  `- **${formatRisk(report.risk_level, language)}** (${formatDate(report.created_at, language)}): ${markdownEscape(report.summary)}`
              )
            : ['- No hay evaluaciones guardadas disponibles.']),
          '',
          '## Progreso del kit de respuesta a incidentes',
          ...formatIncidentProgress(incidentProgress.scenarios, language),
          '',
          '## Actividad de seguridad reciente',
          ...(recentEvents.length
            ? recentEvents.map(
                (event) =>
                  `- **${markdownEscape(event.title)}** (${formatDate(event.occurredAt, language)}): ${markdownEscape(event.detail)}`
              )
            : ['- No hay actividad local disponible.']),
          '',
          '## Alcance y limitaciones',
          '- Este informe resume evaluaciones guardadas, actividad local y casillas de progreso autodeclaradas disponibles en este dispositivo y cuenta.',
          '- No incluye transcripciones del chat ni contenido de mensajes que no se guardó explícitamente en un informe.',
          '- Las evaluaciones y el progreso no confirman una intrusión ni determinan la causa raíz. Verifica los datos y consulta al equipo de seguridad antes de tomar decisiones.',
          ...(incidentProgress.storageError
            ? ['- No se pudo leer el progreso local del kit de respuesta; ese apartado puede estar incompleto.']
            : []),
        ]
      : [
          '# Executive Security Briefing',
          '',
          `Generated: ${formatDate(timestamp, language)}`,
          '',
          '## Executive snapshot',
          `- Self-reported security checklist: ${completedTasks.length} of ${checklistTasks.length} tasks marked complete (${checklistTasks.length ? Math.round((completedTasks.length / checklistTasks.length) * 100) : 0}%).`,
          `- Saved threat reports loaded: ${savedReports.length} (up to 20); ${riskCounts.high} high risk, ${riskCounts.review} needing review, and ${riskCounts.low} low risk.`,
          `- Recent locally available activity: ${activityEvents.length} events.`,
          '',
          '## Latest saved threat assessments',
          ...(recentReports.length
            ? recentReports.map(
                (report) =>
                  `- **${formatRisk(report.risk_level, language)}** (${formatDate(report.created_at, language)}): ${markdownEscape(report.summary)}`
              )
            : ['- No saved assessments are available.']),
          '',
          '## Incident response kit progress',
          ...formatIncidentProgress(incidentProgress.scenarios, language),
          '',
          '## Recent security activity',
          ...(recentEvents.length
            ? recentEvents.map(
                (event) =>
                  `- **${markdownEscape(event.title)}** (${formatDate(event.occurredAt, language)}): ${markdownEscape(event.detail)}`
              )
            : ['- No local activity is available.']),
          '',
          '## Scope and limitations',
          '- This report summarizes saved assessments, local activity, and self-reported checklist progress available on this device and account.',
          '- It excludes chat transcripts and message content that was not explicitly saved in a report.',
          '- Assessments and checklist progress do not confirm a compromise or establish root cause. Verify details and consult your security team before making decisions.',
          ...(incidentProgress.storageError
            ? ['- Local incident-response kit progress could not be read; that section may be incomplete.']
            : []),
        ]

    setBriefing(lines.join('\n'))
    setGeneratedAt(timestamp)
    setIncidentStorageWarning(incidentProgress.storageError)
  }

  function downloadBriefing() {
    const blob = new Blob([briefing], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `shieldpocket-board-briefing-${generatedAt.slice(0, 10)}.md`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function printBriefing() {
    document.body.classList.add('printing-executive-briefing')
    window.addEventListener(
      'afterprint',
      () => document.body.classList.remove('printing-executive-briefing'),
      { once: true }
    )
    window.print()
  }

  return (
    <section
      className="content-card executive-board-briefing"
      aria-labelledby="executive-board-briefing-title"
    >
      <div className="card-heading">
        <div>
          <h2 id="executive-board-briefing-title">
            {isEs ? 'Informe ejecutivo para la junta' : 'Executive board briefing'}
          </h2>
          <p>
            {isEs
              ? 'Genera un resumen local de evaluaciones guardadas, actividad y progreso de respuesta.'
              : 'Create a local summary of saved assessments, activity, and response progress.'}
          </p>
        </div>
        <span className="demo-tag">
          {isEs ? 'GENERADO EN ESTE DISPOSITIVO' : 'GENERATED ON THIS DEVICE'}
        </span>
      </div>

      <div className="executive-board-actions">
        <button type="button" className="primary-button" onClick={generateBriefing}>
          {isEs ? 'Generar informe' : 'Generate board report'}
        </button>
        {briefing && (
          <>
            <button type="button" className="secondary-button" onClick={downloadBriefing}>
              {isEs ? 'Descargar Markdown' : 'Download Markdown'}
            </button>
            <button type="button" className="secondary-button" onClick={printBriefing}>
              {isEs ? 'Imprimir / Guardar PDF' : 'Print / Save PDF'}
            </button>
          </>
        )}
      </div>

      <p className="executive-board-privacy">
        {isEs
          ? 'El informe se compila en este dispositivo; no usa una llamada de IA. Descargarlo o imprimirlo puede guardar o compartir información de seguridad.'
          : 'The report is compiled on this device without an AI call. Downloading or printing it may save or share security information.'}
      </p>

      {incidentStorageWarning && (
        <p className="executive-board-warning" role="status">
          {isEs
            ? 'No se pudo leer el progreso local del kit de respuesta; el informe lo indica como incompleto.'
            : 'Could not read local incident-response progress; the report marks that section as incomplete.'}
        </p>
      )}

      {briefing && (
        <div className="executive-board-output">
          <h3>{isEs ? 'Vista previa del informe' : 'Briefing preview'}</h3>
          <pre>{briefing}</pre>
        </div>
      )}
    </section>
  )
}

function formatRisk(risk: SavedThreatReport['risk_level'], language: 'en' | 'es') {
  if (language === 'es') {
    return risk === 'high' ? 'Riesgo alto' : risk === 'review' ? 'Requiere revisión' : 'Riesgo bajo'
  }
  return risk === 'high' ? 'High risk' : risk === 'review' ? 'Needs review' : 'Low risk'
}

function formatIncidentProgress(
  scenarios: IncidentResponseProgress['scenarios'],
  language: 'en' | 'es'
) {
  return scenarios.flatMap((scenario) => {
    const progress = language === 'es'
      ? `**${scenario.scenarioTitle}:** ${scenario.completedSteps.length} de ${scenario.totalSteps} pasos marcados como completos`
      : `**${scenario.scenarioTitle}:** ${scenario.completedSteps.length} of ${scenario.totalSteps} steps marked complete`
    return [
      `- ${progress}`,
      ...scenario.completedSteps.map((step) => `  - ${markdownEscape(step)}`),
    ]
  })
}
