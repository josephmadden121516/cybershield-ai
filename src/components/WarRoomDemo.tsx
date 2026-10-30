import { useCallback, useEffect, useRef, useState } from 'react'
import {
  WAR_ROOM_DONE_EVENT,
  WAR_ROOM_STEPS,
  emitWarRoomCue,
  type WarRoomStepId,
} from '../lib/warRoom'
import './WarRoomDemo.css'

interface WarRoomDemoProps {
  language: 'en' | 'es'
}

const CUE_DELAY_MS = 900
const SPOTLIGHT_MS = 2600

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function WarRoomDemo({ language }: WarRoomDemoProps) {
  const isEs = language === 'es'
  const [runIndex, setRunIndex] = useState(-1)
  const [paused, setPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const runIndexRef = useRef(runIndex)
  const pausedRef = useRef(paused)
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    runIndexRef.current = runIndex
    pausedRef.current = paused
  })

  const running = runIndex >= 0 && runIndex < WAR_ROOM_STEPS.length
  const finished = runIndex >= WAR_ROOM_STEPS.length

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) window.clearTimeout(timer)
    timersRef.current = []
    for (const node of document.querySelectorAll('.warroom-spotlight')) {
      node.classList.remove('warroom-spotlight')
    }
  }, [])

  const stop = useCallback(() => {
    clearTimers()
    setPaused(false)
    setRunIndex(-1)
  }, [clearTimers])

  const goTo = useCallback(
    (index: number) => {
      clearTimers()
      setPaused(false)
      setRunIndex(index)
    },
    [clearTimers]
  )

  // Elapsed clock while running and unpaused.
  useEffect(() => {
    if (!running || paused) return
    const startedAt = Date.now() - elapsed * 1000
    const tick = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 500)
    return () => window.clearInterval(tick)
    // elapsed is intentionally read once per (un)pause transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, paused, runIndex])

  // Drive the current step: scroll, spotlight, cue, dwell.
  useEffect(() => {
    if (!running || paused) return
    const step = WAR_ROOM_STEPS[runIndex]
    const target = document.getElementById(step.targetId)
    if (target) {
      target.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      })
      target.classList.add('warroom-spotlight')
      timersRef.current.push(
        window.setTimeout(() => target.classList.remove('warroom-spotlight'), SPOTLIGHT_MS)
      )
    }
    timersRef.current.push(window.setTimeout(() => emitWarRoomCue(step.id), CUE_DELAY_MS))
    timersRef.current.push(
      window.setTimeout(() => goTo(runIndexRef.current + 1), step.dwellMs)
    )
    return clearTimers
  }, [running, paused, runIndex, goTo, clearTimers])

  // Advance early when the cued component finishes its run.
  useEffect(() => {
    if (!running || paused) return
    const onDone = (event: Event) => {
      const doneId = (event as CustomEvent<WarRoomStepId>).detail
      const current = WAR_ROOM_STEPS[runIndexRef.current]
      if (current && doneId === current.id) goTo(runIndexRef.current + 1)
    }
    window.addEventListener(WAR_ROOM_DONE_EVENT, onDone)
    return () => window.removeEventListener(WAR_ROOM_DONE_EVENT, onDone)
  }, [running, paused, goTo])

  useEffect(() => clearTimers, [clearTimers])

  const current = running ? WAR_ROOM_STEPS[runIndex] : null

  return (
    <>
      <section
        id="war-room-demo"
        className="content-card war-room-demo"
        aria-labelledby="war-room-demo-title"
      >
        <div className="card-heading">
          <div>
            <h2 id="war-room-demo-title">
              {isEs ? 'Demo de sala de guerra' : 'War-room demo'}
            </h2>
            <p>
              {isEs
                ? 'Un incidente simulado de principio a fin: resumen, priorización, parche, cronología, informe y costo. Un clic, unos tres minutos.'
                : 'A simulated incident end to end: digest, triage, patch, timeline, briefing, and cost. One click, about three minutes.'}
            </p>
          </div>
          <span className="demo-tag">{isEs ? 'GUIADA' : 'GUIDED'}</span>
        </div>

        <ol className="war-room-script">
          {WAR_ROOM_STEPS.map((step, index) => (
            <li key={step.id}>
              <span className="war-room-script-number" aria-hidden="true">
                {index + 1}
              </span>
              <span>{isEs ? step.titleEs : step.titleEn}</span>
            </li>
          ))}
        </ol>

        <p className="war-room-note">
          {isEs
            ? 'Ejecuta los componentes reales con datos de ejemplo y usa créditos de API (unos centavos). Respeta tu tope diario.'
            : 'Runs the real components with sample data and uses API credits (a few cents). Honors your daily cap.'}
        </p>

        <button
          type="button"
          className="primary-button"
          disabled={running}
          onClick={() => {
            setElapsed(0)
            goTo(0)
          }}
        >
          {running
            ? isEs
              ? 'Demo en curso…'
              : 'Demo running…'
            : finished
              ? isEs
                ? 'Repetir la demo'
                : 'Run it again'
              : isEs
                ? 'Iniciar la demo'
                : 'Start the demo'}
        </button>
      </section>

      {running && current && (
        <div className="war-room-bar" role="status" aria-live="polite">
          <div className="war-room-bar-main">
            <span className="war-room-counter">
              {runIndex + 1}/{WAR_ROOM_STEPS.length}
            </span>
            <div className="war-room-text">
              <strong>{isEs ? current.titleEs : current.titleEn}</strong>
              <span>{isEs ? current.captionEs : current.captionEn}</span>
            </div>
            <span className="war-room-clock" aria-label={isEs ? 'Tiempo' : 'Elapsed'}>
              {formatElapsed(elapsed)}
            </span>
          </div>
          <div className="war-room-progress" aria-hidden="true">
            {WAR_ROOM_STEPS.map((step, index) => (
              <span
                key={step.id}
                className={
                  index < runIndex
                    ? 'war-room-segment done'
                    : index === runIndex
                      ? 'war-room-segment active'
                      : 'war-room-segment'
                }
              />
            ))}
          </div>
          <div className="war-room-controls">
            <button
              type="button"
              className="secondary-button"
              disabled={runIndex === 0}
              onClick={() => goTo(runIndex - 1)}
            >
              {isEs ? 'Anterior' : 'Prev'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                clearTimers()
                setPaused(!paused)
              }}
            >
              {paused ? (isEs ? 'Continuar' : 'Resume') : isEs ? 'Pausa' : 'Pause'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => goTo(runIndex + 1)}
            >
              {isEs ? 'Siguiente' : 'Next'}
            </button>
            <button type="button" className="secondary-button" onClick={stop}>
              {isEs ? 'Salir' : 'Exit'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
