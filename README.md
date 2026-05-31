# Cre8te Studio Content OS

An always-on, AI-powered content operating system for Cre8te Studio. Turns
Summit recordings, mini pods, testimonials, and ITL sessions into a continuous
stream of community-first content across Instagram, YouTube, LinkedIn, TikTok,
Facebook, and a weekly email newsletter — automatically.

## Quick Start for New Collaborators

**Start here → [`context/PROJECT-BRIEF.md`](context/PROJECT-BRIEF.md)**

It will direct you to everything else.

## Context Files (read these first)

| File | What it answers |
|---|---|
| [`context/PROJECT-BRIEF.md`](context/PROJECT-BRIEF.md) | What this system is and how it works |
| [`context/STATUS.md`](context/STATUS.md) | What's built, what phase, what's working |
| [`context/PENDING.md`](context/PENDING.md) | What needs to happen next, in priority order |
| [`context/BUGS.md`](context/BUGS.md) | Known issues and their status |
| [`context/AGENTS.md`](context/AGENTS.md) | Every agent — trigger, inputs, outputs, rules |
| [`context/CODA-SCHEMA.md`](context/CODA-SCHEMA.md) | Every Coda table and column ID |

## The Pipeline

```
[5am]  Research Scout    → creator economy intel from web, LinkedIn, Instagram, TikTok
[6am]  Ingester          → scan Google Drive for new recordings
[7am]  Transcriber       → Fireflies API → transcript + speaker labels + themes
[9am]  Content Strategist → 5–8 content angles per asset
          ↕ HUMAN GATE: review Content Ideas in Coda
[2pm]  Content Writer    → all 6 platform scripts per approved idea
[Thu]  Newsletter Editor → weekly digest from that week's packages
          ↕ HUMAN GATE: review Newsletter Draft in Coda
[3×]   Publisher         → Postiz (social) + Kit (newsletter)
[Mon]  Analyst           → analytics pull → Knowledge Base update
[3am]  Testing Agent     → health checks → email report on failure
```

## Repos

| Repo | Purpose |
|---|---|
| **This repo** | The system itself |
| [`the8genc/ai-8gent-skills`](https://github.com/the8genc/ai-8gent-skills) | Skills library — patterns used to build this |

## Coda Document

https://coda.io/d/_dktMUNdlobR

Contains all pipeline state, approval queues, analytics, dev history, and test results.

## Setup

See [`docs/setup.md`](docs/setup.md) for installation, credential setup, and how to run each agent.

## Running Agents

```bash
npm run scout         # Research Scout
npm run ingester      # Scan Drive for new files
npm run transcriber   # Transcribe pending assets
npm run strategist    # Generate content angles
npm run writer        # Write platform scripts for approved ideas
npm run newsletter    # Assemble weekly digest (Thursday)
npm run publisher     # Publish scheduled content + send newsletter
npm run analyst       # Pull analytics, update Knowledge Base
npm run test          # Run full test suite (no credentials needed)
npm run pipeline      # Run all agents in sequence (interactive)
```

## Test Status

```bash
npm test    # 7/7 suites passing | 94 assertions | 100/100 health score | ~9.5s
```

All tests run against mock clients — no live credentials required.

## Tech Stack

| Layer | Tool |
|---|---|
| Runtime | TypeScript / Node.js (ES2022) |
| Data / Approvals | Coda |
| Transcription | Fireflies API |
| Social publishing | Postiz |
| Newsletter | Kit |
| Web intelligence | Perplexity Sonar |
| Social scraping | Apify |
| CI/CD | GitHub Actions |
| Secrets | GitHub Secrets (CI) / `.env` (local) |

## Current Status

**Phase 3 — Publishing** (built and tested, awaiting credentials)

All 9 agents are implemented and tested. The system runs fully in mock mode.
Provisioning API credentials is the only remaining step to go live.

See [`context/PENDING.md`](context/PENDING.md) for the credentials checklist.
