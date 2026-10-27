import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'
import VoiceAssistant from './VoiceAssistant'
import { SecurityScoreWidget } from './components/SecurityScoreWidget'
import { MobileDevicePosture } from './components/MobileDevicePosture'

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

interface SecurityReport {
  id: string
  message_text: string
  risk_level: 'low' | 'review' | 'high'
  findings: string[]
  summary: string
  created_at: string
}

function App() {
  const [activeSection, setActiveSection] = useState('overview')
  const [message, setMessage] = useState(
    'Your business email will be disabled today. Verify your account immediately using this link.'
  )
  const [result, setResult] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisFindings, setAnalysisFindings] = useState<string[]>([])
  const [analysisRiskLevel, setAnalysisRiskLevel] =
    useState<'low' | 'review' | 'high' | null>(null)
  const [analysisSummary, setAnalysisSummary] = useState('')
  const [reports, setReports] = useState<SecurityReport[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportMessage, setReportMessage] = useState('')
  const [savingReport, setSavingReport] = useState(false)

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
  const faceLockBusyRef = useRef(false)
  const faceLockMountedRef = useRef(false)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setAuthMessage(error.message)
        return
      }
      setUser(data.session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPasskeys() {
      if (!user || !supabase) {
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
  }, [user?.id])


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
      } catch {
        if (!cancelled) {
          setIsLocked(true)
          setFaceLockMessage(
            'Authentication was not completed. Try again or use your device passcode if offered.'
          )
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
        await BiometricAuth.checkBiometry()
        if (cancelled) return

        resumeHandle = await BiometricAuth.addResumeListener(() => {
          if (cancelled) return
          setIsLocked(true)
          void unlockWithBiometrics()
        })

        if (cancelled) {
          await resumeHandle.remove()
          return
        }

        await unlockWithBiometrics()
      } catch {
        if (!cancelled) {
          setIsLocked(true)
          setFaceLockMessage(
            'Biometric protection could not start. Check your device biometrics and passcode settings, then retry.'
          )
        }
      }
    }

    void initializeFaceLock()

    return () => {
      cancelled = true
      faceLockMountedRef.current = false
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
    } catch {
      setIsLocked(true)
      setFaceLockMessage(
        'Authentication was not completed. Check your device biometric or passcode settings and try again.'
      )
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

  useEffect(() => {
    if (activeSection !== 'password-checker') {
      setPasswordCheckInput('')
      setShowPasswordCheckInput(false)
    }
  }, [activeSection])

  const nextRecommendedTask = securityTasks.find(
    (_, index) => !completedTasks.includes(index)
  )

  const recommendationTitle =
    nextRecommendedTask?.title ?? 'Review your security plan'

  const recommendationDescription =
    nextRecommendedTask?.description ??
    'All baseline tasks are complete. Review your controls regularly to make sure they remain effective.'

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
    

    if (/\burgent(e|ly)?\b|\bimmediately\b|\btoday\b|\bact now\b|\bfinal warning\b|\bexpires? today\b|\bde inmediato\b|\binmediatamente\b|\bactua ahora\b|\hoy\b|\bultima advertencia\b|\bultim(o|a) aviso\b|\bse bloqueara\b|\bsera desactivad[ao]\b/.test(text)) {
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

    


  async function handleThreatAnalysis(textToAnalyze: string = message) {
    const trimmedMessage = textToAnalyze.trim()

    if (!trimmedMessage) {
      setResult('Please enter a message to analyze.')
      return
    }

    setAnalysisLoading(true)
    setReportMessage('')

    try {
      if (!supabase || !isSupabaseConfigured) {
        throw new Error('Supabase is not configured.')
      }

      const { data, error } = await supabase.functions.invoke(
        'analyze-threat',
        { body: { message: trimmedMessage } }
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
      if (data?.alertStatus === 'created') {
        setReportMessage('High-severity alert saved to your account.')
      } else if (data?.alertError) {
        setReportMessage(data.alertError)
      } else if (data?.alertStatus === 'skipped' && riskLevel === 'high') {
        setReportMessage('Sign in to receive high-severity security alerts.')
      }
    } catch (error) {
      console.error('AI threat analysis failed; using local analysis.', error)
      analyzeMessage(trimmedMessage)
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
          message_text: message,
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
    setCompletedTasks((previous) =>
      previous.includes(index)
        ? previous.filter((task) => task !== index)
        : [...previous, index]
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
      if (!user || !supabase) {
        setChecklistReadyForUserId(null)
        return
      }

      setChecklistReadyForUserId(null)

      const { data, error } = await supabase
        .from('security_checklist_progress')
        .select('completed_tasks')
        .eq('user_id', user.id)
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
            user_id: user.id,
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

      setChecklistReadyForUserId(user.id)
    }

    void loadChecklist()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Save only after this signed-in user's cloud checklist has loaded.
  useEffect(() => {
    if (!user || !supabase || checklistReadyForUserId !== user.id) return

    let cancelled = false

    async function saveChecklist() {
      const { error } = await supabase!
        .from('security_checklist_progress')
        .upsert({
          user_id: user!.id,
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
  }, [user?.id, checklistReadyForUserId, completedTasks])
  // Load the signed-in user's saved security reports.
  useEffect(() => {
    let cancelled = false

    async function loadReports() {
      if (!user || !supabase) {
        setReports([])
        setReportsLoading(false)
        return
      }

      setReportsLoading(true)

      const { data, error } = await supabase
        .from('security_reports')
        .select('id, message_text, risk_level, findings, summary, created_at')
        .eq('user_id', user.id)
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
  }, [user?.id])

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
          <img className="brand-logo" src="/ShieldPocket.png" alt="ShieldPocket logo" />
          <div>
            <strong>ShieldPocket</strong>
            <small>Secure Defense</small>
          </div>
        </div>

        <p className="nav-label">WORKSPACE</p>
<div className="sidebar-nav">
        <button type="button" className={`nav-item ${activeSection === "overview" ? "active" : ""}`} onClick={() => setActiveSection("overview")}>▦ &nbsp; Overview</button>
        <button type="button" className={`nav-item ${activeSection === "threat-analyzer" ? "active" : ""}`} onClick={() => { setActiveSection("threat-analyzer"); document.getElementById("threat-analyzer")?.scrollIntoView({ behavior: "smooth", block: "start" }) }}>⌕ &nbsp; Threat analyzer</button>
        <button type="button" className={`nav-item ${activeSection === "security-checkup" ? "active" : ""}`} onClick={() => { setActiveSection("security-checkup"); document.getElementById("security-checkup")?.scrollIntoView({ behavior: "smooth", block: "start" }) }}>✓ &nbsp; Security checkup</button>
        <button type="button" className={`nav-item ${activeSection === "mobile-device-posture" ? "active" : ""}`} onClick={() => { setActiveSection("mobile-device-posture"); document.getElementById("mobile-device-posture")?.scrollIntoView({ behavior: "smooth", block: "start" }) }}>▣ &nbsp; Mobile posture</button>
        <button type="button" className={`nav-item ${activeSection === "incident-response" ? "active" : ""}`} onClick={() => { setActiveSection("incident-response"); document.getElementById("incident-response")?.scrollIntoView({ behavior: "smooth", block: "start" }) }}>↗ &nbsp; Incident response</button>

        <button type="button" className={`nav-item ${activeSection === "firewall-checkup" ? "active" : ""}`} onClick={() => { setActiveSection("firewall-checkup"); document.getElementById("firewall-checkup")?.scrollIntoView({ behavior: "smooth", block: "start" }) }}>▣ &nbsp; Firewall checkup</button>
        <button type="button" className={`nav-item ${activeSection === "cookie-privacy" ? "active" : ""}`} onClick={() => { setActiveSection("cookie-privacy"); document.getElementById("cookie-privacy")?.scrollIntoView({ behavior: "smooth", block: "start" }) }}>◉ &nbsp; Cookie privacy</button>
        <button type="button" className={`nav-item ${activeSection === "password-checker" ? "active" : ""}`} onClick={() => { setActiveSection("password-checker"); document.getElementById("password-checker")?.scrollIntoView({ behavior: "smooth", block: "start" }) }}>🔐 &nbsp; Password checker</button></div>

        <div className="sidebar-note">
          <strong>Security starts here.</strong>
          <p>Simple, practical steps to help protect your business.</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span>Workspace / Overview</span>
          <span className="status-pill">● Demo environment</span>
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
          onNavigate={(section) => {
            if (section === 'overview') {
              window.scrollTo({ top: 0, behavior: 'smooth' })
              return
            }
            setActiveSection(section)
            document.getElementById(section)?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            })
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
                onClick={() => {
                  setMessage('Your business email will be disabled today. Verify your account immediately using this link or access will be permanently removed.')
                  setResult('')
                }}
              >
                Urgent login
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setMessage('Please process this invoice payment today. We changed our bank details, so use the new account in the attached instructions.')
                  setResult('')
                }}
              >
                Invoice request
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setMessage('Hello team, the monthly maintenance window is scheduled for Saturday from 8:00 to 9:00 PM. Please save your work beforehand.')
                  setResult('')
                }}
              >
                Routine update
              </button>
            </div>
          </div>

          <label htmlFor="message">Email or text message</label>
          <textarea
            id="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Paste a suspicious message here..."
          />

          <button
            type="button"
            className="primary-button"
            onClick={() => handleThreatAnalysis()}
            disabled={analysisLoading}
          >
            {analysisLoading ? 'Analyzing with AI...' : 'Analyze message →'}
          </button>

          {result && (
            <div className="analysis-result" role="status">
              <h3>Analysis result</h3>
              <p>{result}</p>

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

         <section id="incident-response" className="panel" aria-labelledby="faq-heading" style={{ marginTop: 18, padding: 20 }}>
          <h2 id="faq-heading" style={{ marginTop: 0 }}>Frequently asked questions</h2>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>What is ShieldPocket?</summary>
            <p>ShieldPocket is a cybersecurity awareness tool for small businesses. It provides suspicious-message analysis, security checklists, password-strength guidance, privacy self-assessments, and incident-response information. It is an assistance tool, not a replacement for professional security services.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>How does the Threat Analyzer work?</summary>
            <p>The analyzer checks text you provide for built-in patterns associated with warning signs such as urgency, login requests, and unusual payment instructions. Its results are guidance, not a definitive threat verdict.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>Does the Threat Analyzer use live AI or scan the internet?</summary>
            <p>The current analyzer uses built-in pattern matching. It does not connect to a live AI model or threat-intelligence feed, and it may miss threats or flag legitimate messages for review.</p>
          </details>

          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>Are my messages uploaded or saved?</summary>
            <p>Message analysis runs locally in the current implementation. If you choose to save a security report while signed in, report data is sent to the connected Supabase service. Avoid entering passwords, verification codes, financial details, or other sensitive information into the analyzer.</p>
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

          <details style={{ padding: "12px 0" }}>
            <summary>How does biometric app unlock work?</summary>
            <p>On supported devices, ShieldPocket can use the device's biometric-authentication capability to unlock the protected workspace. Availability depends on device support and system settings. Keep your device passcode secure and follow the on-screen instructions if authentication fails.</p>
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
              disabled={faceLockBusy || authLoading}
              style={{ marginTop: '10px' }}
            >
              {faceLockBusy
                ? 'Waiting for authentication…'
                : Capacitor.getPlatform() === 'android'
                  ? 'Scan fingerprint to unlock'
                  : 'Unlock with Face ID / Touch ID'}
            </button>

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