import type { SecurityActivityEvent } from './SecurityActivityTimeline'

const MAX_EVENTS = 30

function isActivityEvent(value: unknown): value is SecurityActivityEvent {
  if (value === null || typeof value !== 'object') return false

  const event = value as Record<string, unknown>
  return (
    typeof event.id === 'string' &&
    typeof event.ownerId === 'string' &&
    (event.type === 'analysis' || event.type === 'checklist') &&
    typeof event.title === 'string' &&
    event.title.length <= 160 &&
    typeof event.detail === 'string' &&
    event.detail.length <= 240 &&
    typeof event.occurredAt === 'string' &&
    !Number.isNaN(Date.parse(event.occurredAt))
  )
}

export function loadSecurityActivityEvents(ownerId: string): SecurityActivityEvent[] {
  try {
    const saved = localStorage.getItem(`shieldpocket-activity-${ownerId}`)
    if (!saved) return []

    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(isActivityEvent)
      .filter((event) => event.ownerId === ownerId)
      .slice(0, MAX_EVENTS)
  } catch {
    return []
  }
}

export function saveSecurityActivityEvents(
  ownerId: string,
  events: SecurityActivityEvent[]
): boolean {
  try {
    localStorage.setItem(
      `shieldpocket-activity-${ownerId}`,
      JSON.stringify(events.slice(0, MAX_EVENTS))
    )
    return true
  } catch {
    return false
  }
}

export function clearSecurityActivityEvents(ownerId: string): boolean {
  try {
    localStorage.removeItem(`shieldpocket-activity-${ownerId}`)
    return true
  } catch {
    return false
  }
}
