# Coda Doc Snapshot — "Cre8te Studio OS"

> **Doc ID:** `ktMUNdlobR` · **Pulled:** 2026-06-06 via Coda MCP
> Point-in-time export of the live Coda doc this repo writes to. The live doc is the
> source of truth — regenerate this file rather than editing it by hand.
> The **🔄 Sync Log** at the bottom is appended automatically by `lib/sync.ts`
> every time an agent writes to Coda (also mirrored to ZeroDB, session `cre8te-coda-sync`).
> Table/column IDs are canonical in [`context/CODA-SCHEMA.md`](../context/CODA-SCHEMA.md)
> and [`config/coda-schema.json`](../config/coda-schema.json).

**Pages (7):**

1. Cre8te Studio OS (home — empty canvas)
2. 📊 Content OS Tables — *All 6 data tables powering the Cre8te Studio Content OS*
3. 🗺️ Development Plan — *9-week build plan*
4. ⚙️ Dev History — *Git commit log, auto-updated*
5. 🔍 Research Intelligence — *Scored intelligence from web + social*
6. 🧪 Test Results — *Automated test run history (Testing Agent)*
7. 🎙️ Podcast Operations — *Editorial packages, sponsor reports, guest briefs*

---

## 📊 Content OS Tables (page `section-a1LLgqYFfX`)

### Source Assets (`grid-_OYt6Tiix6`) — 0 rows

| Column | Type |
|---|---|
| Asset Name (display) | Text |
| Source Type | Select: Summit Recording, Mini Pod, Testimonial, ITL Engagement |
| Speaker / Guest | Text |
| Raw File URL | Link |
| Date Captured | Date |
| Transcription Status | Select: Pending, In Progress, Complete |
| Transcript | Text |
| Key Themes | Text |
| Processed | Checkbox |

### Content Ideas (`grid-dL_d_C7-B_`) — 0 rows

| Column | Type |
|---|---|
| Content Angle (display) | Text |
| Source Asset | Lookup → Source Assets |
| Platform Targets | Multi-select: Instagram, YouTube, LinkedIn, TikTok, Facebook, Newsletter |
| Content Type | Select: Clip, Quote, Story, Article, Short, Carousel |
| Approval Status | Select: Pending, Approved, Rejected, Revision Needed |
| Approver Notes | Text |
| Approved Date | Date |

Views: **🟡 Pending Approval** (`Approval Status = "Pending"`), **✅ Approved This Week** (`Approval Status = "Approved"`)

### Content Packages (`grid-Tdc2ZycQ_i`) — 0 rows

| Column | Type |
|---|---|
| Package Title (display) | Text |
| Content Idea | Lookup → Content Ideas |
| Instagram Script / YouTube Script / LinkedIn Post / TikTok Script / Facebook Post / Newsletter Blurb | Text |
| Publish Status | Select: Draft, Scheduled, Published |
| Publish Date | Date |
| Published Links | Text |

### Newsletter Drafts (`grid-B1Ztf-NOaP`) — 0 rows

| Column | Type |
|---|---|
| Subject Line (display) | Text |
| Week Of | Date |
| Hero Story | Lookup → Content Packages |
| Supporting Items | Lookup (multi) → Content Packages |
| Full Draft | Text |
| Approval Status | Select: Pending, Approved, Sent |
| Send Date | Date |

Views: **📰 Newsletter Review** (`Approval Status = "Pending"`)

### Analytics Log (`grid-mfuhm3UCSP`) — 1 row (empty placeholder)

| Column | Type |
|---|---|
| Log Entry (display) | Text |
| Content Package | Lookup → Content Packages |
| Platform | Select: Instagram, YouTube, LinkedIn, TikTok, Facebook, Newsletter |
| Views / Reach | Number |
| Engagement Rate | Percent |
| Top Comment | Text |
| Logged Date | Date |

### Brand Voice Knowledge Base (`grid-x2d3b0GQx4`) — 0 rows

