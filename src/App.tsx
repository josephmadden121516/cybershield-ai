import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import {
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
  BiometryType,
  isBiometryErrorType,
} from '@aparajita/capacitor-biometric-auth'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'
import VoiceAssistant from './VoiceAssistant'
import { SecurityScoreWidget } from './components/SecurityScoreWidget'
import { MobileDevicePosture } from './components/MobileDevicePosture'
import { PhishingResponseGuide } from './components/PhishingResponseGuide'
import { ComplianceFrameworkMapper } from './components/ComplianceFrameworkMapper'
import { CveTriageAssistant } from './components/CveTriageAssistant'
import { IncidentResponseKit } from './components/IncidentResponseKit'
import { PatchGenerator } from './components/PatchGenerator'
import { AttackTreeSimulator } from './components/AttackTreeSimulator'
import { SyntheticAuditLab } from './components/SyntheticAuditLab'
import { ExecutiveBoardBriefing } from './components/ExecutiveBoardBriefing'
import type { IncidentResponseProgress } from './components/incidentResponseProgress'
import {
  SecurityActivityTimeline,
  type SecurityActivityEvent,
} from './components/SecurityActivityTimeline'
import {
  clearSecurityActivityEvents,
  loadSecurityActivityEvents,
  saveSecurityActivityEvents,
} from './components/securityActivityStorage'

interface BiometryAvailability {
  available: boolean
  biometryType: BiometryType
  deviceIsSecure: boolean
}

function biometryErrorCode(error: unknown): BiometryErrorType | '' {
  if (error instanceof BiometryError) return error.code
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string' && isBiometryErrorType(code)) return code
  }
  return ''
}

function describeBiometryError(error: unknown, status: BiometryAvailability | null): string {
  switch (biometryErrorCode(error)) {
    case BiometryErrorType.userCancel:
    case BiometryErrorType.systemCancel:
    case BiometryErrorType.appCancel:
      return 'Authentication was cancelled. The workspace is still locked.'
    case BiometryErrorType.userFallback:
      return 'Continue with your device passcode to unlock the workspace.'
    case BiometryErrorType.passcodeNotSet:
    case BiometryErrorType.noDeviceCredential:
      return 'Set a device passcode to enable protected unlock, then try again.'
    case BiometryErrorType.biometryNotEnrolled:
      return 'No biometrics are enrolled. Enroll Face ID or Touch ID, or use your device passcode.'
    case BiometryErrorType.biometryNotAvailable:
      return 'Biometric authentication is not available on this device.'
    case BiometryErrorType.biometryLockout:
      return 'Too many failed attempts. Enter your device passcode to re-enable biometric unlock.'
    case BiometryErrorType.authenticationFailed:
      return 'Authentication failed. Try again.'
    case BiometryErrorType.notInteractive:
      return 'Authentication was interrupted. Try again with the app in the foreground.'
    case BiometryErrorType.invalidContext:
      return 'Authentication could not start. Try again.'
    default:
      if (status !== null && !status.available && !status.deviceIsSecure) {
        return 'Biometric unlock is unavailable and no device passcode is set. Use email and password instead.'
      }
      if (status !== null && !status.available) {
        return 'No biometrics are enrolled. Enroll Face ID or Touch ID, or use your device passcode.'
      }
      return 'Authentication was not completed. Try again or use your device passcode if offered.'
  }
}

const securityTasks = [
  {
    title: 'Enable multifactor authentication',
    description: 'Require MFA on email and important business accounts.',
  },
  {
    title: 'Turn on automatic updates',
    description: 'Keep operating systems, browsers, and apps up to date.',
  },
  {
    title: 'Protect backups',
    description: 'Keep protected backups and periodically test recovery.',
  },
  {
    title: 'Use unique passwords',
    description: 'Use a password manager and avoid reusing passwords.',
  },
  {
    title: 'Limit account permissions',
    description: 'Remove unused accounts and restrict administrator access.',
  },
  {
    title: 'Prepare an incident plan',
    description: 'Know who to contact if your business has a security incident.',
  },
]

const firewallTasks = [
  {
    id: 'firewall-enabled',
    title: 'Confirm the firewall is enabled',
    description: 'Check your operating system settings rather than assuming it is enabled.',
  },
  {
    id: 'firewall-updates',
    title: 'Keep your operating system updated',
    description: 'Install security updates and restart when required.',
  },
  {
    id: 'firewall-apps',
    title: 'Review allowed applications',
    description: 'Remove permissions for applications you do not recognize or need.',
  },
  {
    id: 'firewall-sharing',
    title: 'Review network sharing',
    description: 'Disable unnecessary file sharing and remote access.',
  },
]

const cookieConcerns = [
  { id: 'third-party', label: 'Third-party cookies are enabled or present' },
  { id: 'advertising', label: 'Advertising or cross-site tracking is disclosed' },
  { id: 'unclear-consent', label: 'The cookie notice is unclear or consent choices are difficult to find' },
  { id: 'excessive', label: 'The site requests tracking that seems unnecessary for its purpose' },
  { id: 'retention', label: 'Cookie duration or data use is not clearly explained' },
]


function assessPasswordStrength(value: string) {
  const warnings: string[] = []
  const suggestions: string[] = []

  if (!value) {
    return {
      score: 0,
      label: 'Not assessed',
      warnings: [],
      suggestions: ['Enter a sample password to see local feedback.'],
    }
  }

  if (value.length < 12) {
    warnings.push('The password is shorter than 12 characters.')
    suggestions.push('Use a longer password or passphrase.')
  }

  if (value.length < 16) {
    suggestions.push('Consider 16 or more characters for important accounts.')
  }

  if (/^(.)\1+$/.test(value)) {
    warnings.push('The password repeats the same character.')
  }

  if (/password|qwerty|letmein|welcome|admin|123456|iloveyou/i.test(value)) {
    warnings.push('The password contains a commonly used weak word or pattern.')
  }

  if (/^(0123|1234|12345|123456|abcdef|qwerty)/i.test(value)) {
    warnings.push('The password begins with a predictable sequence.')
  }

  const varietyChecks = [
    /[a-z]/.test(value),
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length

  let score = 0
  if (value.length >= 8) score += 1
  if (value.length >= 12) score += 1
  if (value.length >= 16) score += 1
  if (varietyChecks >= 2) score += 1
  if (varietyChecks >= 3) score += 1
  if (varietyChecks === 4) score += 1
  if (warnings.length > 0) score = Math.max(0, score - warnings.length)

  const normalizedScore = Math.max(0, Math.min(6, score))
  const label =
    normalizedScore <= 1 ? 'Weak' :
    normalizedScore <= 3 ? 'Fair' :
    normalizedScore <= 4 ? 'Good' : 'Stronger'

  if (varietyChecks < 3) {
    suggestions.push('Avoid relying on one character type alone.')
  }

  if (!warnings.length && value.length >= 16) {
    suggestions.push('Good signs: keep it unique to one account and store it in a reputable password manager.')
  }

  suggestions.push('Never reuse this password across accounts; enable multifactor authentication where available.')

  return {
    score: normalizedScore,
    label,
    warnings,
    suggestions: [...new Set(suggestions)],
  }
}

const workspaceSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'threat-analyzer', label: 'Threat analyzer' },
  { id: 'cve-triage', label: 'CVE triage' },
  { id: 'patch-generator', label: 'Patch generator' },
  { id: 'attack-simulator', label: 'Attack simulator' },
  { id: 'audit-log-lab', label: 'Audit log lab' },
  { id: 'security-checkup', label: 'Security checkup' },
  { id: 'mobile-device-posture', label: 'Mobile posture' },
  { id: 'incident-response', label: 'Incident response' },
  { id: 'firewall-checkup', label: 'Firewall checkup' },
  { id: 'cookie-privacy', label: 'Cookie privacy' },
  { id: 'password-checker', label: 'Password checker' },
] as const

type WorkspaceSectionId = (typeof workspaceSections)[number]['id']

function isWorkspaceSectionId(value: string): value is WorkspaceSectionId {
  return workspaceSections.some((section) => section.id === value)
}

interface SecurityReport {
  id: string
  message_text: string
  risk_level: 'low' | 'review' | 'high'
  findings: string[]
  summary: string
  created_at: string
}

const MAX_SCREENSHOT_FILE_SIZE = 12 * 1024 * 1024
const MAX_SCREENSHOT_OUTPUT_SIZE = 3_000_000
const MAX_SCREENSHOT_DIMENSION = 1600
const DEFAULT_ANALYZER_MESSAGE =
  'Your business email will be disabled today. Verify your account immediately using this link.'

function getNavigationScrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth'
}

async function prepareScreenshotForAnalysis(file: File): Promise<string> {
  const image = await createImageBitmap(file)

  try {
    if (!image.width || !image.height) {
      throw new Error('The selected image has invalid dimensions.')
    }

    const scale = Math.min(
      1,
      MAX_SCREENSHOT_DIMENSION / image.width,
      MAX_SCREENSHOT_DIMENSION / image.height
    )
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Could not prepare the screenshot for analysis.')
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.88)
    )

    if (!blob || blob.type !== 'image/jpeg') {
      throw new Error('Could not convert the screenshot to JPEG.')
    }
    if (blob.size > MAX_SCREENSHOT_OUTPUT_SIZE) {
      throw new Error('The screenshot is too large to upload after resizing.')
    }

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Could not read the prepared screenshot.'))
        }
      }
      reader.onerror = () =>
        reject(new Error('Could not read the prepared screenshot.'))
      reader.readAsDataURL(blob)
    })
  } finally {
    image.close()
  }
}

