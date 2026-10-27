import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth'
import './MobileDevicePosture.css'

type ManualCheck = 'unchecked' | 'ok' | 'attention'

interface DeviceCheckResult {
  deviceIsSecure: boolean
  isAvailable: boolean
  checkedAt: string
}

const manualChecks: Array<{
  id: 'os-updates' | 'device-integrity'
  label: string
  instructions: string
}> = [
  {
    id: 'os-updates',
    label: 'Operating system updates',
    instructions:
      'Review your device settings and confirm the latest security updates are installed.',
  },
  {
    id: 'device-integrity',
    label: 'Device integrity',
    instructions:
      'If you know the device has been rooted or jailbroken, mark this as needing attention. This app cannot detect device compromise.',
  },
]

export function MobileDevicePosture() {
  const platform = Capacitor.getPlatform()
  const isNative = Capacitor.isNativePlatform()
  const [isChecking, setIsChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<DeviceCheckResult | null>(null)
  const [manualResults, setManualResults] = useState<
    Record<'os-updates' | 'device-integrity', ManualCheck>
  >({
    'os-updates': 'unchecked',
    'device-integrity': 'unchecked',
  })
  const [errorMessage, setErrorMessage] = useState('')

  async function checkDeviceSecurity() {
    if (!isNative || isChecking) return

    setIsChecking(true)
    setErrorMessage('')

    try {
      const result = await BiometricAuth.checkBiometry()
      setCheckResult({
        deviceIsSecure: result.deviceIsSecure,
        isAvailable: result.isAvailable,
        checkedAt: new Date().toLocaleString(),
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Device security information could not be checked.'
      )
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <section
      id="mobile-device-posture"
      className="content-card mobile-device-posture"
      aria-labelledby="mobile-device-posture-title"
    >
      <div className="card-heading">
        <div>
          <h2 id="mobile-device-posture-title">Mobile device posture</h2>
          <p>
            Review basic device protections. Results are limited to information
            the app can actually access.
          </p>
        </div>
        <span className="demo-tag">DEVICE CHECK</span>
      </div>

      <p className="mobile-device-platform">
        App platform: <strong>{platform}</strong>
      </p>

      {isNative ? (
        <div className="mobile-device-check">
          <div>
            <strong>Device passcode and biometrics</strong>
            <p>
              Check whether a device passcode is configured and whether
              biometrics are enrolled for app use.
            </p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void checkDeviceSecurity()}
            disabled={isChecking}
          >
            {isChecking ? 'Checking…' : 'Check device settings'}
          </button>
        </div>
      ) : (
        <p className="mobile-device-note">
          Device passcode and biometric status are available only in the native
          iOS or Android app.
        </p>
      )}

      {checkResult && (
        <div className="mobile-device-results" role="status" aria-live="polite">
          <p>
            Device passcode:{' '}
            <strong>
              {checkResult.deviceIsSecure ? 'Detected' : 'Not detected'}
            </strong>
          </p>
          <p>
            Biometrics enrolled for apps:{' '}
            <strong>{checkResult.isAvailable ? 'Available' : 'Not available'}</strong>
          </p>
          <small>Checked {checkResult.checkedAt}</small>
          {!checkResult.deviceIsSecure && (
            <p className="mobile-device-warning">
              Set a device passcode in your system settings to protect local data.
            </p>
          )}
        </div>
      )}

      {errorMessage && (
        <p className="mobile-device-error" role="alert">
          Device settings could not be checked: {errorMessage}
        </p>
      )}

      <h3>Manual checks</h3>
      <p className="mobile-device-note">
        These checks are self-reported. ShieldPocket cannot inspect OS patch
        levels or detect rooted/jailbroken devices using the installed APIs.
      </p>
      <div className="mobile-device-manual-checks">
        {manualChecks.map((check) => (
          <div className="mobile-device-manual-item" key={check.id}>
            <div>
              <strong>{check.label}</strong>
              <p>{check.instructions}</p>
            </div>
            <select
              aria-label={`${check.label} self-check result`}
              value={manualResults[check.id]}
              onChange={(event) => {
                const value = event.target.value as ManualCheck
                setManualResults((current) => ({
                  ...current,
                  [check.id]: value,
                }))
              }}
            >
              <option value="unchecked">Not checked</option>
              <option value="ok">I verified this</option>
              <option value="attention">Needs attention</option>
            </select>
          </div>
        ))}
      </div>
      <p className="disclaimer">
        This is a limited posture check, not an MDM compliance scan or a
        security certification. Manual answers are not independently verified.
      </p>
    </section>
  )
}
