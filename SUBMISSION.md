# ShieldPocket — Submission Pack (Meta Global AI Hackathon)

Due: **Wed Nov 4, 9:00 PM** via the CV platform. Last day for help/questions: Tue Nov 3.
Track: **Indie Developer (solo)**.

## Checklist

- [ ] Repo is **public** (GitHub → Settings → Danger Zone → Change visibility)
- [ ] `HACKATHON.md` manifest committed (maps every new feature to its commit)
- [ ] Edge function deployed: `supabase functions deploy analyze-threat`
- [ ] Vercel production build green on latest `main`
- [ ] Demo video recorded (3 min full + 60 s cutdown), uploaded per CV platform instructions
- [ ] Submission form answers written (pitch, Meta tech used, what's new — see below)
- [ ] One full rehearsal on the exact deployed link judges will open
- [ ] TestFlight external link ready as backup (in case judges prefer iPhone)

## What to say (submission form + video narration)

**One-line pitch.** "ShieldPocket is a pocket-sized security operations assistant:
it triages threats, drafts patches, reconstructs incidents, and briefs the
board — every AI answer metered to the cent."

**Meta tech (judges check this).** "Every AI feature calls Meta's Muse Spark
model through the Meta Model API, behind one Supabase Edge Function. Token
usage from every call feeds a live budget meter with a daily cap. Built with
the Muse Code agent."

**What's new (say this verbatim-ish, it's a rule).** "All AI features were
built during the hackathon, Oct 28–30 — HACKATHON.md in the repo maps each
one to its commit. The pre-existing base is just the app shell, checklists,
and login."

## Video script (3 minutes)

Total: ~180 seconds. Record the screen at 1080p, voice over after (cleaner
than live talking). Speak slowly; pause 1 beat between sections.

**0:00–0:20 — Hook (20 s).**
Show the phone + web app side by side if possible, else web.
Say: "Small businesses get enterprise-grade attacks with no security team.
ShieldPocket is the security analyst in their pocket. Everything I'm about
to show was built this week on Meta's Muse model — and the whole demo costs
less than a cup of coffee to run."

**0:20–1:50 — War-room demo (90 s).**
Press Start on the War-room demo section; let it drive. Narrate lightly,
one line per step as it scrolls — do NOT talk over every second:
- Digest: "Overnight picture, one call."
- Triage: "A critical CVE lands; we triage it defensively."
- Patch: "A hardened Dockerfile, drafted for human review — never auto-applied."
- Timeline: "Scattered night-shift notes become an ordered timeline."
- Briefing: "And the board gets its briefing, AI-polished."
- Meter: "Six AI steps, a few cents, tracked live."

**1:50–2:25 — Play the phishing game (35 s).**
Open Spot the phish, deal a game, answer 2 rounds on camera (get one right,
miss one — the reveal teaches). Say: "Fresh AI-written emails every game.
This is security training people actually finish."

**2:25–2:50 — How it works (25 s).**
Flash the HACKATHON.md file and one edge-function code shot.
Say: "One edge function, one Meta model, every token metered with a daily
cap. New work is mapped commit-by-commit in the repo."

**2:50–3:00 — Close (10 s).**
Back on the app home. Say: "ShieldPocket: enterprise security instincts,
pocket-sized. Thank you."

## Recording tips

- **Do not record before the final deploy.** Rehearse on localhost, record on
  the production Vercel link.
- Run the war-room once off-camera first (warms caches, confirms AI latency).
- If an AI call is slow on camera, keep the pause — say "live AI, worth the
  two seconds." Never fake a result.
- Capture mistakes honestly: if the game misses one, that's the teaching
  moment — keep it in.
- Export 1080p; check audio levels with one 10-second test clip first.
