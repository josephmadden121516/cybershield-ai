import { useEffect } from 'react'

/**
 * War-room demo script: a scripted breach walkthrough that drives the real
 * app components end to end (digest -> triage -> patch -> timeline ->
 * briefing -> usage meter). The director (WarRoomDemo) emits cues; each
 * component listens for its cue, runs its normal flow with the scenario
 * input, and emits a done event so the director can advance early.
 *
 * All scenario content is explicitly synthetic. AI steps run through the
 * same metered paths as manual use, so daily caps apply automatically.
 */

export const WAR_ROOM_CUE_EVENT = 'shieldpocket-warroom-cue'
export const WAR_ROOM_DONE_EVENT = 'shieldpocket-warroom-done'

export type WarRoomStepId =
  | 'digest'
  | 'triage'
  | 'patch'
  | 'timeline'
  | 'briefing'
  | 'meter'

export interface WarRoomStep {
  id: WarRoomStepId
  /** DOM id of the section to spotlight. */
  targetId: string
  /** Max dwell in ms before auto-advancing (done events advance early). */
  dwellMs: number
  titleEn: string
  titleEs: string
  captionEn: string
  captionEs: string
}

export const WAR_ROOM_STEPS: WarRoomStep[] = [
  {
    id: 'digest',
    targetId: 'threat-digest',
    dwellMs: 45000,
    titleEn: 'Overnight digest',
    titleEs: 'Resumen nocturno',
    captionEn:
      'Every good shift starts with the overnight picture. The digest summarizes recent reports and activity in one AI call.',
    captionEs:
      'Cada turno empieza con el panorama nocturno. El resumen condensa informes y actividad recientes en una sola llamada de IA.',
  },
  {
    id: 'triage',
    targetId: 'cve-triage',
    dwellMs: 75000,
    titleEn: 'Triage the headline CVE',
    titleEs: 'Priorizar el CVE principal',
    captionEn:
      'A critical supply-chain CVE lands. The demo pastes the scanner output and generates a defensive triage checklist.',
    captionEs:
      'Llega un CVE crítico de cadena de suministro. La demo pega la salida del escáner y genera una lista defensiva.',
  },
  {
    id: 'patch',
    targetId: 'patch-generator',
    dwellMs: 90000,
    titleEn: 'Draft the patch',
    titleEs: 'Proponer el parche',
    captionEn:
      'Triage says rebuild the image. The patch generator drafts a hardened Dockerfile with rationale and rollback steps — for human review, never auto-applied.',
    captionEs:
      'La priorización pide reconstruir la imagen. El generador propone un Dockerfile reforzado con justificación y reversión — para revisión humana, nunca aplicado solo.',
  },
  {
    id: 'timeline',
    targetId: 'incident-timeline',
    dwellMs: 75000,
    titleEn: 'Reconstruct the timeline',
    titleEs: 'Reconstruir la cronología',
    captionEn:
      'Scattered notes from the night shift go in; an ordered incident timeline with gaps comes out.',
    captionEs:
      'Entran notas dispersas del turno nocturno; sale una cronología ordenada del incidente con vacíos señalados.',
  },
  {
    id: 'briefing',
    targetId: 'executive-board-briefing',
    dwellMs: 75000,
    titleEn: 'Brief the board',
    titleEs: 'Informar a la junta',
    captionEn:
      'The local briefing assembles instantly and free; one optional AI pass polishes the narrative for leadership.',
    captionEs:
      'El informe local se genera al instante y gratis; un pase opcional de IA pule la narrativa para la dirección.',
  },
  {
    id: 'meter',
    targetId: 'api-usage',
    dwellMs: 30000,
    titleEn: 'Count the cost',
    titleEs: 'Contar el costo',
    captionEn:
      'The whole war room runs for a few cents, tracked live in the usage meter under the daily cap.',
    captionEs:
      'Toda la sala de guerra cuesta unos centavos, registrados en vivo en el medidor bajo el tope diario.',
  },
]

