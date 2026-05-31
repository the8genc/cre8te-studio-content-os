# Agent Reference

Full specification of all 9 agents. Read `context/STATUS.md` first for build status.

---

## Pipeline Flow

```
[Daily 5am]  Agent 08: Research Scout    → Research Intelligence table
[Daily 6am]  Agent 01: Ingester          → Source Assets table
[Daily 7am]  Agent 02: Transcriber       → Source Assets (transcript written back)
[Daily 9am]  Agent 03: Content Strategist → Content Ideas table (Pending)
             ↕ HUMAN GATE: approver reviews Content Ideas in Coda
[Daily 2pm]  Agent 04: Content Writer    → Content Packages table (Draft)
[Thu 8pm]    Agent 05: Newsletter Editor → Newsletter Drafts table (Pending)
             ↕ HUMAN GATE: approver reviews Newsletter Draft in Coda
[3x daily]   Agent 06: Publisher         → Posts to all platforms, URLs back to Coda
[Mon 9am]    Agent 07: Analyst           → Analytics Log + Brand Voice KB
[Daily 3am]  Agent 09: Testing Agent     → Test Results table + email report
```

---

## Agent 01 — Ingester
**File**: `agents/01-ingester/ingester.ts`
**Job**: Scan Google Drive folders for new video/audio files. Register each unprocessed file as a row in Coda Source Assets.
**Trigger**: Daily cron 6am
**Inputs**: 4 Google Drive folder IDs (Summit, Mini Pod, Testimonial, ITL)
**Outputs**: New rows in Source Assets table, status = "Pending"
**Dedup**: Checks if Drive file URL already exists before writing
**Filename convention**: `YYYY-MM-DD_SpeakerName_TopicSlug.mp4` — enables speaker name parsing
**Supported formats**: .mp4, .mov, .mp3, .wav, .m4a, .webm

## Agent 02 — Transcriber
**File**: `agents/02-transcriber/transcriber.ts`
**Job**: Convert raw video/audio into structured transcripts with speaker labels and key themes via Fireflies API.
**Trigger**: Daily cron 7am (runs after Ingester)
**Condition**: Source Assets with Transcription Status = "Pending"
**Inputs**: Raw file URL from Coda row
**Outputs**: Transcript text, Key Themes, status = "Complete", Processed = true
**External dependency**: Fireflies API — `uploadAudio` GraphQL mutation
**Polling**: Checks every 60s, times out at 30 minutes
**Speaker labels**: Fireflies returns "Speaker 1/2" for non-Zoom. Real names if filename convention followed.

## Agent 03 — Content Strategist
**File**: `agents/03-content-strategist/strategist.ts`
**Job**: Read completed transcripts and extract 5–8 specific, distinct content angles per asset.
**Trigger**: Daily cron 9am
**Condition**: Source Assets where Processed = true AND no linked Content Ideas yet
**Inputs**: Transcript + Key Themes + Brand Voice KB + existing idea titles (for dedup)
**Outputs**: New rows in Content Ideas table, all status = "Pending"
**Dedup threshold**: Skips if >70% word overlap with existing ideas
**Angle types**: Standout quote, framework/model, story arc, community moment, contrarian take, practical takeaway
**Human gate**: All ideas go to "Pending" — approver reviews in "🟡 Pending Approval" Coda view

## Agent 04 — Content Writer
**File**: `agents/04-content-writer/writer.ts`
**Job**: Generate complete platform-specific content packages for every approved idea.
**Trigger**: Daily cron 2pm
**Condition**: Content Ideas with Approval Status = "Approved" AND no linked Content Package
**Inputs**: Approved idea + source transcript + Brand Voice KB + platform specs
**Outputs**: Content Package row with all 6 platform scripts, status = "Draft"
**Platforms**: Instagram (caption+hashtags), YouTube (title+description+tags), LinkedIn (post), TikTok (hook+script+caption), Facebook (post), Newsletter (2-3 sentence blurb)
**Voice rule**: Every script must reference a specific moment from the transcript — never generic

## Agent 05 — Newsletter Editor
**File**: `agents/05-newsletter-editor/newsletter.ts`
**Job**: Assemble that week's approved content packages into a weekly digest email.
**Trigger**: Thursday cron 8pm
**Condition**: No newsletter draft exists for the current week
**Inputs**: This week's Scheduled/Published content packages + Research Intelligence "Newsletter Story" items
**Outputs**: Newsletter Drafts row, status = "Pending"
**Structure**: Subject line → Hero story → This Week in Cre8te (3-5 items) → Creator Economy section (from Research Scout) → Community Spotlight → What's Coming → CTA
**Human gate**: Approver reviews in "📰 Newsletter Review" Coda view before send

