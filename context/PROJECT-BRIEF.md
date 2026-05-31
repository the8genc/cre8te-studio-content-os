# Cre8te Studio Content OS — Project Brief

> **Start here.** This file gives any collaborator — human or AI — full
> situational awareness of what this system is, what's been built, what's
> in progress, and what comes next.

---

## What This System Does

An always-on, AI-powered content operating system for Cre8te Studio that:
- Ingests raw video/audio from Summit recordings, mini pods, testimonials, and ITL sessions
- Transcribes and extracts content intelligence from every asset
- Generates platform-specific social content and a weekly newsletter
- Routes everything through a human approval gate in Coda
- Publishes approved content to Instagram, YouTube, LinkedIn, TikTok, Facebook, and Email
- Surfaces external creator economy intelligence to keep content timely and relevant

**The core loop:**
```
Research Scout (web/social intel)
    ↓
Ingest raw files → Transcribe (Fireflies) → Extract content angles
    ↓
[HUMAN GATE: Coda approval]
    ↓
Generate platform scripts → Assemble newsletter
    ↓
[HUMAN GATE: Newsletter approval]
    ↓
Publish to all platforms + send email
    ↓
Analytics → Knowledge Base → repeat
```

---

## System Architecture

**Language**: TypeScript / Node.js (ES2022, NodeNext modules)
**Data layer**: Coda (all pipeline state, approvals, and output tracking)
**Infra**: GitHub Actions (CI/CD, all agent cron schedules)
**Secret management**: `.env` for local, GitHub Secrets for CI

**Rule**: Agents never call each other directly. All coordination happens
through Coda status fields. This makes the system inspectable, recoverable,
and debuggable — every state transition is visible in Coda.

---

## Repos

| Repo | Purpose |
|---|---|
| **This repo** `the8genc/cre8te-studio-content-os` | The system itself |
| `the8genc/ai-8gent-skills` | Skills library — patterns used to build this system |

## Coda Document
**URL**: https://coda.io/d/_dktMUNdlobR
**Doc ID**: `ktMUNdlobR`

---

## Read Next

| You want to know... | Read... |
|---|---|
| What phase we're in and what's left | [`context/STATUS.md`](STATUS.md) |
| What needs to happen next, in order | [`context/PENDING.md`](PENDING.md) |
| Known bugs and issues | [`context/BUGS.md`](BUGS.md) |
| How every agent works | [`context/AGENTS.md`](AGENTS.md) |
| All Coda tables and column IDs | [`context/CODA-SCHEMA.md`](CODA-SCHEMA.md) |
| How to set up and run locally | [`docs/setup.md`](../docs/setup.md) |
| How credentials are managed | [`docs/secret-management.md`](../docs/secret-management.md) |
| DaVinci Resolve integration | [`docs/davinci-integration.md`](../docs/davinci-integration.md) |
