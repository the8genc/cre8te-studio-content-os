# Build Status

**Last updated**: 2026-05-31
**Current phase**: Phase 3 — Publishing (built, blocked on credentials)
**Test health**: 100/100 — 8/8 suites passing, 113 assertions, ~8.3s runtime
**Commit history**: 9 commits on `main`

---

## Phase Overview

| Phase | Status | Completion | Blocker |
|---|---|---|---|
| Phase 1 — Foundation | ✅ Complete | All 9 agents implemented, shared lib, config | — |
| Phase 2 — Content Generation | ✅ Complete | Full approval loop tested, 10-idea cycle verified | — |
| Phase 3 — Publishing | 🔄 Built, not live | Publisher and newsletter sender built and tested | API credentials not yet provisioned |
| Phase 4 — Intelligence Loop | ⏳ Not started | Analytics agents stubbed, ready to wire | Phase 3 must be live first |
| Phase 5 — Skill Packaging | ⏳ Not started | Skill patterns extracted to `ai-8gent-skills` repo | Phase 4 completion |

---

## What Is Built and Working

### All 9 Agents (TypeScript/Node)

| Agent | File | Test status | Live status |
|---|---|---|---|
| 01 Ingester | `agents/01-ingester/ingester.ts` | ✅ Tested (mock) | 🔑 Needs Google Drive credentials |
| 02 Transcriber | `agents/02-transcriber/transcriber.ts` | ✅ Tested (mock) | 🔑 Needs Fireflies API key |
| 03 Content Strategist | `agents/03-content-strategist/strategist.ts` | ✅ Tested (mock) | 🔑 Needs Anthropic API key |
| 04 Content Writer | `agents/04-content-writer/writer.ts` | ✅ Tested (mock) | 🔑 Needs Anthropic API key |
| 05 Newsletter Editor | `agents/05-newsletter-editor/newsletter.ts` | ✅ Tested (mock) | 🔑 Needs Anthropic API key |
| 06 Publisher | `agents/06-publisher/publisher.ts` | ✅ Tested (mock) | 🔑 Needs Postiz + Kit API keys |
| 07 Analyst | `agents/07-analyst/analyst.ts` | ✅ Tested (mock) | 🔑 Needs platform analytics OAuth |
| 08 Research Scout | `agents/08-research-scout/scout.ts` | ✅ Tested (mock) | 🔑 Needs Apify + Perplexity API keys |
| 09 Testing Agent | `agents/09-testing-agent/testing-agent.ts` | ✅ Tested | 🔑 Needs REPORT_EMAIL + email credentials |
| 10 Blog Publisher | `agents/10-blog-publisher/blog-publisher.ts` | ✅ Built | 🔑 Needs FRAMER_API_KEY + FRAMER_PROJECT_URL |
| 11 Editorial Agent | `agents/11-editorial-agent/editorial.ts` | ✅ Tested | 🔑 Needs Anthropic API key |
| 12 Sponsor Agent | `agents/12-sponsor-agent/sponsor.ts` | ✅ Built | 🔑 Needs analytics OAuth + Sponsor Deals data |
| 13 Guest Research Agent | `agents/13-guest-research-agent/guest-research.ts` | ✅ Tested | 🔑 Needs Perplexity API key |

### Shared Library
| File | Purpose | Status |
|---|---|---|
| `lib/coda.ts` | Coda API client | ✅ Built |
| `lib/anthropic.ts` | Claude API client | ✅ Built |
| `lib/fireflies.ts` | Fireflies transcription client | ✅ Built |
| `lib/apify.ts` | Apify actor runner | ✅ Built |
| `lib/mock-coda.ts` | In-memory mock for testing | ✅ Built |
| `lib/mock-anthropic.ts` | Fixture-routed mock for testing | ✅ Built |
| `lib/mock-publisher.ts` | Mock Postiz + Kit with failure injection | ✅ Built |

### Test Infrastructure