function App() {
  const [activeSection, setActiveSection] =
    useState<WorkspaceSectionId>('overview')
  const [assistantLanguage, setAssistantLanguage] = useState<'es' | 'en'>('es')
  const [message, setMessage] = useState(DEFAULT_ANALYZER_MESSAGE)
  const [result, setResult] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisFindings, setAnalysisFindings] = useState<string[]>([])
  const [analysisRiskLevel, setAnalysisRiskLevel] =
    useState<'low' | 'review' | 'high' | null>(null)
  const [analysisSummary, setAnalysisSummary] = useState('')
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotConsent, setScreenshotConsent] = useState(false)
  const [analysisInputType, setAnalysisInputType] = useState<'text' | 'image'>('text')
  const [screenshotError, setScreenshotError] = useState('')
  const screenshotInputRef = useRef<HTMLInputElement>(null)
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState('')
  const screenshotPreviewUrlRef = useRef<string | null>(null)
  const [activityEvents, setActivityEvents] = useState<SecurityActivityEvent[]>(
    () => loadSecurityActivityEvents('guest')
  )
  const [activityStorageError, setActivityStorageError] = useState(false)
  const [incidentProgress, setIncidentProgress] =
    useState<IncidentResponseProgress>({ scenarios: [], storageError: false })
  const [reports, setReports] = useState<SecurityReport[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportMessage, setReportMessage] = useState('')
  const [savingReport, setSavingReport] = useState(false)

  useEffect(() => {
    return () => {
      if (screenshotPreviewUrlRef.current) {
        URL.revokeObjectURL(screenshotPreviewUrlRef.current)
      }
    }
  }, [])

  function updateScreenshotPreview(file: File | null) {
    if (screenshotPreviewUrlRef.current) {
      URL.revokeObjectURL(screenshotPreviewUrlRef.current)
    }

    const previewUrl = file ? URL.createObjectURL(file) : ''
    screenshotPreviewUrlRef.current = previewUrl || null
    setScreenshotPreviewUrl(previewUrl)
  }

  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authMessage, setAuthMessage] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [hasPasskey, setHasPasskey] = useState<boolean | null>(null)
  const [passkeyMessage, setPasskeyMessage] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [faceLockMessage, setFaceLockMessage] = useState('')
  const [faceLockBusy, setFaceLockBusy] = useState(false)
  const [biometryStatus, setBiometryStatus] = useState<BiometryAvailability | null>(null)
  const biometryStatusRef = useRef<BiometryAvailability | null>(null)
  const faceLockBusyRef = useRef(false)
  const currentUserId = user?.id

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setAuthMessage(error.message)
        return
      }
      setUser(data.session?.user ?? null)
      setActivityEvents(loadSecurityActivityEvents(data.session?.user.id ?? 'guest'))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setActivityEvents(loadSecurityActivityEvents(session?.user.id ?? 'guest'))
        setActivityStorageError(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPasskeys() {
      if (!currentUserId || !supabase) {
        setHasPasskey(null)
        setPasskeyMessage('')
        return
      }

      setHasPasskey(null)
      setPasskeyMessage('')

      const { data, error } = await supabase.auth.passkey.list()
      if (cancelled) return

      if (error) {
        setPasskeyMessage(`Could not check registered passkeys: ${error.message}`)
        return
      }

      setHasPasskey((data ?? []).length > 0)
    }

    void loadPasskeys()

    return () => {
      cancelled = true
    }
  }, [currentUserId])


  // Protect the native workspace on launch and whenever the app resumes.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let cancelled = false
    let resumeHandle: { remove: () => Promise<void> } | undefined

    async function unlockWithBiometrics() {
      if (cancelled || faceLockBusyRef.current) return

      faceLockBusyRef.current = true
      setFaceLockBusy(true)
      setFaceLockMessage('')

      try {
        await BiometricAuth.authenticate({
          reason: 'Unlock your ShieldPocket workspace',
          cancelTitle: 'Stay locked',
          iosFallbackTitle: 'Use device passcode',
          allowDeviceCredential: true,
        })

        if (!cancelled) {
          setIsLocked(false)
          setFaceLockMessage('')
        }
      } catch (error) {
        if (!cancelled) {
          setIsLocked(true)
          setFaceLockMessage(describeBiometryError(error, biometryStatusRef.current))
        }
      } finally {
        faceLockBusyRef.current = false
        if (!cancelled) setFaceLockBusy(false)
      }
    }

    async function initializeFaceLock() {
      setIsLocked(true)
      setFaceLockMessage('')

      try {
        // Required before registering the resume listener.
        const biometry = await BiometricAuth.checkBiometry()
        if (cancelled) return
        biometryStatusRef.current = {
          available: biometry.isAvailable,
          biometryType: biometry.biometryType,
          deviceIsSecure: biometry.deviceIsSecure,
        }
        setBiometryStatus(biometryStatusRef.current)

        resumeHandle = await BiometricAuth.addResumeListener((info) => {
          if (cancelled) return
          biometryStatusRef.current = {
            available: info.isAvailable,
            biometryType: info.biometryType,
            deviceIsSecure: info.deviceIsSecure,
          }
          setBiometryStatus(biometryStatusRef.current)
          setIsLocked(true)
          void unlockWithBiometrics()
        })

        if (cancelled) {
          await resumeHandle.remove()
          return
        }

        await unlockWithBiometrics()
      } catch (error) {
        if (!cancelled) {
          setIsLocked(true)
          setFaceLockMessage(describeBiometryError(error, biometryStatusRef.current))
        }
      }
    }

    void initializeFaceLock()

    return () => {
      cancelled = true
      if (resumeHandle) void resumeHandle.remove()
    }
  }, [])

  async function retryFaceLock() {
    setIsLocked(true)
    setFaceLockMessage('')
    // The effect owns the native authentication lifecycle.
    // A page reload is not needed to retry authentication.
    if (faceLockBusyRef.current) return

    faceLockBusyRef.current = true
    setFaceLockBusy(true)
    try {
      await BiometricAuth.authenticate({
        reason: 'Unlock your ShieldPocket workspace',
        cancelTitle: 'Stay locked',
        iosFallbackTitle: 'Use device passcode',
        allowDeviceCredential: true,
      })
      setIsLocked(false)
      setFaceLockMessage('')
    } catch (error) {
      setIsLocked(true)
      setFaceLockMessage(describeBiometryError(error, biometryStatus))
    } finally {
      faceLockBusyRef.current = false
      setFaceLockBusy(false)
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) {
      setAuthMessage('Authentication is not configured yet.')
      return
    }

    setAuthLoading(true)
    setAuthMessage('')

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        if (error) throw error

        setAuthMessage(
          data.session
            ? 'Account created and signed in.'
            : 'Account created. Check your email to confirm your address before signing in.'
        )
        if (data.session) {
          setIsLocked(false)
          setFaceLockMessage('')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
        setAuthMessage('Signed in successfully.')
      }
    } catch (error) {
      setAuthMessage(
        error instanceof Error ? error.message : 'Authentication failed. Please try again.'
      )
    } finally {
      setAuthLoading(false)
    }
  }

  async function handlePasskeySignIn() {
    if (!supabase) {
      setAuthMessage('Authentication is not configured yet.')
      return
    }

    setAuthLoading(true)
    setAuthMessage('Follow your device prompt to sign in with a passkey.')

    try {
      const { error } = await supabase.auth.signInWithPasskey()
      if (error) throw error
      setAuthMessage('Signed in with your passkey successfully.')
    } catch (error) {
      setAuthMessage(
        error instanceof Error
          ? error.message
          : 'Passkey sign-in failed. You can still use your email and password.'
      )
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleRegisterPasskey() {
    if (!supabase || !user) {
      setPasskeyMessage('Sign in before registering a passkey.')
      return
    }

    setAuthLoading(true)
    setPasskeyMessage('Follow your device prompt to create a passkey.')

    try {
      const { error } = await supabase.auth.registerPasskey()
      if (error) throw error
      setHasPasskey(true)
      setPasskeyMessage('Passkey registered. You can use it the next time you sign in.')
    } catch (error) {
      setPasskeyMessage(
        error instanceof Error
          ? error.message
          : 'Passkey registration failed. Your existing sign-in method is unchanged.'
      )
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleSignOut() {
    if (!supabase) return
    setAuthLoading(true)
    setAuthMessage('')
    const { error } = await supabase.auth.signOut()
    setAuthMessage(error ? error.message : 'You have signed out.')
    setAuthLoading(false)
  }

  async function handleDeleteAccount() {
    if (!supabase || !user) return

    const confirmed = window.confirm(
      'Permanently delete your ShieldPocket account and its saved cloud data? This action cannot be undone.'
    )

    if (!confirmed) return

    setAuthLoading(true)
    setAuthMessage('')

    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        method: 'POST',
      })

      if (error || !data?.success) {
        throw new Error(
          'Account deletion could not be confirmed. Please try again. If the problem continues, contact support.'
        )
      }

      await supabase.auth.signOut()
      setAuthMessage('Your account and associated saved cloud data have been deleted.')
      setPassword('')
      setEmail('')
    } catch (error) {
      setAuthMessage(
        error instanceof Error
          ? error.message
          : 'Account deletion failed. Please try again.'
      )
    } finally {
      setAuthLoading(false)
    }
  }

 


  
  async function handleLockPasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) {
      setFaceLockMessage('Authentication is not configured yet.')
      return
    }

    setAuthLoading(true)
    setFaceLockMessage('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error

      setIsLocked(false)
      setFaceLockMessage('')
      setAuthMessage('Signed in successfully.')
    } catch (error) {
      setFaceLockMessage(
        error instanceof Error
          ? error.message
          : 'Email and password sign-in failed. Please try again.'
      )
    } finally {
      setAuthLoading(false)
    }
  }

  


  


const [checklistReadyForUserId, setChecklistReadyForUserId] =
    useState<string | null>(null)
