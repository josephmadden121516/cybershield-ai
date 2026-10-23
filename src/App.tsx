import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

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

interface SecurityReport {
  id: string
  message_text: string
  risk_level: 'low' | 'review' | 'high'
  findings: string[]
  summary: string
  created_at: string
}

function App() {
  const [message, setMessage] = useState(
    'Your business email will be disabled today. Verify your account immediately using this link.'
  )
  const [result, setResult] = useState('')
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

  async function handleSignOut() {
    if (!supabase) return
    setAuthLoading(true)
    setAuthMessage('')
    const { error } = await supabase.auth.signOut()
    setAuthMessage(error ? error.message : 'You have signed out.')
    setAuthLoading(false)
  }

  async function handlePasskeySignIn() {
    if (!supabase) {
      setAuthMessage('Authentication is not configured yet.')
      return
    }

    setAuthLoading(true)
    setAuthMessage('Follow your device or browser prompt to sign in with a passkey.')

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
      setAuthMessage('Sign in before enabling Secure Open.')
      return
    }

    setAuthLoading(true)
    setAuthMessage('Follow your device or browser prompt to create a passkey.')

    try {
      const { error } = await supabase.auth.registerPasskey()
      if (error) throw error
      setAuthMessage('Passkey registered successfully. Secure Open is enabled for this account.')
    } catch (error) {
      setAuthMessage(
        error instanceof Error
          ? error.message
          : 'Passkey registration failed. Your existing sign-in method is unchanged.'
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

  const nextRecommendedTask = securityTasks.find(
    (_, index) => !completedTasks.includes(index)
  )

  const recommendationTitle =
    nextRecommendedTask?.title ?? 'Review your security plan'

  const recommendationDescription =
    nextRecommendedTask?.description ??
    'All baseline tasks are complete. Review your controls regularly to make sure they remain effective.'

  function analyzeMessage() {
    const text = message.toLowerCase()
    const warnings: string[] = []

    if (/urgent|immediately|today|act now|final warning/.test(text)) {
      warnings.push('Uses urgency or pressure to act')
    }

    if (/password|verify your account|sign in|login|code/.test(text)) {
      warnings.push('Mentions account access or sensitive information')
    }

    if (/click here|use this link|attachment|download now/.test(text)) {
      warnings.push('Encourages clicking a link or opening a file')
    }

    if (/wire transfer|bank details|payment today|gift card/.test(text)) {
      warnings.push('Contains a financial or payment request')
    }

    const riskLevel: 'low' | 'review' | 'high' =
      warnings.length >= 3 ? 'high' : warnings.length > 0 ? 'review' : 'low'

    const summary = warnings.length
      ? `Caution: ${warnings.length} warning sign(s) found. Verify independently before taking action.`
      : 'No common warning patterns were detected. This does not prove the message is safe.'

    setAnalysisFindings(warnings)
    setAnalysisRiskLevel(riskLevel)
    setAnalysisSummary(summary)
    setReportMessage('')

    setResult(
      warnings.length
        ? `Caution: ${warnings.length} warning sign(s) found.\n\n${warnings.map((warning) => `• ${warning}`).join('\n')}\n\nVerify independently before taking action.`
        : 'No common warning patterns were detected. This does not prove the message is safe.'
    )
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
const securityStatus =
  securityScore < 40
    ? 'Needs attention'
    : securityScore < 70
      ? 'Improving'
      : securityScore < 90
        ? 'Good progress'
        : 'Strong checklist completion'
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">✓</div>
          <div>
            <strong>CyberShield AI</strong>
            <small>Small business security</small>
          </div>
        </div>

        <p className="nav-label">WORKSPACE</p>
        <div className="nav-item active">▦ &nbsp; Overview</div>
        <div className="nav-item">⌕ &nbsp; Threat analyzer</div>
        <div className="nav-item">✓ &nbsp; Security checkup</div>
        <div className="nav-item">↗ &nbsp; Incident response</div>

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

        <section className="content-card auth-card">
          <div className="card-heading">
            <div>
              <h2>{user ? 'Your account' : authMode === 'signin' ? 'Sign in to CyberShield AI' : 'Create your account'}</h2>
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
              <p className="auth-help">
                Secure Open lets you sign in with a passkey saved to your
                device or password manager. Keep email and password available
                as a backup.
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={handleRegisterPasskey}
                disabled={authLoading}
              >
                {authLoading ? 'Please wait...' : 'Enable Secure Open (passkey)'}
              </button>
              {authMessage && (
                <p role="status" aria-live="polite">{authMessage}</p>
              )}
              <button
                type="button"
                className="primary-button"
                onClick={handleSignOut}
                disabled={authLoading}
              >
                {authLoading ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          ) : !isSupabaseConfigured ? (
            <p>
              Account access is not configured yet. Check your Supabase
              environment settings before signing in.
            </p>
          ) : (
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

                {authMode === 'signin' && (
                  <>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handlePasskeySignIn}
                      disabled={authLoading}
                    >
                      {authLoading ? 'Please wait...' : 'Sign in with a passkey'}
                    </button>
                    <p className="auth-help">
                      Already registered a passkey? Use it to sign in.
                      To set one up, sign in with email and password first.
                    </p>
                  </>
                )}

                {authMessage && (
                  <p role="status" aria-live="polite">{authMessage}</p>
                )}
              </div>
            </form>
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

        <section className="content-card">
          <div className="card-heading">
            <div>
              <h2>Suspicious message analyzer</h2>
              <p>Paste a message to check for common warning signs.</p>
            </div>
            <span className="demo-tag">LOCAL DEMO</span>
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

          <button className="primary-button" onClick={analyzeMessage}>
            Analyze message →
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
            Prototype only. This version uses local pattern matching, not a
            connected AI model or live security scan. Results are not a
            guarantee that a message is safe or malicious.
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

        <section className="content-card security-card">
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
<div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '16px',
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(45, 212, 191, 0.08)',
                border: '1px solid rgba(45, 212, 191, 0.25)',
              }}
            >
              <div>
                <strong>Security Score</strong>
                <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.75 }}>
                  Based on completed security tasks
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
  <strong style={{ fontSize: '26px', color: '#2dd4bf' }}>
    {securityScore}/100
  </strong>
  <p style={{ margin: '4px 0 0', fontSize: '11px', opacity: 0.8 }}>
    {securityStatus}
  </p>
