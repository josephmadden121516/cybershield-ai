# ShieldPocket — Hackathon Submission Notes

Track: **Indie Developer** (solo: Joseph Madden).
Meta Global AI Developer Hackathon, submissions due Wed Nov 4.

## Meta platform usage

All AI features call Meta's **Muse Spark** model (`muse-spark-1.3`)
through the **Meta Model API** (`https://api.meta.ai/v1/chat/completions`),
via the Supabase Edge Function `analyze-threat` (`supabase/functions/`).
Every call returns token usage, which the app meters live
(`src/lib/usageMeter.ts`) under a user-set daily cap. The project was
built with the Muse Code coding agent.

No other model providers are used anywhere in the app.

## Built during the hackathon (new work)

Every commit below is dated Oct 28–30, inside the event window.
Verify with `git log --format="%h %ad %s" --date=short`.

| Commit | Date | New work |
|---|---|---|
| `1d650bf` | Oct 30 | Guided war-room demo mode (scripted breach walkthrough driving the real components) |
| `0ecf7c3` | Oct 29 | Usage meter + daily budget guard, daily threat digest, plain-language finding explainer, board-briefing AI polish pass, patch refinement follow-ups, incident timeline reconstructor |
| `13739d9` | Oct 29 | Phishing drill generator (safe training lures) |
| `f47fd00` | Oct 29 | Automated remediation patch generator (Dockerfile/Terraform/K8s/app code), attack-tree simulator, synthetic audit lab, GDPR / PCI DSS / EU AI Act compliance expansion |
| `c2762b8` | Oct 28 | Compliance mapper, CVE triage assistant |
| `74a2caa` | Oct 28 | Executive board briefing (local generation, markdown export, print-to-PDF) |
| `5d9f95c` | Oct 30 | Spot-the-phish game (AI-dealt real/fake email rounds, scored) + hackathon manifest |
| `5b28fcf` | Oct 30 | Animated attack-path kill-chain graph above simulations + submission pack (checklist, video script) |
| `2e23cdd` | Oct 30 | Dependency manifest scans (OSV) + CISA KEV / EPSS exploit intel in the CVE section |
| `982d48f` | Oct 30 | KEV threat watcher, badge studio with rotating QR, link safety checker (Safe Browsing + RDAP domain age + typosquat verdicts) + on-device scam-text analyzer |

## Pre-existing base (not claimed as hackathon work)

Everything else in the repo predates the event: app shell, navigation,
authentication and biometric lock, security checklists, suspicious-message
analyzer UI, saved reports, voice assistant shell, activity timeline, and
the iOS Capacitor wrapper.

## Demo coverage

The in-app war-room demo (`src/components/WarRoomDemo.tsx`) tours only
hackathon-built features: threat digest (`0ecf7c3`), CVE triage
(`c2762b8`), patch generator (`f47fd00`), incident timeline (`0ecf7c3`),
board briefing + AI polish (`74a2caa`, `0ecf7c3`), and the usage meter
(`0ecf7c3`). The spot-the-phish game is demonstrated separately.
The scam suite (link safety checker, scam-text analyzer) sits directly
below the game as a self-guided follow-up: check the link, then read why
the message is suspicious.
