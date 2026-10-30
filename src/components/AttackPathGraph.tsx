import type { AttackTreeSimulation } from '../lib/securityAdvisors'
import './AttackPathGraph.css'

interface AttackPathGraphProps {
  simulation: AttackTreeSimulation
  language: 'en' | 'es'
}

const NODE_WIDTH = 176
const NODE_HEIGHT = 46
const NODE_GAP_X = 30
const LANE_GAP_Y = 20
const PAD_X = 8
const PAD_TOP = 30
const MAX_LABEL_CHARS = 26

/** Attacker progression palette: early steps amber, late steps red. */
const DEPTH_COLORS = ['#b97a1a', '#bd6a22', '#c05a28', '#c2492c', '#c43930']

function depthColor(stepIndex: number, totalSteps: number): string {
  if (totalSteps <= 1) return DEPTH_COLORS[DEPTH_COLORS.length - 1]
  const slot = Math.min(
    DEPTH_COLORS.length - 1,
    Math.floor((stepIndex / (totalSteps - 1)) * DEPTH_COLORS.length)
  )
  return DEPTH_COLORS[slot]
}

function truncateLabel(text: string): string {
  const single = text.replace(/\s+/g, ' ').trim()
  return single.length > MAX_LABEL_CHARS
    ? `${single.slice(0, MAX_LABEL_CHARS - 1)}…`
    : single
}

export function AttackPathGraph({ simulation, language }: AttackPathGraphProps) {
  const isEs = language === 'es'
  const maxSteps = Math.max(1, ...simulation.attackPaths.map((path) => path.steps.length))
  const width = PAD_X * 2 + maxSteps * NODE_WIDTH + (maxSteps - 1) * NODE_GAP_X
  const laneHeight = NODE_HEIGHT + LANE_GAP_Y
  const height =
    PAD_TOP + simulation.attackPaths.length * laneHeight - LANE_GAP_Y + 8

  return (
    <figure className="attack-path-graph" aria-label={isEs ? 'Diagrama de rutas de ataque' : 'Attack path diagram'}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={isEs ? 'Rutas hipotéticas de atacante por etapas' : 'Hypothetical attacker paths by stage'}
      >
        <defs>
          <marker
            id="attack-path-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#5b6b76" />
          </marker>
        </defs>
        {simulation.attackPaths.map((path, pathIndex) => {
          const y = PAD_TOP + pathIndex * laneHeight
          return (
            <g key={pathIndex}>
              <text x={PAD_X} y={y - 8} className="attack-path-lane-label">
                {isEs ? `Ruta ${pathIndex + 1}` : `Path ${pathIndex + 1}`}: {truncateLabel(path.title)}
                <title>{path.title}</title>
              </text>
              {path.steps.map((step, stepIndex) => {
                const x = PAD_X + stepIndex * (NODE_WIDTH + NODE_GAP_X)
                return (
                  <g key={stepIndex}>
                    {stepIndex > 0 && (
                      <line
                        x1={x - NODE_GAP_X + 2}
                        y1={y + NODE_HEIGHT / 2}
                        x2={x - 3}
                        y2={y + NODE_HEIGHT / 2}
                        stroke="#5b6b76"
                        strokeWidth={2}
                        markerEnd="url(#attack-path-arrow)"
                      />
                    )}
                    <rect
                      x={x}
                      y={y}
                      width={NODE_WIDTH}
                      height={NODE_HEIGHT}
                      rx={8}
                      fill={depthColor(stepIndex, path.steps.length)}
                    >
                      <title>{step}</title>
                    </rect>
                    <text
                      x={x + 10}
                      y={y + 19}
                      className="attack-path-step-number"
                    >
                      {stepIndex + 1}
                    </text>
                    <text x={x + 30} y={y + 19} className="attack-path-step-label">
                      {truncateLabel(step)}
                    </text>
                    <text x={x + 30} y={y + 35} className="attack-path-step-sub">
                      {stepIndex === 0
                        ? isEs
                          ? 'acceso inicial'
                          : 'initial access'
                        : stepIndex === path.steps.length - 1
                          ? isEs
                            ? 'impacto'
                            : 'impact'
                          : isEs
                            ? 'avance lateral'
                            : 'lateral move'}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
      <figcaption>
        {isEs
          ? 'Cada fila es una ruta hipotética de izquierda (acceso) a derecha (impacto). El detalle completo está debajo.'
          : 'Each row is a hypothetical path running left (access) to right (impact). Full detail is listed below.'}
      </figcaption>
    </figure>
  )
}