</div>
            </div>

            <div
              style={{
                marginTop: '14px',
                marginBottom: '16px',
                padding: '16px',
                borderRadius: '10px',
                background: 'rgba(45, 212, 191, 0.08)',
                border: '1px solid rgba(45, 212, 191, 0.25)',
              }}
            >
              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: '11px',
                  color: '#2dd4bf',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Recommended Next Step
              </p>

              <strong>{recommendationTitle}</strong>

              <p style={{ margin: '6px 0 0', fontSize: '12px', opacity: 0.8 }}>
                {recommendationDescription}
              </p>
            </div>

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


        <section className="panel" aria-labelledby="faq-heading" style={{ marginTop: 18, padding: 20 }}>
          <h2 id="faq-heading" style={{ marginTop: 0 }}>Frequently asked questions</h2>
          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>What is CyberShield AI?</summary>
            <p>CyberShield AI is a cybersecurity copilot prototype that helps small businesses recognize suspicious messages, review common security practices, and learn general incident-response steps.</p>
          </details>
          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>How does the threat analyzer work?</summary>
            <p>It checks message text against built-in patterns associated with warning signs such as urgency, login requests, and unusual payment instructions. Its results are guidance, not a definitive threat verdict.</p>
          </details>
          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>Does it use live AI or scan the internet for threats?</summary>
            <p>No. The current analyzer uses local pattern matching. It does not connect to a live AI model or threat-intelligence feed, so it may miss threats or flag legitimate messages for review.</p>
          </details>
          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>Are my messages uploaded or saved?</summary>
            <p>Message analysis runs locally in this prototype. Avoid entering passwords, verification codes, financial details, or other sensitive information. Data handling may differ when saving reports or using connected services in other versions.</p>
          </details>
          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>Can CyberShield AI guarantee a message is safe?</summary>
            <p>No. A low-warning result does not prove a message is safe. Verify unexpected requests through a trusted, independent contact method before clicking links, opening attachments, sharing information, or sending money.</p>
          </details>
          <details style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color, #dce7eb)" }}>
            <summary>What if I already clicked a suspicious link?</summary>
            <p>Stop interacting with the page. If you entered a password, change it using the official service on a trusted device, review active sessions, and contact your IT or security team when appropriate. Contact your bank promptly if money or payment details were involved.</p>
          </details>
          <details style={{ padding: "12px 0" }}>
            <summary>Does this replace a cybersecurity professional?</summary>
            <p>No. This is a demonstration tool for general awareness. Significant incidents, suspected malware, compromised business accounts, and financial fraud may require qualified security or incident-response support.</p>
          </details>
        </section>

        <footer>
          CyberShield AI · Hackathon prototype · Demo guidance only
        </footer>
      </main>
    </div>
  )
}

export default App