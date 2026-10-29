import { useEffect, useState } from 'react'
import {
  getCreditBalance,
  getDailyCap,
  getSpendSnapshot,
  setCreditBalance,
  setDailyCap,
  SPEND_EVENT,
} from '../lib/usageMeter'
import './UsageMeter.css'

interface UsageMeterProps {
  language: 'en' | 'es'
}

function formatMoney(value: number): string {
  return `$${value.toFixed(value < 1 ? 4 : 2)}`
}

export function UsageMeter({ language }: UsageMeterProps) {
  const isEs = language === 'es'
  const [snapshot, setSnapshot] = useState(getSpendSnapshot)
  const [capInput, setCapInput] = useState(() => String(getDailyCap()))
  const [balanceInput, setBalanceInput] = useState(() =>
    String(getCreditBalance())
  )

  useEffect(() => {
    const refresh = () => {
      setSnapshot(getSpendSnapshot())
      setCapInput(String(getDailyCap()))
      setBalanceInput(String(getCreditBalance()))
    }
    refresh()
    window.addEventListener(SPEND_EVENT, refresh)
    return () => window.removeEventListener(SPEND_EVENT, refresh)
  }, [])

  const remaining = Math.max(0, getCreditBalance() - snapshot.totalCost)
  const overCap =
    getDailyCap() > 0 && snapshot.todayCost >= getDailyCap()

  function commitCap() {
    const value = Number(capInput)
    if (!Number.isFinite(value) || value < 0) {
      setCapInput(String(getDailyCap()))
      return
    }
    setDailyCap(value)
  }

  function commitBalance() {
    const value = Number(balanceInput)
    if (!Number.isFinite(value) || value < 0) {
      setBalanceInput(String(getCreditBalance()))
      return
    }
    setCreditBalance(value)
  }

  return (
    <section
      id="api-usage"
      className="content-card usage-meter"
      aria-labelledby="api-usage-title"
    >
      <div className="card-heading">
        <div>
          <h2 id="api-usage-title">
            {isEs ? 'Uso de la API' : 'API usage'}
          </h2>
          <p>
            {isEs
              ? 'Gasto estimado de créditos de IA con límite diario.'
              : 'Estimated AI credit spend with a daily cap.'}
          </p>
        </div>
      </div>

      <div className="usage-meter-grid">
        <div>
          <span>{isEs ? 'Hoy' : 'Today'}</span>
          <strong>{formatMoney(snapshot.todayCost)}</strong>
        </div>
        <div>
          <span>{isEs ? 'Total' : 'Total'}</span>
          <strong>{formatMoney(snapshot.totalCost)}</strong>
        </div>
        <div>
          <span>{isEs ? 'Restante' : 'Remaining'}</span>
          <strong>{formatMoney(remaining)}</strong>
        </div>
      </div>

      {overCap && (
        <p className="usage-meter-warning" role="alert">
          {isEs
            ? 'Se alcanzó el límite diario. Las funciones de IA se reanudarán mañana o si aumentas el límite.'
            : 'Daily budget reached. AI features resume tomorrow or when you raise the cap.'}
        </p>
      )}

      <div className="usage-meter-grid">
        <label htmlFor="usage-meter-cap">
          {isEs ? 'Límite diario (USD)' : 'Daily cap (USD)'}
          <input
            id="usage-meter-cap"
            inputMode="decimal"
            autoComplete="off"
            value={capInput}
            onChange={(event) => setCapInput(event.target.value)}
            onBlur={commitCap}
          />
        </label>
        <label htmlFor="usage-meter-balance">
          {isEs ? 'Créditos totales (USD)' : 'Total credits (USD)'}
          <input
            id="usage-meter-balance"
            inputMode="decimal"
            autoComplete="off"
            value={balanceInput}
            onChange={(event) => setBalanceInput(event.target.value)}
            onBlur={commitBalance}
          />
        </label>
      </div>
    </section>
  )
}
