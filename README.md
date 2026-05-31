# Cre8te Studio Content OS

An always-on, AI-powered content operating system that turns Cre8te Summit recordings, mini pods, testimonials, and ITL sessions into a continuous stream of community-first content — automatically.

## What This Does

A pipeline of 7 AI agents that run on Claude Code, triggered by cron and Coda approval gates:

```
Ingest Raw Content → Transcribe (Fireflies) → Extract Content Angles →
[HUMAN GATE: Coda approval] → Generate Platform Scripts →
Assemble Weekly Newsletter → Publish (Postiz + Kit) →
Analytics → Knowledge Base Update → Loop
```

## Output Channels
- Instagram, YouTube, LinkedIn, TikTok, Facebook/Community
- Weekly email newsletter (Friday digest)

## The 7 Agents

| # | Agent | Trigger | Key Tool |
|---|---|---|---|
| 1 | Ingester | Daily cron | Google Drive / Dropbox scan |
| 2 | Transcriber | New asset in Coda | Fireflies API |
| 3 | Content Strategist | Asset processed | Claude + Coda KB |
| 4 | Content Writer | Idea approved in Coda | Claude + platform specs |
| 5 | Newsletter Editor | Thursday cron | Claude + Coda packages |
| 6 | Publisher | Scheduled / approved | Postiz MCP + Kit MCP |
| 7 | Analyst | Monday cron | Platform APIs + Coda |

## Tech Stack

| Layer | Tool |
|---|---|
| Agent runtime | Claude Code (Cowork) |
| Data hub & approvals | Coda |
| Transcription (calls/meetings) | Fireflies MCP |
| Transcription (video files) | Fireflies uploadAudio API |
| Editor transcription (DaVinci) | AutoSubs fork → Coda write-back |
| Resolve automation | davinci-resolve-mcp |
| Social publishing | Postiz MCP |
| Newsletter email | Kit MCP |
| Scheduling | Cron (Claude Code) |
| Voice knowledge | Coda Brand Voice KB table |

## Repository Structure

```
cre8te-studio-content-os/
├── CLAUDE.md                  # Manager briefing — read at every session start
├── README.md
├── agents/
│   ├── 01-ingester/
│   │   ├── agent.md           # Job description, boundaries, tools
│   │   └── ingester.py        # Implementation
│   ├── 02-transcriber/
│   │   ├── agent.md
│   │   └── transcriber.py
│   ├── 03-content-strategist/
│   │   ├── agent.md
│   │   └── strategist.py
│   ├── 04-content-writer/
│   │   ├── agent.md
│   │   └── writer.py
│   ├── 05-newsletter-editor/
│   │   ├── agent.md
│   │   └── newsletter.py
│   ├── 06-publisher/
│   │   ├── agent.md
│   │   └── publisher.py
│   └── 07-analyst/
│       ├── agent.md
│       └── analyst.py
├── skills/
│   ├── ingester-skill.md
│   ├── transcriber-skill.md
│   ├── content-strategist-skill.md
│   ├── content-writer-skill.md
│   ├── newsletter-editor-skill.md
│   ├── publisher-skill.md
│   ├── analyst-skill.md
│   └── full-pipeline-skill.md
├── config/
│   ├── platform-specs.json    # Character limits, hashtag rules per platform
│   ├── coda-schema.json       # Table IDs and column IDs for Coda API calls
│   └── cron-schedule.json     # Cron triggers for each agent
└── docs/
    ├── architecture.md        # Full system architecture
    ├── setup.md               # How to install and configure
    └── davinci-integration.md # DaVinci Resolve + AutoSubs setup guide
```

## Quick Start

1. Clone this repo
2. Copy `.env.example` to `.env` and fill in credentials
3. Run `python agents/01-ingester/ingester.py --test` to verify connections
4. Open the Coda doc and check Source Assets table for test entry

## Forked Repositories Required

| Repo | Purpose | Fork Action Needed |
|---|---|---|
| [tmoroney/auto-subs](https://github.com/tmoroney/auto-subs) | DaVinci Resolve transcription | Add Coda write-back hook |
| [samuelgursky/davinci-resolve-mcp](https://github.com/samuelgursky/davinci-resolve-mcp) | Claude ↔ Resolve bridge | Configure for Cre8te environment |
| [hiteshK03/davinci-resolve-mcp](https://github.com/hiteshK03/davinci-resolve-mcp) | Free Resolve fallback | Use if no Studio license |
| [octimot/StoryToolkitAI](https://github.com/octimot/StoryToolkitAI) | Semantic archive search (Phase 4) | Configure Coda export |

## Coda Document
[Cre8te Studio OS](https://coda.io/d/_dktMUNdlobR/Cre8te-Studio-OS_suxOrHbJ)

---
*Built for Cre8te Studio — community-first content, powered by AI*
