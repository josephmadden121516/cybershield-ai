import { useState } from 'react'
import './PhishingResponseGuide.css'

type RiskLevel = 'low' | 'review' | 'high'
type Scenario =
  | 'not-interacted'
  | 'clicked-link'
  | 'shared-credentials'
  | 'opened-attachment'
  | 'sent-payment'

interface ResponseStep {
  id: string
  title: string
  detail: string
}

interface PhishingResponseGuideProps {
  riskLevel: RiskLevel
  findings: string[]
}

const scenarioLabels: Record<Scenario, string> = {
  'not-interacted': 'I have not interacted with it',
  'clicked-link': 'I clicked a link, but entered nothing',
  'shared-credentials': 'I entered a password or shared a verification code',
  'opened-attachment': 'I opened or downloaded an attachment',
  'sent-payment': 'I sent money or shared payment details',
}

const scenarioSteps: Record<Scenario, ResponseStep[]> = {
  'not-interacted': [
    {
      id: 'avoid-interaction',
      title: 'Do not reply, click links, or open attachments',
      detail: 'Keep the message available as evidence, but do not follow its instructions.',
    },
    {
      id: 'verify-request',
      title: 'Verify the request independently',
      detail: 'Contact the person or organization using a number, app, or website you already trust—not the details in the message.',
    },
    {
      id: 'report-message',
      title: 'Report or delete the message',
      detail: 'Use your email or messaging app’s report-phishing option, or follow your organization’s reporting process.',
    },
  ],
  'clicked-link': [
    {
      id: 'close-page',
      title: 'Close the page and do not enter information',
      detail: 'Do not download anything or approve prompts. If you did enter a password or code, choose that option above for account recovery steps.',
    },
    {
      id: 'check-downloads',
      title: 'Check whether anything was downloaded',
      detail: 'Do not open an unexpected file. If you opened one, follow the attachment steps and contact your IT support if available.',
    },
    {
      id: 'report-click',
      title: 'Report the message and link',
      detail: 'Report it through your email provider or organization so others can be warned.',
    },
  ],
  'shared-credentials': [
    {
      id: 'change-password',
      title: 'Change the exposed password from a trusted device',
      detail: 'Go directly to the real service using its official app or a saved bookmark. Never use the message link.',
    },
    {
      id: 'secure-reused-passwords',
      title: 'Update any accounts that reused that password',
      detail: 'Use a different, unique password for each account. Do not share passwords or verification codes with anyone.',
    },
    {
      id: 'review-account',
      title: 'Review sign-ins and recovery settings',
      detail: 'Use the service’s official security settings to sign out unfamiliar sessions, check recovery details, and enable multifactor authentication.',
    },
    {
      id: 'contact-service',
      title: 'Contact the service through its official support channel',
      detail: 'Tell them credentials or a verification code may have been exposed and follow their account-recovery guidance.',
    },
  ],
  'opened-attachment': [
    {
      id: 'stop-using-file',
      title: 'Stop interacting with the file',
      detail: 'Do not enable macros, approve additional prompts, or reopen the attachment.',
    },
    {
      id: 'contact-support',
      title: 'Contact your IT or device support team',
      detail: 'Describe what you opened and when. Follow their instructions before deleting files or changing device settings.',
    },
    {
      id: 'check-accounts',
      title: 'Watch for unexpected account activity',
      detail: 'From a trusted device, review important account activity and contact the official service if you see unfamiliar sign-ins.',
    },
  ],
  'sent-payment': [
    {
      id: 'contact-bank',
      title: 'Contact your bank or payment provider immediately',
      detail: 'Use the number on your card or the provider’s official app or website. Ask whether the payment can be stopped or disputed.',
    },
    {
      id: 'notify-business',
      title: 'Notify your finance lead or security contact',
      detail: 'Share the payment details through a trusted channel so your organization can follow its incident process.',
    },
    {
      id: 'preserve-evidence',
      title: 'Preserve the message and transaction details',
      detail: 'Keep copies of the message, payment receipt, and related communications for your bank or incident responders.',
    },
  ],
}

export function PhishingResponseGuide({
  riskLevel,
  findings,
}: PhishingResponseGuideProps) {
  const [scenario, setScenario] = useState<Scenario>('not-interacted')
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const steps = scenarioSteps[scenario]
  const riskLabel =
    riskLevel === 'high'
      ? 'High risk indicators'
      : riskLevel === 'review'
        ? 'Needs careful review'
        : 'No common warning patterns found'

  function changeScenario(value: Scenario) {
    setScenario(value)
    setCompletedSteps([])
  }

  function toggleStep(stepId: string) {
    setCompletedSteps((current) =>
      current.includes(stepId)
        ? current.filter((id) => id !== stepId)
        : [...current, stepId]
    )
  }

  return (
    <section className="phishing-response-guide" aria-labelledby="response-guide-title">
      <div className="phishing-response-heading">
        <div>
          <p className="phishing-response-eyebrow">GUIDED RESPONSE</p>
          <h3 id="response-guide-title">Choose what happened</h3>
          <p>
            Get practical next steps based on your situation. ShieldPocket does
            not perform these actions for you.
          </p>
        </div>
        <span className={`phishing-risk-badge phishing-risk-${riskLevel}`}>
          {riskLabel}
        </span>
      </div>

      <label htmlFor="phishing-scenario">What did you do with this message?</label>
      <select
        id="phishing-scenario"
        value={scenario}
        onChange={(event) => changeScenario(event.target.value as Scenario)}
      >
        {(Object.keys(scenarioLabels) as Scenario[]).map((value) => (
          <option value={value} key={value}>
            {scenarioLabels[value]}
          </option>
        ))}
      </select>

      {findings.length > 0 && (
        <details className="phishing-response-context">
          <summary>Review the analysis context</summary>
          <ul>
            {findings.slice(0, 5).map((finding, index) => (
              <li key={`${index}-${finding}`}>{finding}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="phishing-response-progress" aria-live="polite">
        <span>
          {completedSteps.length} of {steps.length} steps marked complete
        </span>
        <progress value={completedSteps.length} max={steps.length}>
          {completedSteps.length} of {steps.length}
        </progress>
      </div>

      <ol className="phishing-response-steps">
        {steps.map((step) => {
          const checked = completedSteps.includes(step.id)
          return (
            <li
              className={checked ? 'phishing-response-step is-complete' : 'phishing-response-step'}
              key={step.id}
            >
              <label>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleStep(step.id)}
                />
                <span>
                  <strong>{step.title}</strong>
                  <small>{step.detail}</small>
                </span>
              </label>
            </li>
          )
        })}
      </ol>

      <p className="phishing-response-disclaimer">
        A low-risk result does not prove a message is safe. For financial loss,
        suspected account takeover, or possible malware, contact the relevant
        provider or qualified IT/security support promptly.
      </p>
    </section>
  )
}