export function emitWarRoomCue(step: WarRoomStepId): void {
  window.dispatchEvent(new CustomEvent<WarRoomStepId>(WAR_ROOM_CUE_EVENT, { detail: step }))
}

export function emitWarRoomDone(step: WarRoomStepId): void {
  window.dispatchEvent(new CustomEvent<WarRoomStepId>(WAR_ROOM_DONE_EVENT, { detail: step }))
}

/**
 * Run `handler` once per cue for `step`, then emit done so the director
 * can advance. Handlers run their component's normal flow, so all existing
 * metering, caps, and disclaimers apply unchanged.
 */
export function useWarRoomCue(step: WarRoomStepId, handler: () => void | Promise<unknown>): void {
  useEffect(() => {
    const onCue = (event: Event) => {
      if ((event as CustomEvent<WarRoomStepId>).detail !== step) return
      void Promise.resolve()
        .then(handler)
        .then(
          () => emitWarRoomDone(step),
          () => emitWarRoomDone(step)
        )
    }
    window.addEventListener(WAR_ROOM_CUE_EVENT, onCue)
    return () => window.removeEventListener(WAR_ROOM_CUE_EVENT, onCue)
  }, [step, handler])
}

export const WAR_ROOM_SCENARIO = {
  triageInput: {
    en: 'CVE-2024-3094 — xz-utils supply-chain backdoor (versions 5.6.0/5.6.1). Build server runs xz 5.6.1, SSH exposed to the internet, used for release builds. No customer data on the host. Scanner flags it Critical. Need defensive priority: isolate, rebuild, rotate keys?',
    es: 'CVE-2024-3094 — puerta trasera de cadena de suministro en xz-utils (versiones 5.6.0/5.6.1). El servidor de compilación usa xz 5.6.1, SSH expuesto a internet, usado para versiones de lanzamiento. Sin datos de clientes en el equipo. El escáner lo marca Crítico. Prioridad defensiva: ¿aislar, reconstruir, rotar claves?',
  },
  patch: {
    vulnId: 'CVE-2024-3094',
    severity: 'Critical' as const,
    vulnType: {
      en: 'Supply-chain backdoor in base image toolchain',
      es: 'Puerta trasera de cadena de suministro en la imagen base',
    },
    snippet: [
      'FROM ubuntu:latest',
      '',
      'ADD https://example.invalid/toolchain.tar.gz /opt/toolchain.tar.gz',
      'RUN tar -xzf /opt/toolchain.tar.gz -C /opt && rm /opt/toolchain.tar.gz',
      'RUN apt-get update && apt-get install -y xz-utils openssh-server',
      '',
      'COPY . /app',
      'WORKDIR /app',
      'RUN chmod -R 777 /app',
      '',
      'EXPOSE 22 8080',
      'USER root',
      'CMD ["/app/start.sh"]',
    ].join('\n'),
  },
  timelineNotes: {
    en: [
      '09:02 dev reports release builds suddenly slow on build-02',
      '01:58 first failed SSH logins from unknown 203.0.113.45',
      '11:30 build-02 taken offline for imaging',
      '02:14 IDS alert: anomalous outbound SSH from build-02',
      '08:15 confirmed xz 5.6.1 on build-02, internet-facing SSH',
      '03:40 firewall log: 400MB outbound to 198.51.100.23, no ticket',
      '10:05 release keys rotated as precaution',
    ].join('\n'),
    es: [
      '09:02 desarrollo reporta compilaciones lentas en build-02',
      '01:58 primeros inicios SSH fallidos desde 203.0.113.45 desconocida',
      '11:30 build-02 aislado para análisis forense',
      '02:14 alerta IDS: SSH saliente anómalo desde build-02',
      '08:15 confirmado xz 5.6.1 en build-02, SSH expuesto a internet',
      '03:40 firewall: 400MB salientes a 198.51.100.23, sin ticket',
      '10:05 claves de lanzamiento rotadas por precaución',
    ].join('\n'),
  },
} as const
