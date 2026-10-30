import { useState, type FormEvent } from 'react'
import {
  requestKevWatch,
  type KevWatchHit,
} from '../lib/securityAdvisors'
import './ThreatWatcher.css'

const WATCHLIST_KEY = 'shieldpocket-kev-watchlist'
const LAST_CHECK_KEY = 'shieldpocket-kev-lastcheck'
const MAX_KEYWORDS = 20

interface ThreatWatcherProps {
  language: 'en' | 'es'
}

function loadWatchlist(): string[] {
  try {
    const saved = localStorage.getItem(WATCHLIST_KEY)
    if (!saved) return []
    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
    )
  } catch {
    return []
  }
}

export function ThreatWatcher({ language }: ThreatWatcherProps) {
  const isEs = language === 'es'
  const [keywords, setKeywords] = useState<string[]>(loadWatchlist)
  const [draft, setDraft] = useState('')
  const [matches, setMatches] = useState<KevWatchHit[] | null>(null)
  const [checkedAt, setCheckedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_CHECK_KEY)
    } catch {
      return null
    }
  })
  const [checking, setChecking] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  function persistWatchlist(next: string[]) {
    setKeywords(next)
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next))
    } catch {
      // Storage may be unavailable; the list still works for this session.
    }
  }

  function addKeyword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed || keywords.length >= MAX_KEYWORDS) return
    if (keywords.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) {
      setDraft('')
      return
    }
    persistWatchlist([...keywords, trimmed])
    setDraft('')
  }

  function removeKeyword(keyword: string) {
    persistWatchlist(keywords.filter((entry) => entry !== keyword))
  }

  async function checkNow() {
    if (checking || keywords.length === 0) return
    setChecking(true)
    setErrorMessage('')
    try {
      const result = await requestKevWatch(keywords)
      setMatches(result.matches)
      setCheckedAt(result.checkedAt)
      try {
        localStorage.setItem(LAST_CHECK_KEY, result.checkedAt)
      } catch {
        // Ignore storage failures.
      }
    } catch (error) {
      console.error('Could not check the KEV catalog.', error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEs
            ? 'No se pudo revisar el catálogo.'
            : 'Could not check the catalog.'
      )
    } finally {
      setChecking(false)
    }
  }

  return (
    <section
      id="threat-watcher"
      className="content-card threat-watcher"
      aria-labelledby="threat-watcher-title"
    >
      <div className="card-heading">
        <div>
          <h2 id="threat-watcher-title">
            {isEs ? 'Vigilante de amenazas' : 'Threat watcher'}
          </h2>
          <p>
            {isEs
              ? 'Guarda los productos que usas y comprueba si CISA los marca como explotados activamente.'
              : 'Save the products you run and check whether CISA flags them as actively exploited.'}
          </p>
        </div>
        <span className="demo-tag">{isEs ? 'GRATIS' : 'FREE'}</span>
      </div>

      <form onSubmit={addKeyword} className="threat-watcher-add">
        <label htmlFor="threat-watcher-input">
          {isEs ? 'Añadir producto o proveedor' : 'Add a product or vendor'}
        </label>
        <div className="threat-watcher-add-row">
          <input
            id="threat-watcher-input"
            value={draft}
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={isEs ? 'p. ej., Fortinet, XZ Utils' : 'e.g., Fortinet, XZ Utils'}
          />
          <button
            type="submit"
            className="secondary-button"
            disabled={!draft.trim() || keywords.length >= MAX_KEYWORDS}
          >
            {isEs ? 'Añadir' : 'Add'}
          </button>
        </div>
      </form>

      {keywords.length > 0 && (
        <ul className="threat-watcher-list" aria-label={isEs ? 'Lista de vigilancia' : 'Watchlist'}>
          {keywords.map((keyword) => (
            <li key={keyword}>
              <span>{keyword}</span>
              <button
                type="button"
                className="threat-watcher-remove"
                aria-label={isEs ? `Quitar ${keyword}` : `Remove ${keyword}`}
                onClick={() => removeKeyword(keyword)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="threat-watcher-actions">
        <button
          type="button"
          className="primary-button"
          disabled={checking || keywords.length === 0}
          onClick={() => void checkNow()}
        >
          {checking
            ? isEs
              ? 'Revisando…'
              : 'Checking…'
            : isEs
              ? 'Revisar ahora'
              : 'Check now'}
        </button>
        {checkedAt && (
          <small>
            {isEs ? 'Última revisión' : 'Last checked'}:{' '}
            {new Date(checkedAt).toLocaleString()}
          </small>
        )}
      </div>

      {errorMessage && (
        <p className="threat-watcher-error" role="alert">
          {errorMessage}
        </p>
      )}

      {matches && (
        <div className="threat-watcher-results" role="status" aria-live="polite">
          {matches.length === 0 ? (
            <p className="threat-watcher-clean">
              {isEs
                ? 'Sin coincidencias: nada de tu lista está en el catálogo de exploits activos.'
                : 'No matches: nothing on your list is in the actively-exploited catalog.'}
            </p>
          ) : (
            <>
              <p className="threat-watcher-hits">
                {isEs
                  ? `${matches.length} coincidencia${matches.length === 1 ? '' : 's'} en exploits activos:`
                  : `${matches.length} actively-exploited match${matches.length === 1 ? '' : 'es'}:`}
              </p>
              <ul>
                {matches.map((hit) => (
                  <li key={`${hit.cveId}:${hit.matchedKeyword}`}>
                    <p>
                      <strong>{hit.cveId}</strong>
                      {hit.product || hit.vendorProject
                        ? ` · ${hit.product ?? hit.vendorProject}`
                        : ''}
                      <span className="threat-watcher-keyword">
                        {' '}
                        ({isEs ? 'coincide' : 'matched'} “{hit.matchedKeyword}”)
                      </span>
                    </p>
                    {hit.shortDescription && <p>{hit.shortDescription}</p>}
                    {hit.requiredAction && (
                      <p>
                        <strong>{isEs ? 'Acción requerida' : 'Required action'}:</strong>{' '}
                        {hit.requiredAction}
                        {hit.dueDate ? ` (${isEs ? 'límite' : 'due'} ${hit.dueDate})` : ''}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <p className="threat-watcher-disclaimer">
        {isEs
          ? 'Consulta gratuita y de solo lectura del catálogo público KEV de CISA. No analiza tus sistemas ni prueba nada.'
          : 'Free read-only checks against the public CISA KEV catalog. It never scans your systems or tests anything.'}
      </p>
    </section>
  )
}
