# ShieldPocket

ShieldPocket is a bilingual cybersecurity companion for individuals and small businesses. It combines suspicious-message guidance, security checklists, incident-response playbooks, local password-strength feedback, and Sophia voice assistance in a React web app and Capacitor iOS app.

## Architecture

```text
Browser / iOS app
  React + TypeScript + Vite
  Hosted frontend: Vercel
        |
        | Supabase client (public publishable/anon key)
        v
Supabase Auth, Database, and Edge Functions
  analyze-threat --------------+
  sophia-chat -----------------+----> Meta Model API (Muse Spark)
```

- **Frontend:** React, TypeScript, and Vite. Vercel serves the web build; Capacitor packages the same frontend for iOS.
- **Backend:** Supabase provides authentication, account-scoped data, and Edge Functions. Functions keep the Meta API key on the server.
- **AI:** The `analyze-threat` and `sophia-chat` functions call Meta Model API using Muse Spark. AI requests are made for explicit user actions, not automatically in the background.
- **Local checks:** The password-strength heuristic runs in the browser. Text threat analysis uses local warning-pattern checks if its AI request fails. Screenshot analysis requires the AI endpoint and does not silently substitute a local result.

## Security and privacy

- **No credentials in source control or ShieldPocket application data.** Supabase authentication is handled by Supabase Auth; ShieldPocket does not store users' login passwords in its app data. The Meta `MODEL_API_KEY` belongs in Supabase Function secrets only; never expose it as a `VITE_` variable.
- **Password checker is local-only.** It evaluates the sample in the browser and does not submit it to a server. Use a made-up sample, never a real password.
- **Screenshot analysis is opt-in.** The user selects an image, explicitly consents, then starts the request. The browser resizes it to at most 1600 px, converts it to JPEG, and sends it through Supabase to Meta for analysis. ShieldPocket does not store the image. Provider processing and retention are subject to provider policies; redact sensitive details before upload.
- **Messages are not silently saved.** Message text sent for AI analysis is processed by the configured Supabase function and Meta. An analysis report is stored only when a signed-in user chooses to save it; a saved report contains the submitted text, assessment, and findings. Review it for sensitive information first.
- **Activity history stays on the device.** It records security actions, not message content, and is stored locally in the browser/device.
- **Board briefings are generated locally.** They summarize recent device activity, self-reported checklist and incident-playbook progress, and up to 20 saved threat reports. No AI request is made; chat transcripts and unsaved message contents are excluded. Review a briefing before downloading, printing, or sharing it.
- **Compliance mapping is user-triggered.** The selected threat-assessment summary is sent to Muse Spark only when the user requests NIST CSF 2.0 and/or ISO/IEC 27001:2022 guidance. Results are preliminary, may be inaccurate, and are not an audit, certification, or finding of noncompliance. Verify references against the official standards.
- **Vulnerability triage is user-triggered and defensive.** User-pasted CVE or scanner text is sent to Muse Spark only after submitting the form. It does not run scans or test exploits; do not include credentials or personal data, and verify versions and fixes with vendor advisories.
- **The checklist may sync to Supabase for signed-in accounts.** Account authentication and explicitly saved reports use Supabase services.
- **AI assessments are guidance, not proof.** The analyzer does not visit links, inspect email headers, scan attachments, or query live threat feeds. A low-risk response does not establish that content is safe.

## Features

- English and Spanish support for Sophia and key guidance
- Suspicious text and screenshot analysis with consent for image uploads
- Local password-strength feedback with no breach lookup
- Small-business security checklist and optional AI action plan
- Offline incident-response playbooks
- Account-based passkey authentication and saved security reports
- Local executive board briefings with Markdown download and print-to-PDF
- Opt-in NIST CSF 2.0 / ISO 27001 preliminary mapping for threat assessments
- Defensive CVE and vulnerability prioritization with patch checklists
- Capacitor iOS app using the web app interface

## Development

Requirements: Node.js, npm, and (for iOS builds) Xcode with the iOS toolchain.

```sh
npm install
npm run dev
```

Set the public Supabase configuration in a local `.env.local` file:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

The legacy `VITE_SUPABASE_ANON_KEY` variable is also accepted by the client. These are public client keys protected by Supabase policies; do not put service-role keys or model API keys in frontend environment variables.

Useful checks:

```sh
npm run build
npm run lint
```

## Supabase functions

Configure the provider credential as a server-side Supabase secret, linked to the intended project:

```sh
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set MODEL_API_KEY=YOUR_META_MODEL_API_KEY
npx supabase functions deploy analyze-threat
npx supabase functions deploy sophia-chat
```

Do not paste credentials into source files, commits, screenshots, or support requests. Keep deployment secrets out of the repository.

## iOS

Sync the built frontend to the Capacitor project and open it in Xcode:

```sh
npm run build
npx cap sync ios
npx cap open ios
```

An Xcode development install on a device is separate from the version submitted to App Store Connect.

## Production

The production frontend is hosted on Vercel and deploys from the configured Git branch. Supabase Edge Functions are deployed separately. Confirm both the frontend and required functions are updated when releasing a feature that uses a function.
