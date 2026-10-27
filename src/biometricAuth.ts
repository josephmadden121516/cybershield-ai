import { Capacitor } from '@capacitor/core'
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth'

export interface BiometricAuthenticationResult {
  success: true
  message: string
}

export async function authenticateWithBiometrics(): Promise<BiometricAuthenticationResult> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Device biometric verification is only available in the native app.')
  }

  await BiometricAuth.authenticate({
    reason: 'Verify your identity',
    cancelTitle: 'Cancel',
    iosFallbackTitle: 'Use device passcode',
    allowDeviceCredential: true,
  })

  return {
    success: true,
    message: 'Biometric verification successful.',
  }
}