| Column | Type |
|---|---|
| Entry Title (display) | Text |
| Content Type | Select: Transcript, Phrase, Principle, Hook, Story |
| Content | Text |
| Source | Text |
| Tags | Text |

---

## 🗺️ Development Plan (page `section-NGmIQAw9QL`)

### 🎯 Mission

An always-on AI content operating system that turns Cre8te Summit recordings, mini pods, testimonials, and ITL sessions into a continuous stream of community-first content across Instagram, YouTube, LinkedIn, TikTok, Facebook, and a weekly email newsletter — with a single human approver as the quality gate.

### 🔁 The Core Loop

**Ingest Raw Content → Transcribe & Index → Extract Insights → Generate Content Packages → Coda Approval Gate → Publish to All Platforms → Weekly Newsletter Digest → Analytics Log → Loop**

### 🤖 The 7 Agents

| # | Agent | Job | Trigger |
|---|---|---|---|
| 1 | **The Ingester** | Scans Drive/Dropbox for new files, registers in Coda | Daily cron |
| 2 | **The Transcriber** | Converts video/audio to transcript + extracts key themes | New asset in Coda |
| 3 | **The Content Strategist** | Identifies 5–8 content angles per asset, writes to Content Ideas | Asset processed |
| 4 | **The Content Writer** | Generates full platform-specific packages for approved ideas | Idea approved in Coda |
| 5 | **The Newsletter Editor** | Assembles weekly digest from that week's content packages | Thursday cron |
| 6 | **The Publisher** | Posts to all platforms + sends newsletter | Content scheduled / Newsletter approved |
| 7 | **The Analyst** | Pulls analytics, logs performance, updates Knowledge Base | Monday cron |

### 🗄️ The 6 Coda Tables

| Table | Purpose | Key Gate |
|---|---|---|
| **Source Assets** | Raw file registry with transcripts | Processed checkbox |
| **Content Ideas** | AI-generated angles awaiting approval | 🟡 Pending / ✅ Approved / ❌ Rejected / 🔁 Revision |
| **Content Packages** | Full platform-specific scripts | Draft → Scheduled → Published |
| **Newsletter Drafts** | Weekly digest builds | Pending → Approved → Sent |
| **Analytics Log** | Post-publish performance data | — |
| **Brand Voice KB** | Transcripts, phrases, hooks, principles | — |

### 📅 Phase 1: Foundation (Weeks 1–2)

**Goal:** Get the data infrastructure and first agent working end-to-end.

- [ ] Set up Google Drive / Dropbox folder structure for each source type (Summit / Mini Pod / Testimonial / ITL)
- [ ] Configure Coda doc with all 6 tables and approval views
- [ ] Configure **Fireflies API** (`uploadAudio` mutation) as primary transcription engine — replaces n8n/Groq/Whisper
- [ ] Write CLAUDE.md manager briefing
- [ ] Build and test **Agent 2 (Transcriber)** on 2 Summit recordings via Fireflies API
- [ ] Populate Brand Voice Knowledge Base with 10+ entries from first transcripts
- [ ] Validate Fireflies NLP output (speaker labels, keywords, action items) feeding into Agent 3 pre-extraction
- [ ] Validate transcript write-back to Coda Source Assets table

### 📅 Phase 2: Content Generation (Weeks 3–4)

**Goal:** Build the idea factory and human approval loop.

- [ ] Build and test **Agent 3 (Content Strategist)** — target 5–8 ideas per asset
- [ ] Configure approval views in Coda (Pending / Approved / Revision tabs)
- [ ] Build and test **Agent 4 (Content Writer)** — all 5 platform formats + newsletter blurb
- [ ] QA run: 10 ideas through full approve → write cycle
- [ ] Validate deduplication logic (no repeat angles across assets)
- [ ] Test revision loop: Approver Notes → Agent rewrites → re-approval

### 📅 Phase 3: Publishing (Weeks 5–6)

**Goal:** Close the loop from approved content to live posts.

