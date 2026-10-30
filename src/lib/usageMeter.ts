import {
  toTokenUsage,
  usageCost,
} from '../../supabase/functions/_shared/usage'

const SPEND_KEY = 'shieldpocket-ai-spend-v1'
const CAP_KEY = 'shieldpocket-daily-cap'
const BALANCE_KEY = 'shieldpocket-credit-balance'

export const DEFAULT_DAILY_CAP = 25
export const DEFAULT_CREDIT_BALANCE = 149.45
export const SPEND_EVENT = 'shieldpocket-spend'

interface SpendRecord {
  totalCost: number
  days: Record<string, number>
}

export function todayKey(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function loadSpend(): SpendRecord {
  try {
    const raw = localStorage.getItem(SPEND_KEY)
    if (!raw) return { totalCost: 0, days: {} }
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return { totalCost: 0, days: {} }
    }
    const record = parsed as Record<string, unknown>
    const days: Record<string, number> = {}
    if (record.days && typeof record.days === 'object') {
      for (const [key, value] of Object.entries(
        record.days as Record<string, unknown>
      )) {
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
          days[key] = value
        }
      }
    }
    const totalCost =
      typeof record.totalCost === 'number' &&
      Number.isFinite(record.totalCost) &&
      record.totalCost > 0
        ? record.totalCost
        : 0
    return { totalCost, days }
  } catch {
    return { totalCost: 0, days: {} }
  }
}

export function getSpendSnapshot(): {
  totalCost: number
  todayCost: number
  day: string
} {
  const record = loadSpend()
  const day = todayKey()
  return {
    totalCost: record.totalCost,
    todayCost: record.days[day] ?? 0,
    day,
  }
}

export function trackUsage(data: unknown): number {
  const cost = usageCost(toTokenUsage(data))
  if (cost > 0) {
    const record = loadSpend()
    const day = todayKey()
    record.totalCost += cost
    record.days[day] = (record.days[day] ?? 0) + cost
    try {
      localStorage.setItem(SPEND_KEY, JSON.stringify(record))
    } catch {
      // Storage failures must not break AI features.
    }
    window.dispatchEvent(new CustomEvent(SPEND_EVENT))
  }
  return cost
}

function readMoney(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const value = Number(raw)
    return Number.isFinite(value) && value >= 0 ? value : fallback
  } catch {
    return fallback
  }
}

export function getDailyCap(): number {
  return readMoney(CAP_KEY, DEFAULT_DAILY_CAP)
}

export function setDailyCap(value: number): void {
  if (!Number.isFinite(value) || value < 0) return
  try {
    localStorage.setItem(CAP_KEY, String(value))
  } catch {
    // Ignore storage failures.
  }
  window.dispatchEvent(new CustomEvent(SPEND_EVENT))
}

export function getCreditBalance(): number {
  return readMoney(BALANCE_KEY, DEFAULT_CREDIT_BALANCE)
}

export function setCreditBalance(value: number): void {
  if (!Number.isFinite(value) || value < 0) return
  try {
    localStorage.setItem(BALANCE_KEY, String(value))
  } catch {
    // Ignore storage failures.
  }
  window.dispatchEvent(new CustomEvent(SPEND_EVENT))
}

export function assertWithinDailyBudget(): void {
  const cap = getDailyCap()
  if (cap <= 0) return
  const { todayCost } = getSpendSnapshot()
  if (todayCost >= cap) {
    throw new Error(
      `Daily AI budget of $${cap.toFixed(2)} reached. Raise the cap or try again tomorrow.`
    )
  }
}