const [securityPlan, setSecurityPlan] = useState('')
const [securityPlanKey, setSecurityPlanKey] = useState('')
const [securityPlanMessage, setSecurityPlanMessage] = useState('')
const [securityPlanLoading, setSecurityPlanLoading] = useState(false)
const [completedTasks, setCompletedTasks] = useState<number[]>(() => {
  try {
    const saved = localStorage.getItem('cybershield-completed-tasks')
    return saved ? (JSON.parse(saved) as number[]) : []
  } catch {
    return []
  }
})

  const [firewallPlatform, setFirewallPlatform] =
    useState<'mac' | 'windows'>('mac')
  const [completedFirewallTasks, setCompletedFirewallTasks] =
    useState<string[]>([])
  const [selectedCookieConcerns, setSelectedCookieConcerns] =
    useState<string[]>([])
  const [passwordCheckInput, setPasswordCheckInput] = useState('')
  const [showPasswordCheckInput, setShowPasswordCheckInput] = useState(false)
  const passwordAssessment = assessPasswordStrength(passwordCheckInput)

  function navigateToSection(section: WorkspaceSectionId) {
    setActiveSection(section)
    if (section !== 'password-checker') {
      setPasswordCheckInput('')
      setShowPasswordCheckInput(false)
    }

    if (section === 'overview') {
      window.scrollTo({ top: 0, behavior: getNavigationScrollBehavior() })
    } else {
      document.getElementById(section)?.scrollIntoView({
        behavior: getNavigationScrollBehavior(),
        block: 'start',
      })
    }
  }

  const nextRecommendedTask = securityTasks.find(
    (_, index) => !completedTasks.includes(index)
  )

  const recommendationTitle =
    nextRecommendedTask?.title ?? 'Review your security plan'

  const recommendationDescription =
    nextRecommendedTask?.description ??
    'All baseline tasks are complete. Review your controls regularly to make sure they remain effective.'
  const currentSecurityPlanKey =
    `${assistantLanguage}:${[...completedTasks].sort((a, b) => a - b).join(',')}`

  async function generateSecurityPlan() {
    if (!supabase || !isSupabaseConfigured) {
      setSecurityPlanMessage(
        assistantLanguage === 'es'
          ? 'El servicio de IA no está configurado. No se generó ningún plan.'
          : 'The AI service is not configured. No plan was generated.'
      )
      return
    }

    const checklistStatus = securityTasks
      .map((task, index) => {
        const status = completedTasks.includes(index) ? 'COMPLETE' : 'NOT COMPLETE'
        return `- ${task.title}: ${status}. ${task.description}`
      })
      .join('\n')
    const prompt = assistantLanguage === 'es'
      ? `Crea un plan breve y práctico para mejorar la seguridad de una pequeña empresa usando únicamente esta lista de verificación. Prioriza primero los elementos incompletos, propón pasos pequeños y realistas y explica el beneficio de cada uno. Si todos están completos, ofrece un plan de mantenimiento. No afirmes que verificaste controles en el dispositivo o la empresa. Responde en español, con prioridades numeradas y un aviso breve de que el plan es orientación general, no una auditoría. Usa texto sin formato, sin marcadores Markdown como asteriscos.\n\nEstado de la lista:\n${checklistStatus}`
      : `Create a concise, practical security improvement plan for a small business using only this checklist. Prioritize incomplete items first, suggest small realistic steps, and explain the benefit of each. If everything is complete, provide a maintenance plan. Do not claim you verified any controls on the device or in the business. Respond in English, with numbered priorities and a brief note that this is general guidance, not an audit. Use plain text without Markdown markers such as asterisks.\n\nChecklist status:\n${checklistStatus}`

    setSecurityPlanLoading(true)
    setSecurityPlanMessage(
      assistantLanguage === 'es'
        ? 'Generando un plan con el estado de tu lista de verificación…'
        : 'Generating a plan from your checklist status…'
    )

    try {
      const { data, error } = await supabase.functions.invoke('sophia-chat', {
        body: { message: prompt, history: [] },
      })

      if (error) throw error

      const reply = typeof data?.reply === 'string' ? data.reply.trim() : ''
      if (!reply) {
        throw new Error('The AI function returned no plan.')
      }

      setSecurityPlan(reply)
      setSecurityPlanKey(currentSecurityPlanKey)
      setSecurityPlanMessage(
        assistantLanguage === 'es'
          ? 'Plan generado. Se compartieron las tareas integradas y su estado con el servicio de IA.'
          : 'Plan generated. The built-in checklist tasks and their status were shared with the AI service.'
      )
    } catch (error) {
      console.error('Could not generate the AI security plan.', error)
      setSecurityPlanMessage(
        assistantLanguage === 'es'
          ? 'No se pudo generar el plan con IA. Inténtalo de nuevo más tarde.'
          : 'Could not generate the AI plan. Please try again later.'
      )
    } finally {
      setSecurityPlanLoading(false)
    }
  }

  function recordActivity(
    type: SecurityActivityEvent['type'],
    title: string,
    detail: string
  ) {
    const ownerId = user?.id ?? 'guest'
    const event: SecurityActivityEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ownerId,
      type,
      title,
      detail,
      occurredAt: new Date().toISOString(),
    }
    const nextEvents = [event, ...activityEvents].slice(0, 30)
    setActivityEvents(nextEvents)
    const saved = saveSecurityActivityEvents(ownerId, nextEvents)
    setActivityStorageError(!saved)
    if (!saved) {
      console.error('Could not save local security activity history.')
    }
  }

  function clearActivity() {
    const ownerId = user?.id ?? 'guest'
    setActivityEvents([])
    const cleared = clearSecurityActivityEvents(ownerId)
    setActivityStorageError(!cleared)
    if (!cleared) {
      console.error('Could not clear local security activity history.')
    }
  }

  function analyzeMessage(textToAnalyze: string = message) {
    const text = textToAnalyze.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

    const spanish = /\b(el|la|los|las|tu|tus|cuenta|contrasena|correo|mensaje|haga|hoy|urgente|verifica|verificar|haz|pago|banco|clave|premio|factura)\b/.test(text)

    const warnings: string[] = []

const urlPattern = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi
const urls = textToAnalyze.match(urlPattern) ?? []

const suspiciousUrl = urls.some((url) => {
  const normalizedUrl = url.toLowerCase()

  return (
    /bit\.ly|tinyurl\.com|t\.co|is\.gd|cutt\.ly|rb\.gy/.test(normalizedUrl) ||
    /https?:\/\/\d{1,3}(?:\.\d{1,3}){3}/.test(normalizedUrl) ||
    /@/.test(normalizedUrl)
  )
})

const actions: string[] = []

if (suspiciousUrl) {
  warnings.push(spanish
    ? 'Contiene un enlace que merece una revisión adicional'
    : 'Contains a link that deserves additional scrutiny')

  actions.push(spanish
    ? 'No abras el enlace todavía. Visita el sitio oficial escribiendo su dirección directamente.'
    : 'Do not open the link yet. Visit the official website by typing its address directly.')
}
    

    if (/\burgent(e|ly)?\b|\bimmediately\b|\btoday\b|\bact now\b|\bfinal warning\b|\bexpires? today\b|\bde inmediato\b|\binmediatamente\b|\bactua ahora\b|\bhoy\b|\bultima advertencia\b|\bultim(o|a) aviso\b|\bse bloqueara\b|\bsera desactivad[ao]\b/.test(text)) {
      warnings.push(spanish
        ? 'Usa urgencia o presión para que actúes rápidamente'
        : 'Uses urgency or pressure to make you act quickly')
      actions.push(spanish
        ? 'No te apresures. Verifica la solicitud por un canal oficial independiente.'
        : 'Do not rush. Verify the request through an independent official channel.')
    }

    if (/\bpassword\b|\bpasscode\b|\bverify your account\b|\bsign in\b|\blog ?in\b|\bsecurity code\b|\bone.time code\b|\bcontrasena\b|\bclave\b|\bverifica tu cuenta\b|\bverificar tu cuenta\b|\binicia sesion\b|\bcodigo de seguridad\b|\bcodigo de verificacion\b|\bdatos de acceso\b/.test(text)) {
      warnings.push(spanish
        ? 'Menciona contraseñas, acceso a cuentas o información sensible'
        : 'Mentions passwords, account access, or sensitive information')
      actions.push(spanish
        ? 'No compartas contraseñas ni códigos. Abre la aplicación o el sitio oficial directamente.'
        : 'Never share passwords or verification codes. Open the official app or website directly.')
    }

    if (/\bclick here\b|\buse this link\b|\bopen the attachment\b|\bdownload now\b|\bclick the link\b|\bhaz clic\b|\bpulsa el enlace\b|\babre el archivo adjunto\b|\bdescarga ahora\b|\bda clic\b|\bpresiona el enlace\b/.test(text)) {
      warnings.push(spanish
        ? 'Te pide abrir un enlace o archivo adjunto'
        : 'Encourages clicking a link or opening an attachment')
      actions.push(spanish
        ? 'Evita abrir enlaces o archivos inesperados. Comprueba el destino y el remitente por separado.'
        : 'Avoid unexpected links or attachments. Verify the sender and destination separately.')
    }

    if (/\bwire transfer\b|\bbank details\b|\bpayment today\b|\bgift card\b|\bcrypto(?:currency)?\b|\btransferencia bancaria\b|\bdatos bancarios\b|\bpago hoy\b|\btarjeta de regalo\b|\btarjeta regalo\b|\btransfiere dinero\b|\btransfiere fondos\b|\bpaga ahora\b/.test(text)) {
      warnings.push(spanish
        ? 'Incluye una solicitud financiera o de pago'
        : 'Contains a financial or payment request')
      actions.push(spanish
        ? 'Confirma cualquier pago con el destinatario mediante un número o contacto que ya conozcas.'
        : 'Confirm payment requests with the recipient using a contact method you already trust.')
    }

    if (/\bprize\b|\byou have won\b|\bclaim your reward\b|\bfree money\b|\bpremio\b|\bhas ganado\b|\bganaste\b|\breclama tu recompensa\b|\bdinero gratis\b/.test(text)) {
      warnings.push(spanish
        ? 'Promete un premio o recompensa que podría ser engañoso'
        : 'Promises a prize or reward that could be deceptive')
      actions.push(spanish
        ? 'Desconfía de premios inesperados que exigen pagos, datos personales o hacer clic en enlaces.'
        : 'Be cautious of unexpected prizes requiring payment, personal details, or clicking links.')
    }

    if (/\bimpersonat(?:e|ing)\b|\bpretend to be\b|\bceo\b|\bmanager\b|\bboss\b|\bme hago pasar\b|\bsuplantacion\b|\bdirector\b|\bjefe\b|\bgerente\b/.test(text)) {
      warnings.push(spanish
        ? 'Podría implicar suplantación de identidad o autoridad'
        : 'May involve impersonation of a person or authority')
      actions.push(spanish
        ? 'Confirma la identidad del remitente por otro canal antes de cumplir instrucciones.'
        : 'Verify the sender’s identity through another channel before following instructions.')
    }

    const uniqueWarnings = [...new Set(warnings)]
    const uniqueActions = [...new Set(actions)]

    const riskLevel: 'low' | 'review' | 'high' =
      uniqueWarnings.length >= 3 ? 'high' : uniqueWarnings.length > 0 ? 'review' : 'low'

    const summary = uniqueWarnings.length
      ? (spanish
          ? `Precaución: se detectaron ${uniqueWarnings.length} señal(es) de alerta. Esto no confirma que el mensaje sea fraudulento; verifica por separado.`
          : `Caution: ${uniqueWarnings.length} warning sign(s) detected. This does not prove the message is fraudulent; verify independently.`)
      : (spanish
          ? 'No se detectaron patrones de alerta comunes. Esto no garantiza que el mensaje sea seguro.'
          : 'No common warning patterns were detected. This does not guarantee the message is safe.')

    setAnalysisFindings(uniqueWarnings)
    setAnalysisRiskLevel(riskLevel)
    setAnalysisSummary(summary)
    setReportMessage('')

    setResult(
      summary +
      (uniqueWarnings.length
        ? '\n\n' +
          (spanish ? 'Señales detectadas:' : 'Warning signs:') +
          '\n' + uniqueWarnings.map((warning) => `• ${warning}`).join('\n') +
          '\n\n' + (spanish ? 'Acciones recomendadas:' : 'Recommended actions:') +
          '\n' + uniqueActions.map((action) => `• ${action}`).join('\n')
        : '')
    )
  }

    


  async function handleThreatAnalysis(
    textToAnalyze: string = message,
    imageFile?: File
  ) {
    const trimmedMessage = textToAnalyze.trim()

    if (!trimmedMessage && !imageFile) {
      setResult(
        assistantLanguage === 'es'
          ? 'Escribe un mensaje o selecciona una captura para analizar.'
          : 'Enter a message or select a screenshot to analyze.'
      )
      setAnalysisFindings([])
      setAnalysisRiskLevel(null)
      setAnalysisSummary('')
      return
    }

    if (imageFile && !screenshotConsent) {
      setScreenshotError(
        assistantLanguage === 'es'
          ? 'Confirma que entiendes que la captura se enviará para el análisis de IA.'
          : 'Confirm that you understand the screenshot will be sent for AI analysis.'
      )
      return
    }

    setAnalysisLoading(true)
    setResult('')
    setAnalysisFindings([])
    setAnalysisRiskLevel(null)
    setAnalysisSummary('')
    setReportMessage('')
    setAnalysisInputType(imageFile ? 'image' : 'text')

    try {
      if (!supabase || !isSupabaseConfigured) {
        throw new Error('Supabase is not configured.')
      }

      const preparedImage = imageFile
        ? await prepareScreenshotForAnalysis(imageFile)
        : undefined
      const { data, error } = await supabase.functions.invoke(
        'analyze-threat',
        {
          body: {
            message: trimmedMessage,
            ...(preparedImage
              ? { image: preparedImage, imageConsent: screenshotConsent }
              : {}),
          },
        }
      )

      if (error) throw error

      const aiAnalysis =
        typeof data?.analysis === 'string' ? data.analysis.trim() : ''

      if (!aiAnalysis) {
        throw new Error('The AI function returned no analysis.')
      }

      const riskMatch = aiAnalysis.match(
        /\bRisk\s*:\s*(High|Medium|Moderate|Review|Low)\b/i
      )

      const riskWord = riskMatch?.[1]?.toLowerCase() ?? 'review'
      const riskLevel: 'low' | 'review' | 'high' =
        riskWord === 'high'
          ? 'high'
          : riskWord === 'low'
            ? 'low'
            : 'review'

      const findings = aiAnalysis
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) =>
          /^(Reasons|Findings|Recommended actions|Limitations)\s*:/i.test(line) ||
          /^[-•]\s+/.test(line)
        )
        .map((line: string) => line.replace(/^[-•]\s*/, ''))

      setAnalysisFindings(
        findings.length > 0 ? findings : [aiAnalysis]
      )
      setAnalysisRiskLevel(riskLevel)
      setAnalysisSummary(
        aiAnalysis.split('\n').find((line: string) => line.trim()) ??
          'AI threat analysis completed.'
      )
      setResult(aiAnalysis)
      recordActivity(
        'analysis',
        imageFile
          ? assistantLanguage === 'es'
            ? 'Análisis de captura completado'
            : 'Screenshot analysis completed'
          : assistantLanguage === 'es'
            ? 'Análisis de mensaje completado'
            : 'Message analysis completed',
        assistantLanguage === 'es'
          ? `Evaluación de IA: ${riskLevel === 'high' ? 'riesgo alto' : riskLevel === 'review' ? 'requiere revisión' : 'riesgo bajo'}. No se guardó el contenido enviado en este historial.`
          : `AI assessment: ${riskLevel === 'high' ? 'high risk' : riskLevel === 'review' ? 'needs review' : 'low risk'}. Submitted content was not saved in this history.`
      )
      if (data?.alertStatus === 'created') {
        setReportMessage('High-severity alert saved to your account.')
      } else if (data?.alertError) {
        setReportMessage(data.alertError)
      } else if (data?.alertStatus === 'skipped' && riskLevel === 'high') {
        setReportMessage('Sign in to receive high-severity security alerts.')
      }
      if (imageFile) {
        setScreenshotFile(null)
        updateScreenshotPreview(null)
        setScreenshotConsent(false)
        setScreenshotError('')
        if (screenshotInputRef.current) {
          screenshotInputRef.current.value = ''
        }
      }
    } catch (error) {
      if (imageFile) {
        console.error('AI screenshot analysis failed.', error)
        setResult(
          assistantLanguage === 'es'
            ? 'No se pudo completar el análisis de la captura. No se usó un análisis local como sustituto; inténtalo de nuevo.'
            : 'Screenshot analysis could not be completed. A local analysis was not used as a substitute; please try again.'
        )
        setAnalysisInputType('image')
        setReportMessage('')
        return
      }

      console.error('AI threat analysis failed; using local analysis.', error)
      analyzeMessage(trimmedMessage)
      recordActivity(
        'analysis',
        assistantLanguage === 'es'
          ? 'Análisis local de patrones completado'
          : 'Local pattern analysis completed',
        assistantLanguage === 'es'
          ? 'El análisis de IA no estuvo disponible; solo se revisaron patrones de texto comunes. No se guardó el texto del mensaje en este historial.'
          : 'AI analysis was unavailable; only common text patterns were checked. Message text was not saved in this history.'
      )
      setReportMessage(
        'AI analysis was unavailable, so local pattern analysis was used instead.'
      )
    } finally {
      setAnalysisLoading(false)
    }
  }


  async function saveReport() {
    if (!user || !supabase || !analysisRiskLevel) {
      setReportMessage('Sign in and analyze a message before saving a report.')
      return
    }

    setSavingReport(true)
    setReportMessage('')

    try {
      const { data, error } = await supabase
        .from('security_reports')
        .insert({
          user_id: user.id,
          message_text: analysisInputType === 'image'
            ? assistantLanguage === 'es'
              ? '[Captura analizada; imagen no guardada]'
              : '[Screenshot analyzed; image not stored]'
            : message,
          risk_level: analysisRiskLevel,
          findings: analysisFindings,
          summary: analysisSummary,
        })
        .select('id, message_text, risk_level, findings, summary, created_at')
        .single()

      if (error) {
        setReportMessage('Could not save report: ' + error.message)
        return
      }

      setReports((previous) =>
        [data as SecurityReport, ...previous.filter((report) => report.id !== data.id)]
          .slice(0, 20)
      )
      setReportMessage('Security report saved successfully.')
    } catch {
      setReportMessage('An unexpected error occurred while saving the report.')
    } finally {
      setSavingReport(false)
    }
  }

  async function deleteReport(report: SecurityReport) {
    if (!user || !supabase) {
      setReportMessage('Sign in to manage saved reports.')
      return
    }

    setReportMessage('')

    const { error } = await supabase
      .from('security_reports')
      .delete()
      .eq('id', report.id)
      .eq('user_id', user.id)

    if (error) {
      setReportMessage('Could not delete report: ' + error.message)
      return
    }

    setReports((previous) =>
      previous.filter((item) => item.id !== report.id)
    )
    setReportMessage('Security report deleted.')
  }

  function toggleTask(index: number) {
    const wasCompleted = completedTasks.includes(index)
    setCompletedTasks((previous) =>
      wasCompleted
        ? previous.filter((task) => task !== index)
        : [...previous, index]
    )
    recordActivity(
      'checklist',
      assistantLanguage === 'es'
        ? wasCompleted
          ? 'Tarea de seguridad desmarcada'
          : 'Tarea de seguridad marcada'
        : wasCompleted
          ? 'Security task unchecked'
          : 'Security task checked',
      `${securityTasks[index].title} — ${
        assistantLanguage === 'es'
          ? wasCompleted
            ? 'marcada como no completada por el usuario'
            : 'marcada como completada por el usuario'
          : wasCompleted
            ? 'marked incomplete by the user'
            : 'marked complete by the user'
      }`
    )
  }

  useEffect(() => {
    try {
      localStorage.setItem(
        'cybershield-completed-tasks',
        JSON.stringify(completedTasks)
      )
    } catch {
      // Saving may be unavailable in some browser settings.
    }
  }, [completedTasks])

  // Load the signed-in user's checklist before allowing cloud saves.
  useEffect(() => {
    let cancelled = false

    async function loadChecklist() {
      if (!currentUserId || !supabase) {
        setChecklistReadyForUserId(null)
        return
      }

      setChecklistReadyForUserId(null)

      const { data, error } = await supabase
        .from('security_checklist_progress')
        .select('completed_tasks')
        .eq('user_id', currentUserId)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        setAuthMessage('Could not load your cloud checklist: ' + error.message)
        return
      }

      if (data) {
        const validTasks = Array.isArray(data.completed_tasks)
          ? data.completed_tasks.filter(
              (task: number) =>
                Number.isInteger(task) &&
                task >= 0 &&
                task < securityTasks.length
            )
          : []

        setCompletedTasks([...new Set(validTasks)])
      } else {
        // First sign-in for this account: seed its cloud row with this
        // browser's existing checklist, preserving the user's current work.
        let initialTasks: number[] = []
        try {
          const saved = localStorage.getItem('cybershield-completed-tasks')
          const parsed: unknown = saved ? JSON.parse(saved) : []
          if (Array.isArray(parsed)) {
            initialTasks = [...new Set(
              parsed.filter(
                (task): task is number =>
                  Number.isInteger(task) &&
                  task >= 0 &&
                  task < securityTasks.length
              )
            )]
          }
        } catch {
          initialTasks = []
        }

        const { error: insertError } = await supabase
          .from('security_checklist_progress')
          .upsert({
            user_id: currentUserId,
            completed_tasks: initialTasks,
            updated_at: new Date().toISOString(),
          })

        if (cancelled) return

        if (insertError) {
          setAuthMessage(
            'Could not initialize your cloud checklist: ' + insertError.message
          )
          return
        }

        setCompletedTasks(initialTasks)
      }

      setChecklistReadyForUserId(currentUserId)
    }

    void loadChecklist()

    return () => {
      cancelled = true
    }
  }, [currentUserId])

  // Save only after this signed-in user's cloud checklist has loaded.
  useEffect(() => {
    if (!currentUserId || !supabase || checklistReadyForUserId !== currentUserId) return
    const client = supabase

    let cancelled = false

    async function saveChecklist() {
      const { error } = await client
        .from('security_checklist_progress')
        .upsert({
          user_id: currentUserId,
          completed_tasks: completedTasks,
          updated_at: new Date().toISOString(),
        })

      if (error && !cancelled) {
        setAuthMessage('Could not save your cloud checklist: ' + error.message)
      }
    }

    void saveChecklist()

    return () => {
      cancelled = true
    }
  }, [currentUserId, checklistReadyForUserId, completedTasks])
  // Load the signed-in user's saved security reports.
  useEffect(() => {
    let cancelled = false

    async function loadReports() {
      if (!currentUserId || !supabase) {
        setReports([])
        setReportsLoading(false)
        return
      }

      setReportsLoading(true)

      const { data, error } = await supabase
        .from('security_reports')
        .select('id, message_text, risk_level, findings, summary, created_at')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (cancelled) return

      if (error) {
        setReportMessage('Could not load saved reports: ' + error.message)
        setReportsLoading(false)
        return
      }

      setReports((data ?? []) as SecurityReport[])
      setReportsLoading(false)
    }

    void loadReports()

    return () => {
      cancelled = true
    }
  }, [currentUserId])

  const completedCount = completedTasks.length
  const progress = Math.round((completedCount / securityTasks.length) * 100)