- [ ] Connect Postiz MCP for social publishing (Instagram, YouTube, LinkedIn, TikTok, Facebook)
- [ ] Connect Kit MCP for newsletter email delivery
- [ ] Build and test **Agent 6 (Publisher)** for social posts
- [ ] Build and test **Agent 5 (Newsletter Editor)** — weekly digest assembly
- [ ] Build Newsletter approval view in Coda
- [ ] End-to-end test: one full week from Summit clip → published posts + newsletter
- [ ] Confirm Published Links write-back to Content Packages table

### 📅 Phase 4: Intelligence Loop (Weeks 7–8)

**Goal:** Make the system smarter every week.

- [ ] Build **Agent 7 (Analyst + Knowledge Updater)**
- [ ] Connect analytics APIs per platform
- [ ] Validate Knowledge Base update loop (high-performing hooks → KB)
- [ ] Build **Agent 1 (Ingester)** with daily cron trigger
- [ ] Build Full Pipeline Skill (meta-orchestrator chains all 7 agents)
- [ ] Run first fully autonomous week with single-approver oversight
- [ ] Document what tuning is needed after live run

### 📅 Phase 5: Skill Packaging (Week 9)

**Goal:** Abstract the system into reusable Skills for future builds.

- [ ] Document all 7 agent `.md` skill files
- [ ] Build the PRD Generator Skill (meta-skill for creating systems like this one)
- [ ] Retrospective: what worked, what to tune, what to add
- [ ] Version 1.0 sign-off

### 🛠️ Tech Stack

| Component | Tool | Role |
|---|---|---|
| Agent runtime | Claude Code (Cowork) | Session manager + agent executor |
| Data hub | **Coda** | All tables, approval gates, status tracking |
| Transcription — meetings & calls | Fireflies MCP (already connected) | ITL sessions, mini pod Zoom calls, live meetings → transcript + speaker labels → Coda. Agent 2 calls directly, no middleware. |
| Raw storage | Google Drive / Dropbox | Source file storage |
| Social publishing | Postiz MCP | Multi-platform scheduling + posting |
| Email / Newsletter | Kit MCP | Weekly digest delivery |
| Scheduling | Cron (Claude Code) | Automated pipeline triggers |
| Voice knowledge | Coda Brand Voice KB table | Transcripts, phrases, principles |
| Transcription — video files | Fireflies uploadAudio API | Summit recordings, pre-recorded files → Drive/Dropbox URL posted to Fireflies → transcript + NLP extraction + speaker labels → Coda |
| Editor transcription (DaVinci) | AutoSubs fork — github.com/tmoroney/auto-subs | One-button inside DaVinci Resolve → local Whisper transcription + speaker diarization → SRT + transcript pushed to Coda Source Assets. Fork adds Coda write-back hook. |
| Resolve automation bridge | davinci-resolve-mcp — github.com/samuelgursky/davinci-resolve-mcp | 440+ tool MCP server exposing full DaVinci Resolve scripting API to Claude. Enables Agent 1 to trigger renders, manage media pool, and export audio for Fireflies upload. Requires Resolve Studio. |
| Resolve bridge (free fallback) | hiteshK03/davinci-resolve-mcp | Free DaVinci Resolve compatible bridge (no Studio license needed). Runs inside Resolve via Scripts menu. 155 tools + local Whisper transcription. |
| Semantic archive search | StoryToolkitAI — github.com/octimot/StoryToolkitAI | Phase 4 addition. Whisper transcription + semantic search across full Summit archive. |

> ℹ️ **Every update to this plan gets written directly into this Coda document.** When architecture changes, agent designs evolve, or new decisions are made, this page is the source of truth.

### 🔗 GitHub Repositories (fork into the Cre8te Studio org)

