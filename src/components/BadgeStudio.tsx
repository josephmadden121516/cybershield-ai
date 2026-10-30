import { useEffect, useMemo, useState } from 'react'
import QRCode from 'react-qr-code'
import './BadgeStudio.css'

interface BadgeStudioProps {
  language: 'en' | 'es'
}

type BadgeType = 'employee' | 'contractor' | 'visitor'

const ZONES = ['Lobby', 'Elevators', 'Server room', 'Parking'] as const
const ROTATION_SECONDS = 30

const EXPIRY_OPTIONS: Array<{ value: number | null; labelEn: string; labelEs: string }> = [
  { value: 4 * 3600, labelEn: '4 hours (visitor)', labelEs: '4 horas (visita)' },
  { value: 24 * 3600, labelEn: '24 hours', labelEs: '24 horas' },
  { value: 7 * 24 * 3600, labelEn: '7 days', labelEs: '7 días' },
  { value: 30 * 24 * 3600, labelEn: '30 days', labelEs: '30 días' },
  { value: null, labelEn: 'No expiry (staff)', labelEs: 'Sin caducidad (personal)' },
]

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function BadgeStudio({ language }: BadgeStudioProps) {
  const isEs = language === 'es'
  const [displayName, setDisplayName] = useState('Ada Reyes')
  const [role, setRole] = useState(isEs ? 'Ingeniera de seguridad' : 'Security engineer')
  const [badgeType, setBadgeType] = useState<BadgeType>('employee')
  const [zones, setZones] = useState<string[]>(['Lobby', 'Elevators'])
  const [expirySeconds, setExpirySeconds] = useState<number | null>(null)
  const [issuedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(tick)
  }, [])

  const rotationNonce = Math.floor(now / (ROTATION_SECONDS * 1000))
  const secondsLeft = ROTATION_SECONDS - Math.floor(now / 1000) % ROTATION_SECONDS
  const expiresAt = expirySeconds === null ? null : issuedAt + expirySeconds * 1000
  const expired = expiresAt !== null && now >= expiresAt

  const payload = useMemo(
    () =>
      JSON.stringify({
        app: 'shieldpocket-demo-badge',
        name: displayName.trim() || 'Unnamed',
        type: badgeType,
        zones,
        issued: new Date(issuedAt).toISOString(),
        expires: expiresAt ? new Date(expiresAt).toISOString() : null,
        nonce: rotationNonce,
      }),
    [displayName, badgeType, zones, issuedAt, expiresAt, rotationNonce]
  )

  function toggleZone(zone: string) {
    setZones((current) =>
      current.includes(zone) ? current.filter((entry) => entry !== zone) : [...current, zone]
    )
  }

  return (
    <section
      id="badge-studio"
      className="content-card badge-studio"
      aria-labelledby="badge-studio-title"
    >
      <div className="card-heading">
        <div>
          <h2 id="badge-studio-title">
            {isEs ? 'Estudio de credencial digital' : 'Digital badge studio'}
          </h2>
          <p>
            {isEs
              ? 'Configura una credencial de muestra y observa cómo rota su código QR.'
              : 'Configure a sample credential and watch its QR code rotate.'}
          </p>
        </div>
        <span className="demo-tag">{isEs ? 'DEMO' : 'DEMO'}</span>
      </div>

      <div className="badge-studio-grid">
        <form className="badge-studio-form" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="badge-studio-name">{isEs ? 'Nombre' : 'Name'}</label>
          <input
            id="badge-studio-name"
            value={displayName}
            maxLength={60}
            autoComplete="off"
            onChange={(event) => setDisplayName(event.target.value)}
          />

          <label htmlFor="badge-studio-role">{isEs ? 'Puesto' : 'Role'}</label>
          <input
            id="badge-studio-role"
            value={role}
            maxLength={60}
            autoComplete="off"
            onChange={(event) => setRole(event.target.value)}
          />

          <span className="badge-studio-label" id="badge-studio-type-label">
            {isEs ? 'Tipo de credencial' : 'Badge type'}
          </span>
          <div className="badge-studio-radios" role="radiogroup" aria-labelledby="badge-studio-type-label">
            {(['employee', 'contractor', 'visitor'] as const).map((type) => (
              <label key={type}>
                <input
                  type="radio"
                  name="badge-type"
                  value={type}
                  checked={badgeType === type}
                  onChange={() => setBadgeType(type)}
                />
                {type === 'employee'
                  ? isEs ? 'Empleado' : 'Employee'
                  : type === 'contractor'
                    ? isEs ? 'Contratista' : 'Contractor'
                    : isEs ? 'Visita' : 'Visitor'}
              </label>
            ))}
          </div>

          <span className="badge-studio-label">{isEs ? 'Zonas de acceso' : 'Access zones'}</span>
          <div className="badge-studio-zones">
            {ZONES.map((zone) => (
              <label key={zone}>
                <input
                  type="checkbox"
                  checked={zones.includes(zone)}
                  onChange={() => toggleZone(zone)}
                />
                {zone}
              </label>
            ))}
          </div>

          <label htmlFor="badge-studio-expiry">{isEs ? 'Caducidad' : 'Expiry'}</label>
          <select
            id="badge-studio-expiry"
            value={expirySeconds === null ? 'none' : String(expirySeconds)}
            onChange={(event) => {
              const value = event.target.value
              setExpirySeconds(value === 'none' ? null : Number(value))
            }}
          >
            {EXPIRY_OPTIONS.map((option) => (
              <option key={option.labelEn} value={option.value === null ? 'none' : String(option.value)}>
                {isEs ? option.labelEs : option.labelEn}
              </option>
            ))}
          </select>

          <span className="badge-studio-label">{isEs ? 'Solo app nativa' : 'Native app only'}</span>
          <ul className="badge-studio-native">
            <li>
              <span>NFC tap</span>
              <small>
                {isEs
                  ? 'Requiere actualización nativa (tras la revisión de Apple).'
                  : 'Requires a native update (after Apple review).'}
              </small>
            </li>
            <li>
              <span>{isEs ? 'Proximidad BLE' : 'BLE proximity'}</span>
              <small>
                {isEs
                  ? 'Requiere actualización nativa (tras la revisión de Apple).'
                  : 'Requires a native update (after Apple review).'}
              </small>
            </li>
            <li>
              <span>Geofence</span>
              <small>
                {isEs
                  ? 'Requiere actualización nativa (tras la revisión de Apple).'
                  : 'Requires a native update (after Apple review).'}
              </small>
            </li>
          </ul>
        </form>

        <div className="badge-studio-preview" aria-live="polite">
          <div className={`badge-card badge-${badgeType}${expired ? ' badge-expired' : ''}`}>
            <p className="badge-card-org">ShieldPocket Demo Corp</p>
            <div className="badge-card-identity">
              <span className="badge-card-avatar" aria-hidden="true">
                {initialsFor(displayName)}
              </span>
              <div>
                <p className="badge-card-name">{displayName.trim() || (isEs ? 'Sin nombre' : 'Unnamed')}</p>
                <p className="badge-card-role">{role}</p>
              </div>
            </div>
            <div className="badge-card-qr">
              <QRCode value={payload} size={148} bgColor="#ffffff" fgColor="#17242e" />
            </div>
            <p className="badge-card-rotate">
              {isEs ? 'El código rota en' : 'Code rotates in'} {secondsLeft}s
            </p>
            <div className="badge-card-zones">
              {zones.length === 0 ? (
                <span>{isEs ? 'Sin zonas' : 'No zones'}</span>
              ) : (
                zones.map((zone) => <span key={zone}>{zone}</span>)
              )}
            </div>
            <p className="badge-card-expiry">
              {expired
                ? isEs ? 'CADUCADA' : 'EXPIRED'
                : expiresAt
                  ? `${isEs ? 'Caduca' : 'Expires'} ${new Date(expiresAt).toLocaleString()}`
                  : isEs ? 'Sin caducidad' : 'No expiry'}
            </p>
          </div>
        </div>
      </div>

      <p className="badge-studio-disclaimer">
        {isEs
          ? 'Credencial de demostración: el QR codifica datos de ejemplo que rotan cada 30 segundos. No abre puertas reales ni sustituye un sistema de control de acceso.'
          : 'Demo credential: the QR encodes sample data rotating every 30 seconds. It opens no real doors and is not an access-control system.'}
      </p>
    </section>
  )
}