| Suite | Tier | Assertions | What it covers |
|---|---|---|---|
| `tests/agents/test-scout.ts` | 1 | 6 | Scout dedup, scoring, priority flag |
| `tests/agents/test-strategist.ts` | 1 | 8 | Angle generation, KB context, Pending status |
| `tests/agents/test-writer.ts` | 1 | 11 | All 6 platform specs, Draft status |
| `tests/agents/test-newsletter.ts` | 1 | 11 | Structure, research intel integration, Friday gate |
| `tests/phase3/test-publisher.ts` | 1 | 16 | 4 scenarios: happy path, newsletter, failure resilience, double-publish guard |
| `tests/integration/test-approval-loop.ts` | 2 | 13 | Full approve/reject/revise 10-idea cycle |
| `tests/integration/test-full-pipeline.ts` | 3 | 23 | Complete end-to-end pipeline smoke test |

### CI/CD
- GitHub Actions workflow: `.github/workflows/daily-pipeline.yml`
- All 9 agent cron schedules configured
- Testing Agent runs daily 3am + weekly Sunday 4am
- Manual trigger available: Actions tab → Daily Content Pipeline → Run workflow

### Coda Tables (all created and live)
All 9 tables created. See `context/CODA-SCHEMA.md` for full column ID reference.

---

## What Is NOT Yet Done

### Credentials (owner action required)
See `context/PENDING.md` for the complete credentials checklist.

### Platform connections
- Postiz account needs to be connected to all 5 social platforms
- Kit subscriber list needs to be created
- Google Drive folders need to exist with correct sharing permissions

### DaVinci Resolve integration
- AutoSubs fork: needs Coda write-back hook added (`docs/davinci-integration.md`)
- davinci-resolve-mcp: needs to be cloned and configured
- Both repos need to be forked into `the8genc` org

### Analytics OAuth (Phase 4)
- Stub functions exist in `agents/07-analyst/analyst.ts`
- Each platform needs real API credentials and OAuth setup
- See `context/PENDING.md` Phase 4 section

---

## Commit History

| Commit | Description |
|---|---|
| `341468b` | init: README, CLAUDE.md, .env.example |
| `2998bcc` | feat: all 7 agent files, 8 skills, config schemas, DaVinci docs |
| `9d1a623` | feat: Agent 08 Research Scout |
| refactor | TypeScript/Node conversion, secret management infrastructure |
| `0a8154e` | ci: GitHub Actions daily pipeline |
| `aaa0df1` | feat: complete all 8 agent implementations |
| `840b01d` | test: Phase 2 test suite — 4/4 passing |
| `708ec2c` | feat: Phase 2 complete + Phase 3 publisher + Agent 09 Testing Agent |
| `50cf868` | (in ai-8gent-skills) skill extraction and context docs |

---

## Content Intelligence (last updated 2026-05-31)

The content generation logic incorporates Brandon Smithwrick's LinkedIn Content Playbook (April 2026, 56K followers, 250K impressions/week):

- **3-bucket system**: Growth (40%) / Authority (40%) / Conversion (20%) — Agent 03 assigns every angle
- **Hook patterns**: 8 named patterns, 8-12 word rule, open-loop/ellipsis convention
- **Framework routing**: AIDA (Conversion) / PAS (Authority) / StoryArc (Growth) — Agent 04 applies per post
- **Save-first priority**: Authority posts always end with save CTA — saves outperform likes algorithmically
- **Keyword reply CTAs**: Conversion posts use "Comment [WORD]" format for DM pipeline
- **Newsletter subject lines**: 4 pattern types (Contrarian, Specific metric, Curiosity gap, Community signal)
- **KPI priority order**: Saves > Comments > Engagement rate > Impressions

Source: `LinkedIn_Content_Playbook.docx` by Brandon Smithwrick (contenttocommas.co)

---

## Technology Decisions (settled — don't re-litigate)

| Decision | Choice | Why |
|---|---|---|
| Language | TypeScript/Node (ES2022, NodeNext) | Type safety, modern async, Node ecosystem |
| Data layer | Coda | Human-readable approval gates, PM visibility, no extra infra |
| Transcription | Fireflies API (not Whisper/n8n) | Speaker labels, NLP extraction, native MCP |
| Social publishing | Postiz MCP | Multi-platform, single API |
| Newsletter | Kit API `/v4/broadcasts` | Already in stack, handles scheduling |
| Web intelligence | Perplexity Sonar API | Cited search-grounded answers in one call |
| Social scraping | Apify actors (LinkedIn, Instagram, TikTok) | Public-only, no auth risk |
| Secret management | `.env` local / GitHub Secrets CI / Doppler team | Progressive security tiers |
| Agent coordination | Via Coda status fields only | Inspectable, recoverable, debuggable |