## Agent 06 — Publisher
**File**: `agents/06-publisher/publisher.ts`
**Job**: Post approved content packages to all social platforms and send approved newsletters.
**Trigger**: Cron 3× daily (8am, 12pm, 5pm)
**Social condition**: Content Packages with Publish Status = "Scheduled" AND Publish Date ≤ today
**Newsletter condition**: Newsletter Drafts with Approval Status = "Approved" AND Send Date ≤ today
**Social tool**: Postiz API (multi-platform)
**Newsletter tool**: Kit API (`/v4/broadcasts`)
**Write-back**: Published URLs → Content Packages `published_links` field (JSON per platform)
**Failure handling**: Any platform failure → that platform URL = "FAILED — [reason]", package stays "Scheduled" for retry. Never re-publishes if `published_links` already populated.

## Agent 07 — Analyst
**File**: `agents/07-analyst/analyst.ts`
**Job**: Pull prior week's performance data, log to Analytics, identify top performers, update Knowledge Base.
**Trigger**: Monday cron 9am
**Condition**: Published packages from prior 7 days
**Platform APIs**: Instagram Graph, LinkedIn Marketing, YouTube Data v3, TikTok Display, Facebook Graph, Kit (newsletter)
**Status**: Analytics API functions are stubbed — returns `null` until OAuth credentials configured
**Top performer threshold**: Engagement rate > 2× weekly median
**KB update rule**: Only adds hooks scoring above threshold, no duplicates, references specific Cre8te content

## Agent 08 — Research Scout
**File**: `agents/08-research-scout/scout.ts`
**Job**: Surface creator economy intelligence from web, LinkedIn, Instagram, TikTok. Score and write to Research Intelligence table.
**Trigger**: Daily cron 5am (standard), Sunday 6am (deep scan)
**Sources**: Perplexity Sonar (web/news), Apify LinkedIn/Instagram/TikTok scrapers
**Scoring**: Relevance×0.4 + Novelty×0.3 + Actionability×0.3 (Claude-scored, 1-10 each)
**Threshold**: Only writes items scoring ≥ 7.0; flags ≥ 8.5 as Priority
**Use case tags**: Content Idea, Newsletter Story, Workshop Signal, Platform Update, AI Tool, Industry News
**Dedup**: URL-based; skips items already in table from past 14 days
**Downstream**: Agent 03 reads "Content Idea" tagged items; Agent 05 reads "Newsletter Story" items; human reads "Workshop Signal" items monthly for IRL workshop planning

## Agent 09 — Testing Agent
**File**: `agents/09-testing-agent/testing-agent.ts`
**Job**: Run all test suites, write results to Coda, email PM.
**Triggers**: Daily 3am (health checks only), Sunday 4am (full regression)
**Test tiers**: Tier 1 (per-agent health checks), Tier 2 (integration), Tier 3 (full pipeline smoke)
**Health score**: assertions_passed / total_assertions × 100
**Daily email**: Only on failure. Subject line signals pass/fail.
**Weekly email**: Always sends. Includes 7-day trend, phase status, credentials checklist.
**Email fallback**: Kit API → SendGrid → stdout
**Coda write**: Writes every run to Test Results table (grid-hyU-mpiIb8)

---

## Content Source Priority

When generating content or selecting hero stories, prioritize sources in this order:
1. **Cre8te Summit Recordings** — highest authority, richest material
2. **Mini Pod Episodes** — regular cadence, interview depth
3. **Testimonials** — community voice, story-driven
4. **ITL Engagements** — live community moments

## Brand Voice Rules

- Inspirational and community-first — always
- Specific over generic: quote real moments, real speakers, real names
- Warm and direct — like a trusted friend who knows everything
- Never corporate, never hustle-bro, never generic AI tone
- Preserve speaker's exact language and phrasing wherever possible

## Human Gate Policy

| Gate | Coda view | Status field | Next agent triggered |
|---|---|---|---|
| Content Ideas approval | 🟡 Pending Approval | Content Ideas → Approval Status = "Approved" | Agent 04 (Writer) |
| Newsletter approval | 📰 Newsletter Review | Newsletter Drafts → Approval Status = "Approved" | Agent 06 (Publisher, newsletter) |

**Rule**: No agent publishes or sends anything without the corresponding Coda approval status being set by the human approver.