1. **AutoSubs** — [tmoroney/auto-subs](https://github.com/tmoroney/auto-subs) — DaVinci Resolve transcription plugin. Fork adds a Coda write-back hook (POST to Source Assets at end of transcription job). Use v3.5.3+ for Resolve 20.x.
2. **DaVinci Resolve MCP** — [samuelgursky/davinci-resolve-mcp](https://github.com/samuelgursky/davinci-resolve-mcp) — full Resolve API bridge for Claude (440+ tools). Requires Resolve Studio, Python 3.10–3.12.
3. **StoryToolkitAI** — [octimot/StoryToolkitAI](https://github.com/octimot/StoryToolkitAI) — Whisper transcription + semantic search across Summit transcripts. Optional Phase 4 layer.
4. **hiteshK03/davinci-resolve-mcp** — [hiteshK03/davinci-resolve-mcp](https://github.com/hiteshK03/davinci-resolve-mcp) — free-version Resolve bridge (no Studio license; 155 tools, local Whisper).

**Fork priority order:**

| Priority | Repo | When to Fork | Why |
|---|---|---|---|
| 🔴 P1 | tmoroney/auto-subs | Week 1 | Core editor transcription workflow |
| 🔴 P1 | samuelgursky/davinci-resolve-mcp | Week 1 | Claude ↔ Resolve bridge for automation |
| 🟡 P2 | hiteshK03/davinci-resolve-mcp | Week 2 | Free Resolve fallback if no Studio license |
| 🟢 P3 | octimot/StoryToolkitAI | Phase 4 | Semantic search as archive grows |

---

## ⚙️ Dev History (page `section-KejncWzR6X`, table `grid-hYm6ozqbK9`) — 13 rows

| Date | Commit | Phase | Files | Summary | Status |
|---|---|---|---|---|---|
| 2025-05-30 18:00 | [341468b](https://github.com/the8genc/cre8te-studio-content-os/commit/341468bcf544202faf8ccfa3d00faa1fe435c882) | Phase 1 | 3 | init: project README, CLAUDE.md manager briefing, and .env.example | ✅ Merged |
| 2025-05-30 18:15 | [2998bcc](https://github.com/the8genc/cre8te-studio-content-os/commit/2998bcc15683a0bfff05a481bc4317051d450206) | Phase 1 | 20 | feat: all 7 agent files, 8 skills, config schemas, DaVinci docs | ✅ Merged |
| 2025-05-30 19:00 | [9d1a623](https://github.com/the8genc/cre8te-studio-content-os/commit/9d1a623f9909407158c5e6e14511e4f2b94a3aa9) | Phase 1 | 6 | feat: Agent 08 Research Scout — creator economy intelligence layer | ✅ Merged |
| 2025-05-30 20:00 | [repo](https://github.com/the8genc/cre8te-studio-content-os) | Infrastructure | 14 | refactor: convert all agent code to TypeScript/Node; secret management (PAT with workflow scope needed) | ⚠️ Needs Review |
| 2025-05-30 20:15 | [0a8154e](https://github.com/the8genc/cre8te-studio-content-os/commit/0a8154e) | Infrastructure | 1 | ci: GitHub Actions daily pipeline live | ✅ Merged |
| 2025-05-30 20:30 | [aaa0df1](https://github.com/the8genc/cre8te-studio-content-os/commit/aaa0df1) | Phase 1 | 9 | feat: complete all 8 agent implementations in TypeScript | ✅ Merged |
| 2025-05-30 21:30 | [840b01d](https://github.com/the8genc/cre8te-studio-content-os/commit/840b01d) | Phase 2 | 9 | test: Phase 2 test suite — 4/4 agent tests passing, 28/28 assertions | ✅ Merged |
| 2026-05-31 09:00 | [708ec2c](https://github.com/the8genc/cre8te-studio-content-os/commit/708ec2c) | Phase 2 | 11 | feat: Phase 2 complete + Phase 3 publisher + Agent 09 Testing Agent (7/7 suites, 94 assertions, 100/100 health) | ✅ Merged |
| 2026-05-31 10:00 | [50cf868](https://github.com/the8genc/ai-8gent-skills/commit/50cf868) | Phase 5 | 14 | feat: AI 8gent Skills repo created — agentic-platform-builder skill | ✅ Merged |
| 2026-05-31 10:30 | [e991e3b](https://github.com/the8genc/cre8te-studio-content-os/commit/e991e3b) | Infrastructure | 7 | docs: add context/ — LLM-agnostic project state | ✅ Merged |
| 2026-05-31 10:45 | [df4f57a](https://github.com/the8genc/ai-8gent-skills/commit/df4f57a) | Phase 5 | 8 | refactor: ai-8gent-skills made stateless — project context lives in each repo | ✅ Merged |
| 2026-05-31 11:30 | [b3a3104](https://github.com/the8genc/cre8te-studio-content-os/commit/b3a3104) | Phase 2 | 9 | feat: incorporate LinkedIn Content Playbook (Smithwrick) into Agents 03/04/05/07 | ✅ Merged |
| 2026-05-31 13:00 | [52ad66c](https://github.com/the8genc/cre8te-studio-content-os/commit/52ad66c) | Phase 1 | 18 | feat: Agents 11/12/13 — editorial, sponsor, guest research; new Podcast Operations tables (8/8 suites, 113 assertions) | ✅ Merged |

---

## 🔍 Research Intelligence (page `section-yJpnhC6zG_`, table `grid-o4Al5g9Kxs`) — 0 rows

| Column | Type |
|---|---|
| Item Title (display) | Text |
| Source URL | Link |
| Source Type | Select: Web/News, Social |
| Platform | Select: LinkedIn, Instagram, TikTok, Web/News |
| Summary / Raw Excerpt | Text |
| Relevance Score / Novelty Score / Actionability Score / Final Score | Number (1 dp) |
| Use Case Tags | Multi-select: Content Idea, Newsletter Story, Workshop Signal, Platform Update, AI Tool, Industry News |
| Priority Flag | Checkbox |
| Date Scouted | Date |
| Used By | Text |

Views: **🔴 Priority Items** (`Priority Flag = true`, sorted by Final Score desc), **📊 Workshop Signals**, **📰 Newsletter Stories**

---

## 🧪 Test Results (page `section-bdCy3SdJRJ`, table `grid-hyU-mpiIb8`) — 1 row

| Column | Type |
|---|---|
| Run ID (display) | Link |
| Date | DateTime |
| Mode | Select: daily, weekly, post-deploy, manual |
| Health Score / Passed / Failed / Duration (s) | Number |
| Summary | Text |
| Status | Select: All Passing, Failures Detected |

Latest run — 2026-05-31 09:00, mode `manual`, **health 100/100**, 7 passed / 0 failed, 10s, Status: All Passing:

> ✅ Research Scout · ✅ Content Strategist · ✅ Content Writer · ✅ Newsletter Editor · ✅ Publisher · ✅ Approval Loop (Phase 2) · ✅ Full Pipeline Smoke

---

## 🎙️ Podcast Operations (page `section-r2qEheAcB3`) — all tables 0 rows

### Editorial Packages (`grid-EAyQNcryhX`)

Episode Title (display) · Source Asset (lookup → Source Assets) · In-Voice Open · Pull Quote 1 · Pull Quote 2 · From the Conversation · Social Clip Moments · Spill Thread · Substack Cut · Status (Ready for Edit / In Review / Published) · Created At

### Sponsor Deals (`grid-thI0WD39Ke`)

Partner Name (display) · UTM Prefix · Deal Terms · Contact Email · Status (Active / Completed / Negotiating) · Attribution Window (days) · Deal Start · Deal End

### Sponsor Reports (`grid-ULAXcWJZRS`)

Report Title (display) · Report Type (Weekly Internal Digest / Monthly Partner Report) · Period End · Partner Name · Content · Status (Ready for Review / Needs Human Review / Delivered / Sent to Partner)

### Guest Briefs (`grid-OJx4KZP3Qu`)

Guest Name (display) · Episode Topic · Guest URL · Trajectory · Recent Work · Fresh Questions · Conflict Checks · Promo Tags · Quick Bio · Status (Ready for Review / Approved / Episode Recorded) · Research Date

---

## 🔄 Sync Log (auto-generated — newest first)

| Timestamp (UTC) | Agent | Table | Action | Details |
|---|---|---|---|---|