const securityScore = Math.round((completedCount / securityTasks.length) * 100)
const securityGrade =
  securityScore >= 90 ? 'A' :
  securityScore >= 80 ? 'B' :
  securityScore >= 70 ? 'C' :
  securityScore >= 60 ? 'D' : 'F'
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src="/ShieldPocket.png" alt="" />
          <div>
            <strong>ShieldPocket</strong>
            <small>Secure Defense</small>
          </div>
        </div>

        <p className="nav-label">WORKSPACE</p>
        <div className="workspace-navigation">
          <label className="nav-label" htmlFor="workspace-section">
            WORKSPACE
          </label>
          <div className="workspace-select-wrap">
            <select
              id="workspace-section"
              className="workspace-select"
              aria-label="Go to workspace section"
              value={activeSection}
              onChange={(event) => {
                if (isWorkspaceSectionId(event.target.value)) {
                  navigateToSection(event.target.value)
                }
              }}
            >
              {workspaceSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </select>
            <span aria-hidden="true">⌄</span>
          </div>
        </div>

        <div className="sidebar-note">
          <strong>Security starts here.</strong>
          <p>Simple, practical steps to help protect your business.</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span>
            Workspace / {workspaceSections.find((section) => section.id === activeSection)?.label}
          </span>
        </header>

        <section className="page-heading">
          <p className="eyebrow">AI-ASSISTED SECURITY WORKSPACE</p>
          <h1>Stay ahead of suspicious activity.</h1>
          <p className="intro">
            Investigate suspicious messages, strengthen everyday defenses,
            and find practical next steps for your small business.
          </p>
        </section>

        <VoiceAssistant
          language={assistantLanguage}
          onLanguageChange={setAssistantLanguage}
          checklistTasks={securityTasks.map((task, index) => ({
            title: task.title,
            titleEs: [
              'Activar la autenticación multifactor',
              'Activar las actualizaciones automáticas',
              'Proteger los respaldos',
              'Usar contraseñas únicas',
              'Limitar los permisos de las cuentas',
              'Preparar un plan de incidentes',
            ][index],
            aliases: [
              ['mfa', 'multifactor authentication', 'autenticacion multifactor', 'autenticacion de dos factores'],
              ['automatic updates', 'actualizaciones automaticas'],
              ['backups', 'respaldos'],
              ['unique passwords', 'contrasenas unicas', 'password manager', 'gestor de contrasenas'],
              ['permissions', 'permisos', 'administrator access', 'acceso de administrador'],
              ['incident plan', 'plan de incidentes', 'incident response plan'],
            ][index],
            completed: completedTasks.includes(index),
          }))}
          onToggleChecklistTask={(index, completed) => {
            if (completedTasks.includes(index) !== completed) toggleTask(index)
          }}
          onGenerateSecurityPlan={() => {
            if (securityPlanLoading) return 'busy'
            if (securityPlanKey === currentSecurityPlanKey) return 'current'
            void generateSecurityPlan()
            return 'started'
          }}
          onNavigate={(section) => {
            if (isWorkspaceSectionId(section)) {
              navigateToSection(section)
            }
          }}
          onSetMessage={setMessage}
          onAnalyzeMessage={(text) => handleThreatAnalysis(text)}
        />

        <section className="content-card auth-card">
          <div className="card-heading">
            <div>
              <h2>{user ? 'Your account' : authMode === 'signin' ? 'Sign in to ShieldPocket' : 'Create your ShieldPocket account'}</h2>
              <p>
                {user
                  ? 'You are signed in.'
                  : 'Create an account or sign in to access your workspace.'}
              </p>
            </div>
            <span className="demo-tag">
              {user ? 'SIGNED IN' : 'ACCOUNT ACCESS'}
            </span>
          </div>

          {user ? (
            <div>
              <p>Signed in as <strong>{user.email}</strong></p>
             
              
              {authMessage && (
                <p role="status" aria-live="polite">{authMessage}</p>
              )}
              {hasPasskey === false && (
                <div>
                  <p>No passkey is registered for this account yet.</p>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleRegisterPasskey}
                    disabled={authLoading}
                  >
                    {authLoading ? 'Please wait...' : 'Create a passkey'}
                  </button>
                </div>
              )}
              {hasPasskey === true && (
                <p role="status">A passkey is registered for this account.</p>
              )}
              {passkeyMessage && (
                <p role="status" aria-live="polite">{passkeyMessage}</p>
              )}
              <button
                type="button"
                className="primary-button"
                onClick={handleSignOut}
                disabled={authLoading}
              >
                {authLoading ? 'Signing out...' : 'Sign out'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={handleDeleteAccount}
                disabled={authLoading}
                style={{ marginTop: '12px' }}
              >
                {authLoading ? 'Please wait...' : 'Delete Account'}
              </button>
            </div>
          ) : !isSupabaseConfigured ? (
            <p>
              Account access is not configured yet. Check your Supabase
              environment settings before signing in.
            </p>
          ) : (
            <>
            <form onSubmit={handleAuthSubmit}>
              <div style={{ display: 'grid', gap: '12px' }}>
                <label>
                  Email address
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    style={{ display: 'block', width: '100%', marginTop: '6px', padding: '10px' }}
                  />
                </label>

                <label>
                  Password
                  <input
                    type="password"
                    autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={6}
                    required
                    style={{ display: 'block', width: '100%', marginTop: '6px', padding: '10px' }}
                  />
                </label>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={authLoading}
                >
                  {authLoading
                    ? 'Please wait...'
                    : authMode === 'signup'
                      ? 'Create account'
                      : 'Sign in'}
                </button>

                <button
                  type="button"
                  className="primary-button"
                  disabled={authLoading}
                  onClick={() => {
                    setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
                    setAuthMessage('')
                  }}
                >
                  {authMode === 'signin'
                    ? 'Need an account? Create one'
                    : 'Already have an account? Sign in'}
                </button>

                

                {authMessage && (
                  <p role="status" aria-live="polite">{authMessage}</p>
                )}
              </div>
            </form>
            <button
              type="button"
              className="secondary-button"
              onClick={handlePasskeySignIn}
              disabled={authLoading}
            >
              {authLoading ? 'Please wait...' : 'Sign in with a passkey'}
            </button>
            </>
          )}
        </section>

        <section className="metrics">
          <article className="metric-card">
            <span>Threat analyzer</span>
            <strong>Ready</strong>
            <small>Inspect suspicious messages</small>
          </article>

          <article className="metric-card">
            <span>Security basics</span>
            <strong>{completedCount} / {securityTasks.length}</strong>
            <small>Checklist items completed</small>
          </article>

          <article className="metric-card">
            <span>Checklist progress</span>
            <strong>{progress}%</strong>
            <small>Security tasks checked off</small>
          </article>
        </section>

        <SecurityActivityTimeline
          language={assistantLanguage}
          events={activityEvents}
          storageError={activityStorageError}
          onClear={clearActivity}
        />

        <ExecutiveBoardBriefing
          language={assistantLanguage}
          activityEvents={activityEvents}
          savedReports={reports}
          incidentProgress={incidentProgress}
          checklistTasks={securityTasks.map((task, index) => ({
            title: task.title,
            completed: completedTasks.includes(index),
          }))}
        />

        <section id="threat-analyzer" className="content-card">
          <div className="card-heading">
            <div>
              <h2>Suspicious message analyzer</h2>
              <p>Paste a message to check for common warning signs.</p>
            </div>
            <span className="demo-tag">AI-ASSISTED</span>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <p style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>
              Try a sample message
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                className="primary-button"
                disabled={analysisLoading}
                onClick={() => {
                  setMessage('Your business email will be disabled today. Verify your account immediately using this link or access will be permanently removed.')
                  setResult('')
                  setAnalysisFindings([])
                  setAnalysisRiskLevel(null)
                  setAnalysisSummary('')
                  setReportMessage('')
                }}
              >
                Urgent login
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={analysisLoading}
                onClick={() => {
                  setMessage('Please process this invoice payment today. We changed our bank details, so use the new account in the attached instructions.')
                  setResult('')
                  setAnalysisFindings([])
                  setAnalysisRiskLevel(null)
                  setAnalysisSummary('')
                  setReportMessage('')
                }}
              >
                Invoice request
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={analysisLoading}
                onClick={() => {
                  setMessage('Hello team, the monthly maintenance window is scheduled for Saturday from 8:00 to 9:00 PM. Please save your work beforehand.')
                  setResult('')
                  setAnalysisFindings([])
                  setAnalysisRiskLevel(null)
                  setAnalysisSummary('')
                  setReportMessage('')
                }}
              >
                Routine update
              </button>
            </div>
          </div>

          <label htmlFor="message">
            {screenshotFile
              ? assistantLanguage === 'es'
                ? 'Contexto opcional del mensaje'
                : 'Optional message context'
              : assistantLanguage === 'es'
                ? 'Correo o mensaje de texto'
                : 'Email or text message'}
          </label>
          <textarea
            id="message"
            value={message}
            disabled={analysisLoading}
            onChange={(event) => {
              setMessage(event.target.value)
              setResult('')
              setAnalysisFindings([])
              setAnalysisRiskLevel(null)
              setAnalysisSummary('')
              setReportMessage('')
            }}
            placeholder={
              assistantLanguage === 'es'
                ? 'Pega aquí un mensaje sospechoso...'
                : 'Paste a suspicious message here...'
            }
          />

          <div className="screenshot-analyzer">
            <h3>
              {assistantLanguage === 'es'
                ? 'Analizar una captura de pantalla'
                : 'Analyze a screenshot'}
            </h3>
            <p>
              {assistantLanguage === 'es'
                ? 'Opcional: selecciona una captura de un correo, mensaje o página sospechosa. No se carga hasta que marques tu consentimiento y ejecutes el análisis.'
                : 'Optional: select a screenshot of a suspicious email, message, or webpage. It is not uploaded until you consent and run the analysis.'}
            </p>

            <label htmlFor="suspicious-screenshot">
              {assistantLanguage === 'es' ? 'Captura (JPEG, PNG o WebP)' : 'Screenshot (JPEG, PNG, or WebP)'}
            </label>
            <input
              ref={screenshotInputRef}
              id="suspicious-screenshot"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={analysisLoading}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                setScreenshotError('')
                setScreenshotConsent(false)
                setResult('')
                setAnalysisFindings([])
                setAnalysisRiskLevel(null)
                setAnalysisSummary('')
                setReportMessage('')

                if (!file) {
                  setScreenshotFile(null)
                  updateScreenshotPreview(null)
                  return
                }

                if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                  setScreenshotFile(null)
                  updateScreenshotPreview(null)
                  event.currentTarget.value = ''
                  setScreenshotError(
                    assistantLanguage === 'es'
                      ? 'Selecciona una imagen JPEG, PNG o WebP.'
                      : 'Choose a JPEG, PNG, or WebP image.'
                  )
                  return
                }

                if (file.size > MAX_SCREENSHOT_FILE_SIZE) {
                  setScreenshotFile(null)
                  updateScreenshotPreview(null)
                  event.currentTarget.value = ''
                  setScreenshotError(
                    assistantLanguage === 'es'
                      ? 'La imagen debe tener un tamaño máximo de 12 MB.'
                      : 'The image must be no larger than 12 MB.'
                  )
                  return
                }

                if (message === DEFAULT_ANALYZER_MESSAGE) {
                  setMessage('')
                }
                setScreenshotFile(file)
                updateScreenshotPreview(file)
              }}
            />

            {screenshotFile && (
              <div className="screenshot-selected">
                <span>{screenshotFile.name}</span>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={analysisLoading}
                  onClick={() => {
                    setScreenshotFile(null)
                    updateScreenshotPreview(null)
                    setScreenshotConsent(false)
                    setScreenshotError('')
                    if (screenshotInputRef.current) {
                      screenshotInputRef.current.value = ''
                    }
                  }}
                >
                  {assistantLanguage === 'es' ? 'Quitar captura' : 'Remove screenshot'}
                </button>
              </div>
            )}

            {screenshotPreviewUrl && (
              <img
                className="screenshot-preview"
                src={screenshotPreviewUrl}
                alt={
                  assistantLanguage === 'es'
                    ? 'Vista previa local de la captura seleccionada'
                    : 'Local preview of the selected screenshot'
                }
              />
            )}

            <label className="screenshot-consent">
              <input
                type="checkbox"
                checked={screenshotConsent}
                disabled={!screenshotFile || analysisLoading}
                onChange={(event) => {
                  setScreenshotConsent(event.target.checked)
                  setScreenshotError('')
                }}
              />
              <span>
                {assistantLanguage === 'es'
                  ? 'Entiendo que al ejecutar el análisis, la captura y el texto opcional se enviarán a Supabase y a Meta; esto usa créditos de Meta Model API.'
                  : 'I understand that running the analysis sends the screenshot and optional text to Supabase and Meta, and uses Meta Model API credits.'}
              </span>
            </label>

            {screenshotError && (
              <p className="screenshot-error" role="alert">{screenshotError}</p>
            )}

            <p className="screenshot-privacy">
              {assistantLanguage === 'es'
                ? 'El navegador reduce la imagen a un máximo de 1600 px y la convierte a JPEG antes de enviarla. La app no guarda la imagen. El procesamiento y la retención del proveedor dependen de sus políticas. Si guardas un informe, se almacenan la evaluación y los hallazgos; revísalos primero. Recorta o censura datos personales, códigos de verificación, datos financieros y notificaciones.'
                : 'Your browser resizes the image to at most 1600 px and converts it to JPEG before sending. The app does not save the image. Provider processing and retention are subject to its policies. If you save a report, its assessment and findings are stored; review them first. Crop or redact personal data, verification codes, financial details, and notifications.'}
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => handleThreatAnalysis(message, screenshotFile ?? undefined)}
            disabled={analysisLoading}
          >
            {analysisLoading
              ? assistantLanguage === 'es'
                ? 'Analizando con IA...'
                : 'Analyzing with AI...'
              : screenshotFile
                ? assistantLanguage === 'es'
                  ? 'Analizar mensaje y captura →'
                  : 'Analyze message and screenshot →'
                : assistantLanguage === 'es'
                  ? 'Analizar mensaje →'
                  : 'Analyze message →'}
          </button>

          {result && (
            <div className="analysis-result" role="status">
              <h3>Analysis result</h3>
              <p>{result}</p>

              {analysisRiskLevel && (
                <PhishingResponseGuide
                  key={`${analysisRiskLevel}-${analysisSummary}`}
                  language={assistantLanguage}
                  riskLevel={analysisRiskLevel}
                  findings={analysisFindings}
                />
              )}

              {analysisRiskLevel && (
                <ComplianceFrameworkMapper
                  language={assistantLanguage}
                  assessment={result}
                />
              )}

              {user ? (
                <button
                  type="button"
                  className="primary-button"
                  onClick={saveReport}
                  disabled={savingReport}
                >
                  {savingReport ? 'Saving report...' : 'Save report'}
                </button>
              ) : (
                <p>Sign in to save this report to your account.</p>
              )}
            </div>
          )}

          {reportMessage && (
            <p role="status" aria-live="polite">{reportMessage}</p>
          )}

          <p className="disclaimer">
            AI-assisted message analysis with local pattern-matching fallback.
            This is not a live security scan, and results cannot guarantee
            that a message is safe or malicious. Verify suspicious messages
            independently before acting.
          </p>
        </section>

        <CveTriageAssistant language={assistantLanguage} />

        <section className="content-card saved-reports-card">
          <div className="card-heading">
            <div>
              <h2>Saved reports</h2>
              <p>Your most recent saved security analyses.</p>
            </div>
            <span className="demo-tag">REPORT HISTORY</span>
          </div>

          {reportsLoading ? (
            <p>Loading saved reports...</p>
          ) : !user ? (
            <p>Sign in to view and manage your saved reports.</p>
          ) : reports.length === 0 ? (
            <p>No saved reports yet. Analyze a message and select Save report to get started.</p>
          ) : (
            <div className="saved-reports-list">
              {reports.map((report) => (
                <article className="saved-report-item" key={report.id}>
                  <div className="saved-report-heading">
                    <div>
                      <strong>
                        {report.risk_level === 'high'
                          ? 'High risk'
                          : report.risk_level === 'review'
                            ? 'Needs review'
                            : 'Low risk'}
                      </strong>
                      <p>
                        {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => deleteReport(report)}
                    >
                      Delete
                    </button>
                  </div>

                  <p>{report.summary}</p>

                  <details>
                    <summary>View message and findings</summary>
                    <p>{report.message_text}</p>
                    {report.findings.length > 0 ? (
                      <ul>
                        {report.findings.map((finding, index) => (
                          <li key={`${report.id}-finding-${index}`}>
                            {finding}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No specific findings were recorded.</p>
                    )}
                  </details>
                </article>
              ))}
            </div>
          )}

          {reportMessage && (
            <p role="status" aria-live="polite">{reportMessage}</p>
          )}
        </section>

        <section id="security-checkup" className="content-card security-card">
          <div className="card-heading">
            <div>
              <h2>Small-business security checkup</h2>
              <p>Check off the security measures your business has in place.</p>
            </div>
            <span className="demo-tag">SECURITY BASICS</span>
          </div>

          <div className="checklist-progress">
            <div className="progress-label">
              <span>Your progress</span>
              <strong>{completedCount} of {securityTasks.length} complete</strong>
            </div>

            <div
              className="progress-track"
              role="progressbar"
              aria-label="Security checklist progress"
              aria-valuemin={0}
              aria-valuemax={securityTasks.length}
              aria-valuenow={completedCount}
            >
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <SecurityScoreWidget
            score={securityScore}
            grade={securityGrade}
            recommendation={`${recommendationTitle}: ${recommendationDescription}`}
            language="en"
          />

          <div className="security-task-list">
            {securityTasks.map((task, index) => {
              const isCompleted = completedTasks.includes(index)

              return (
                <label
                  className={`security-task ${isCompleted ? 'completed' : ''}`}
                  key={task.title}
                >
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => toggleTask(index)}
                  />

                  <span className="task-copy">
                    <strong>{task.title}</strong>
                    <span>{task.description}</span>
                  </span>
                </label>
              )
            })}
          </div>

          <p className="checklist-note">
            {completedCount === securityTasks.length
              ? 'All six items are checked. Review and test these controls regularly.'
              : 'Start with one task at a time. Only check items that your business has actually completed.'}
          </p>

          <div className="security-plan">
            <div>
              <h3>{assistantLanguage === 'es' ? 'Plan de seguridad con IA' : 'AI security action plan'}</h3>
              <p>
                {assistantLanguage === 'es'
                  ? 'Obtén prioridades prácticas según las tareas completadas o pendientes.'
                  : 'Get practical priorities based on the tasks you have and have not completed.'}
              </p>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => void generateSecurityPlan()}
              disabled={
                securityPlanLoading ||
                securityPlanKey === currentSecurityPlanKey
              }
            >
              {securityPlanLoading
                ? assistantLanguage === 'es'
                  ? 'Generando plan…'
                  : 'Generating plan…'
                : securityPlanKey === currentSecurityPlanKey
                  ? assistantLanguage === 'es'
                    ? 'Plan actualizado'
                    : 'Plan is up to date'
                  : assistantLanguage === 'es'
                    ? 'Generar plan con IA'
                    : 'Generate AI plan'}
            </button>
            <p className="security-plan-privacy">
              {assistantLanguage === 'es'
                ? 'Se envían las tareas integradas y su estado; no se envían mensajes sospechosos ni contraseñas. La IA ofrece orientación general, no verifica tus controles.'
                : 'The built-in checklist tasks and their status are sent; suspicious messages and passwords are not included. AI provides general guidance and does not verify your controls.'}
            </p>
            {securityPlanMessage && (
              <p className="security-plan-message" role="status" aria-live="polite">
                {securityPlanMessage}
              </p>
            )}
            {securityPlan && securityPlanKey === currentSecurityPlanKey && (
              <div className="security-plan-result" aria-live="polite">
                <p>{securityPlan}</p>
              </div>
            )}
            {securityPlan && securityPlanKey !== currentSecurityPlanKey && (
              <p className="security-plan-message">
                {assistantLanguage === 'es'
                  ? 'La lista o el idioma cambió desde que se creó el plan. Genera uno nuevo para actualizarlo.'
                  : 'The checklist or language changed since this plan was generated. Generate a new one to update it.'}
              </p>
            )}
          </div>
        </section>

        <MobileDevicePosture />

        <section id="firewall-checkup" className="content-card">
          <div className="card-heading">
            <div>
              <h2>Firewall Security Checkup</h2>
              <p>Use this guided checklist to review your device's firewall settings.</p>
            </div>
            <span className="demo-tag">GUIDED CHECK</span>
          </div>

          <label htmlFor="firewall-platform">Choose your operating system</label>
          <select
            id="firewall-platform"
            value={firewallPlatform}
            onChange={(event) => setFirewallPlatform(event.target.value as 'mac' | 'windows')}
            style={{ display: 'block', width: '100%', margin: '8px 0 16px', padding: '10px' }}
          >
            <option value="mac">macOS</option>
            <option value="windows">Windows</option>
          </select>

          <p>
            {firewallPlatform === 'mac'
              ? 'On your Mac, open System Settings → Network → Firewall (the exact location may vary by macOS version).'
              : 'On Windows, open Windows Security → Firewall & network protection and review each network profile.'}
          </p>

          <div className="security-task-list">
            {firewallTasks.map((task) => {
              const checked = completedFirewallTasks.includes(task.id)
              return (
                <label className={`security-task ${checked ? 'completed' : ''}`} key={task.id}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setCompletedFirewallTasks((current) =>
                      checked ? current.filter((id) => id !== task.id) : [...current, task.id]
                    )}
                  />
                  <span className="task-copy">
                    <strong>{task.title}</strong>
                    <span>{task.description}</span>
                  </span>
                </label>
              )
            })}
          </div>

          <div className="checklist-progress">
            <div className="progress-label">
              <span>Checklist progress</span>
              <strong>{completedFirewallTasks.length} of {firewallTasks.length} verified</strong>
            </div>
            <div className="progress-track" role="progressbar" aria-label="Firewall checklist progress" aria-valuemin={0} aria-valuemax={firewallTasks.length} aria-valuenow={completedFirewallTasks.length}>
              <div className="progress-fill" style={{ width: `${completedFirewallTasks.length / firewallTasks.length * 100}%` }} />
            </div>
          </div>

          <p role="status" className="checklist-note">
            {completedFirewallTasks.length === firewallTasks.length
              ? 'All checklist items marked complete. Recheck these settings after major system changes.'
              : 'Only check items after verifying them in your device settings.'}
          </p>
          <p className="disclaimer">
            ShieldPocket does not inspect or change your device firewall. This checklist records your own assessment.
          </p>
        </section>

        <section id="cookie-privacy" className="content-card">
          <div className="card-heading">
            <div>
              <h2>Cookie & Privacy Checker</h2>
              <p>Review a website's cookie notice and select any concerns you observed.</p>
            </div>
            <span className="demo-tag">PRIVACY REVIEW</span>
          </div>

          <p>
            Essential cookies can support logins and security. Analytics and advertising cookies may involve additional tracking. Their purpose and legal requirements depend on the website and your location.
          </p>

          <div className="security-task-list">
            {cookieConcerns.map((concern) => {
              const checked = selectedCookieConcerns.includes(concern.id)
              return (
                <label className={`security-task ${checked ? 'completed' : ''}`} key={concern.id}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setSelectedCookieConcerns((current) =>
                      checked ? current.filter((id) => id !== concern.id) : [...current, concern.id]
                    )}
                  />
                  <span className="task-copy">
                    <strong>{concern.label}</strong>
                  </span>
                </label>
              )
            })}
          </div>

          <div className="analysis-result" role="status" aria-live="polite">
            <h3>Privacy review</h3>
            {selectedCookieConcerns.length === 0 ? (
              <p>No concerns selected yet. Review the website's cookie notice and consent settings; an empty selection does not mean the site is private or safe.</p>
            ) : (
              <>
                <p>{selectedCookieConcerns.length} potential privacy concern(s) selected for further review.</p>
                <ul>
                  {selectedCookieConcerns.map((id) => (
                    <li key={id}>{cookieConcerns.find((item) => item.id === id)?.label}</li>
                  ))}
                </ul>
                <p>Recommended action: review the site's privacy policy and available cookie preferences. Disable optional tracking when appropriate for your needs.</p>
              </>
            )}
          </div>

          <p className="disclaimer">
            This is a self-assessment, not an automatic cookie scan or legal compliance determination. ShieldPocket cannot read another website's cookies from this checklist.
          </p>
        </section>


        <section id="password-checker" className="content-card password-checker">
          <div className="card-heading">
            <div>
              <h2>Password Security Checker</h2>
              <p>Review password length and common weakness patterns on this device.</p>
            </div>
            <span className="demo-tag">LOCAL CHECK</span>
          </div>

          <div className="password-privacy-note">
            <strong>Privacy first:</strong> Use a made-up sample, not a real password.
            This checker evaluates text in this page and does not save or send it.
          </div>

          <label htmlFor="password-check-input">Sample password</label>
          <div className="password-input-row">
            <input
              id="password-check-input"
              className="password-check-input"
              type={showPasswordCheckInput ? 'text' : 'password'}
              value={passwordCheckInput}
              onChange={(event) => setPasswordCheckInput(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="Enter a sample password"
            />
            <button
              type="button"
              className="password-toggle-button"
              onClick={() => setShowPasswordCheckInput((shown) => !shown)}
              aria-pressed={showPasswordCheckInput}
            >
              {showPasswordCheckInput ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="password-meter" role="status" aria-live="polite">
            <div className="password-meter-heading">
              <strong>Estimated strength: {passwordAssessment.label}</strong>
              <span>{passwordCheckInput ? `${passwordAssessment.score}/6` : '—'}</span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Estimated password strength"
              aria-valuemin={0}
              aria-valuemax={6}
              aria-valuenow={passwordAssessment.score}
            >
              <div
                className="progress-fill"
                style={{ width: `${(passwordAssessment.score / 6) * 100}%` }}
              />
            </div>
          </div>

          {passwordCheckInput && (
            <>
              <div className="password-feedback">
                <h3>Potential weaknesses</h3>
                {passwordAssessment.warnings.length ? (
                  <ul>
                    {passwordAssessment.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No listed common-pattern warning was detected. That does not prove the password is secure or unique.</p>
                )}
              </div>

              <div className="password-feedback">
                <h3>Recommendations</h3>
                <ul>
                  {passwordAssessment.suggestions.map((suggestion) => (
                    <li key={suggestion}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setPasswordCheckInput('')
              setShowPasswordCheckInput(false)
            }}
          >
            Clear sample
          </button>

          <p className="disclaimer">
            This is a basic heuristic, not a password-cracking test, breach lookup, or guarantee of security.
            The score does not check whether a password has appeared in data breaches. Avoid entering real passwords.
          </p>
        </section>

        <IncidentResponseKit
          language={assistantLanguage}
          onProgressChange={setIncidentProgress}
        />

        <PatchGenerator language={assistantLanguage} />

        <AttackTreeSimulator language={assistantLanguage} />

        <SyntheticAuditLab language={assistantLanguage} />

         <section id="faq" className="panel" aria-labelledby="faq-heading" style={{ marginTop: 18, padding: 20 }}>
          <h2 id="faq-heading" style={{ marginTop: 0 }}>Frequently asked questions</h2>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>What is ShieldPocket?</summary>
            <p>ShieldPocket is a cybersecurity awareness tool for small businesses. It provides suspicious-message analysis, security checklists, password-strength guidance, privacy self-assessments, and incident-response information. It is an assistance tool, not a replacement for professional security services.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>How does the Threat Analyzer work?</summary>
            <p>The analyzer sends text you provide to the configured AI service through a Supabase Edge Function. If AI analysis is unavailable, the app uses local warning-pattern checks. Results are guidance, not a definitive threat verdict.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>Does the Threat Analyzer use live AI or scan the internet?</summary>
            <p>When configured, the analyzer uses an AI model through a Supabase Edge Function, with local pattern matching as a fallback. It does not visit links or query a live threat-intelligence feed, and it may miss threats or flag legitimate messages for review.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>Are my messages uploaded or saved?</summary>
            <p>When AI analysis is configured, submitted message text is sent to the connected Supabase Edge Function and AI provider for processing. The app does not save an analysis report unless you choose Save report while signed in. Avoid entering passwords, verification codes, financial details, or other sensitive information into the analyzer.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>What happens to screenshots I analyze?</summary>
            <p>A screenshot is sent to Supabase and Meta only after you select it, check the consent box, and run the analysis; each request uses Meta Model API credits. The browser resizes and converts it to JPEG first. ShieldPocket does not save the image itself. If you choose to save a report, the AI assessment and findings are saved, so review them for sensitive information first. The AI provider’s processing and retention are governed by its policies. Redact sensitive details before uploading.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>Can ShieldPocket guarantee a message is safe?</summary>
            <p>No. A low-warning result does not prove that a message is safe. Verify unexpected requests through a trusted, independent contact method before clicking links, opening attachments, sharing information, or sending money.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>What does Security Checkup do?</summary>
            <p>Security Checkup helps you review common practices such as multifactor authentication, software updates, backups, unique passwords, and access permissions. It provides a checklist and recommendations; completing it does not certify that your business or device is secure.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>Does Firewall Checkup change my firewall settings?</summary>
            <p>No. Firewall Checkup provides platform-specific guidance and a checklist for you to review. ShieldPocket does not inspect or change your device firewall automatically.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>Does Cookie & Privacy Checker scan a website?</summary>
            <p>No. It is a self-assessment tool where you select privacy concerns you have observed in a website's cookie notice or settings. It does not read another website's cookies or determine legal compliance.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>How should I use Password Security Checker?</summary>
            <p>Enter a made-up sample rather than a real password. The checker uses basic local heuristics to estimate strength and identify common weakness patterns. It does not crack passwords, check breach databases, or guarantee that a password is secure.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>What can the Sophia voice assistant do?</summary>
            <p>Sophia supports voice interactions for selected workspace navigation and security-analysis commands. Its available actions are limited to the features implemented in ShieldPocket; it does not independently access your email inbox or connected accounts.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>What is Incident Response for?</summary>
            <p>It provides general guidance for responding to suspicious activity. If you entered a password on a suspicious page, change it through the official service on a trusted device, review active sessions, and contact your IT or security team when appropriate. Contact your bank promptly if financial information or money was involved.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>How do Saved Reports work?</summary>
            <p>Sign in to save and manage supported security reports through the connected Supabase service. Saved reports are associated with your account. Do not include sensitive credentials or other private information in reports.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>How do sign-in and account deletion work?</summary>
            <p>Account access uses the configured Supabase authentication service. If account deletion is available in your workspace, follow the in-app confirmation steps. Deletion requests use the connected account-deletion function; contact support if the app reports that deletion could not be confirmed.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>What does Patch generator do?</summary>
            <p>It proposes secure rewrites for Dockerfiles, Terraform, Kubernetes YAML, and application code, with the identified risk, a proposed diff, rationale, validation steps, and rollback instructions. Proposals are for human review only: ShieldPocket does not run, apply, or deploy changes. Request text is sent to Supabase and Meta and uses API credits, so do not include secrets or personal data.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>What is Attack-tree simulator?</summary>
            <p>Pick a hypothetical threat scenario and describe your assets to explore attack paths, potential blast radius, defensive controls, and recommended mitigations. Every path is labeled a hypothetical simulation: nothing is verified, and results do not mean an attack occurred or a system is compromised.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>Which compliance frameworks are supported?</summary>
            <p>The compliance mapper covers NIST CSF 2.0, ISO/IEC 27001:2022, GDPR, PCI DSS, and the EU AI Act. Each selected framework is mapped in its own section with source references. Mappings are preliminary guidance only, not legal advice, certification, or proof of compliance.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>What is Audit log lab?</summary>
            <p>It generates bounded batches of up to 100 explicitly simulated security events with timestamps, types, severity, assets, and correlation IDs for dashboards and backend testing. All identities are fictitious and every event is labeled simulated; nothing represents a real incident. Batches can be downloaded as JSON.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>How does biometric app unlock work?</summary>
            <p>In the native mobile app, your workspace locks automatically when the app starts and whenever you return to it. Unlock with Face ID, Touch ID, or your device passcode — the button names whichever your device supports — or use email and password instead. Availability depends on your device settings; if biometrics are unavailable, the app explains what to set up.</p>
          </details>

          <details style={{ padding: "12px 0" }}>
            <summary>What should I do if biometric unlock fails?</summary>
            <p>Follow the on-screen message: it distinguishes a cancelled attempt from missing enrollment, too many failed attempts, or a missing device passcode. After several failures, the system requires your device passcode before biometrics work again. You can always unlock with email and password instead.</p>
          </details>
        </section>

        <footer>
          ShieldPocket · Hackathon prototype · Demo guidance only
        </footer>
      </main>
      {isLocked && Capacitor.isNativePlatform() && (
        <div className="face-lock-overlay" role="dialog" aria-modal="true" aria-labelledby="face-lock-title">
          <div className="face-lock-card">
            <div className="face-lock-symbol" aria-hidden="true">✓</div>
            <p className="face-lock-eyebrow">SHIELDPOCKET</p>
            <h1 id="face-lock-title">
              {authMode === 'signup' ? 'Create your ShieldPocket account' : 'Workspace locked'}
            </h1>
            <p>
              {authMode === 'signup'
                ? 'Create an account to get started. Email confirmation may be required.'
                : 'Authenticate to access your security workspace and saved reports.'}
            </p>

            {faceLockMessage && <p className="face-lock-message" role="alert">{faceLockMessage}</p>}
            {authMessage && <p role="status" aria-live="polite">{authMessage}</p>}

            <form
              onSubmit={authMode === 'signup' ? handleAuthSubmit : handleLockPasswordSignIn}
              style={{ display: 'grid', gap: '10px', marginTop: '16px' }}
            >
              <label style={{ display: 'grid', gap: '6px', textAlign: 'left' }}>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={authLoading || faceLockBusy}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color, #8797a5)', background: 'transparent', color: 'inherit' }}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', textAlign: 'left' }}>
                Password
                <input
                  type="password"
                  autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={authLoading || faceLockBusy}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color, #8797a5)', background: 'transparent', color: 'inherit' }}
                />
              </label>

              <button
                type="submit"
                className="primary-button face-lock-button"
                disabled={authLoading || faceLockBusy}
              >
                {authLoading
                  ? 'Please wait…'
                  : authMode === 'signup'
                    ? 'Create account'
                    : 'Unlock with email and password'}
              </button>
            </form>

            

            <button
              type="button"
              className="primary-button face-lock-button"
              onClick={() => void retryFaceLock()}
              disabled={
                faceLockBusy ||
                authLoading ||
                (biometryStatus !== null &&
                  !biometryStatus.available &&
                  !biometryStatus.deviceIsSecure)
              }
              style={{ marginTop: '10px' }}
            >
              {faceLockBusy
                ? 'Waiting for authentication…'
                : Capacitor.getPlatform() === 'android'
                  ? 'Scan fingerprint to unlock'
                  : biometryStatus?.biometryType === BiometryType.faceId
                    ? 'Unlock with Face ID'
                    : biometryStatus?.biometryType === BiometryType.touchId
                      ? 'Unlock with Touch ID'
                      : biometryStatus !== null &&
                          !biometryStatus.available &&
                          biometryStatus.deviceIsSecure
                        ? 'Unlock with device passcode'
                        : 'Unlock with Face ID / Touch ID'}
            </button>
            {biometryStatus !== null &&
              !biometryStatus.available &&
              !biometryStatus.deviceIsSecure && (
                <p className="face-lock-message">
                  Biometric and device-passcode unlock are unavailable. Use email
                  and password, or set a device passcode and retry.
                </p>
              )}

            <button
              type="button"
              className="secondary-button face-lock-button"
              onClick={() => {
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
                setAuthMessage('')
                setFaceLockMessage('')
              }}
              disabled={authLoading || faceLockBusy}
              style={{ marginTop: '10px' }}
            >
              {authMode === 'signin'
                ? 'Need an account? Create one'
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App