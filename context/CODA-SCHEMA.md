# Coda Schema Reference

**Document**: https://coda.io/d/_dktMUNdlobR
**Doc ID**: `ktMUNdlobR`

All Coda table IDs and column IDs are also in `config/coda-schema.json`.
This file is the human-readable reference. Use `config/coda-schema.json` in code.

---

## Table Index

| Table | Table ID | Page | Purpose |
|---|---|---|---|
| Source Assets | `grid-_OYt6Tiix6` | 📊 Content OS Tables | Raw files entering the pipeline |
| Content Ideas | `grid-dL_d_C7-B_` | 📊 Content OS Tables | Agent-generated angles awaiting approval |
| Content Packages | `grid-Tdc2ZycQ_i` | 📊 Content OS Tables | Final platform scripts |
| Newsletter Drafts | `grid-B1Ztf-NOaP` | 📊 Content OS Tables | Weekly digest builds |
| Analytics Log | `grid-mfuhm3UCSP` | 📊 Content OS Tables | Post-publish performance |
| Brand Voice KB | `grid-x2d3b0GQx4` | 📊 Content OS Tables | Accumulated voice learnings |
| Research Intelligence | `grid-o4Al5g9Kxs` | 🔍 Research Intelligence | Scout output, scored and tagged |
| Test Results | `grid-hyU-mpiIb8` | 🧪 Test Results | Testing Agent run history |
| Dev History | `grid-hYm6ozqbK9` | ⚙️ Dev History | Git commit log |

---

## Source Assets (`grid-_OYt6Tiix6`)

| Column | ID | Type | Values |
|---|---|---|---|
| Asset Name | `c-exr99MOr1E` | Text (display) | Filename without extension |
| Source Type | `c-xnbJyz02A3` | Select | Summit Recording, Mini Pod, Testimonial, ITL Engagement |
| Speaker / Guest | `c-F81yd6um8G` | Text | Parsed from filename or manual |
| Raw File URL | `c-1o4YGF8Ov4` | Link | Google Drive direct download URL |
| Date Captured | `c-SoghuKkr2r` | Date | Recording date |
| Transcription Status | `c-BRN4p-Xq0A` | Select | Pending → In Progress → Complete / Error |
| Transcript | `c-FFKyvivHkc` | Text | Full verbatim transcript with speaker labels |
| Key Themes | `c-RdZqJeJu_D` | Text | Comma-separated keywords + overview |
| Processed | `c-6hFNqbKizF` | Checkbox | true when transcript + themes complete |

---

## Content Ideas (`grid-dL_d_C7-B_`)

| Column | ID | Type | Values |
|---|---|---|---|
| Content Angle | `c-Wr_pQlM6L6` | Text (display) | Hook + description (2 sentences) |
| Source Asset | `c-R1libvZGYP` | Lookup → Source Assets | Row ID |
| Platform Targets | `c-GtMk_i-aaI` | Multi-select | Instagram, YouTube, LinkedIn, TikTok, Facebook, Newsletter |
| Content Type | `c-sYkxbAJAKQ` | Select | Clip, Quote, Story, Article, Short, Carousel |
| Approval Status | `c-dcjrrahkRo` | Select | **Pending** → Approved / Rejected / Revision Needed |
| Approver Notes | `c-tu_CzYn-d2` | Text | Revision instructions from approver |
| Approved Date | `c-8y_6CIOk82` | Date | Set when approved |

**Approval views**:
- `v-4Bso6TzTRl` — 🟡 Pending Approval (filtered: Approval Status = Pending)
- `v-KUcmtM6Ote` — ✅ Approved This Week (filtered: Approval Status = Approved)

---

## Content Packages (`grid-Tdc2ZycQ_i`)

| Column | ID | Type | Values |
|---|---|---|---|
| Package Title | `c-ffCRcdq3pT` | Text (display) | Internal reference name |
| Content Idea | `c-twJdjmRAU2` | Lookup → Content Ideas | Row ID |
| Instagram Script | `c-TInW5nyACp` | Text | Hook (≤125 chars) + body + hashtags |
| YouTube Script | `c-BNJc8IJU-P` | Text | Title + description + tags |
| LinkedIn Post | `c-hYMJUeVBEk` | Text | Post with hook ≤210 chars |
| TikTok Script | `c-5WMSD0wUSJ` | Text | Hook (0–2s) + script outline + caption |
| Facebook Post | `c-FFYuN4IRAJ` | Text | Conversational post with engagement question |
| Newsletter Blurb | `c-_RD6XvxX-6` | Text | 2–3 sentence warm insider blurb |
| Publish Status | `c-PCnlMeVenn` | Select | Draft → Scheduled → **Published** |
| Publish Date | `c-XDYnysbsQK` | Date | When to go live |
| Published Links | `c-yHhMF-AqXl` | Text | JSON: `{"Instagram": "url", "LinkedIn": "url", ...}` |

---

## Newsletter Drafts (`grid-B1Ztf-NOaP`)

| Column | ID | Type | Values |
|---|---|---|---|
| Subject Line | `c-L9erMWj_Jh` | Text (display) | ≤60 chars |
| Week Of | `c-x3YqtHTOlf` | Date | Monday of the week |
| Hero Story | `c-oShsem4Qp_` | Lookup → Content Packages | Featured package |
| Supporting Items | `c-0N9Iz02boc` | Multi-lookup → Content Packages | 3–5 packages |
| Full Draft | `c-DaGrbbuSSE` | Text | Complete newsletter text |
| Approval Status | `c-dgF510VS-k` | Select | Pending → **Approved** → Sent |
| Send Date | `c-BD78_ZhCDo` | Date | Friday of that week |

**Approval view**: `v-LiGTxZvEgQ` — 📰 Newsletter Review (filtered: Approval Status = Pending)

---

## Analytics Log (`grid-mfuhm3UCSP`)

| Column | ID | Type |
|---|---|---|
| Log Entry | `c-K8bNlT2W_x` | Text (display) |
| Content Package | `c-uj4Qhbjo0N` | Lookup → Content Packages |
| Platform | `c-_T21J3GbTe` | Select |
| Views / Reach | `c-jThK5zdEww` | Number |
| Engagement Rate | `c-jIJAu61W4R` | Percentage |
| Top Comment | `c-D9-bzmVDN4` | Text |
| Logged Date | `c-4u11CcoNai` | Date |

---

## Brand Voice KB (`grid-x2d3b0GQx4`)

| Column | ID | Type | Values |
|---|---|---|---|
| Entry Title | `c-k1evaVpQxr` | Text (display) | |
| Content Type | `c-gPou71d0zK` | Select | Transcript, Phrase, Principle, Hook, Story |
| Content | `c-5VeoKd-l40` | Text | The actual voice material |
| Source | `c-vEurZMggXh` | Text | Where it came from |
| Tags | `c-fClv8exiV5` | Text | Searchable topic tags |

---

## Research Intelligence (`grid-o4Al5g9Kxs`)

| Column | ID | Type | Values |
|---|---|---|---|
| Item Title | `c-mUWVfq_Kqf` | Text (display) | |
| Source URL | `c-yRM-9UhtUt` | Link | |
| Source Type | `c-BHlWVLJ2ZW` | Select | Web/News, Social |
| Platform | `c-paOOOb2Z1B` | Select | LinkedIn, Instagram, TikTok, Web/News |
| Summary | `c-d5Cx7WbM6M` | Text | 2-sentence Claude synthesis |
| Raw Excerpt | `c-6ap0yMsJsr` | Text | ≤500 chars of original |
| Relevance Score | `c-w_9cc6gjtL` | Number (1–10) | |
| Novelty Score | `c-mi9diZdoog` | Number (1–10) | |
| Actionability Score | `c-7RLl_dzOAk` | Number (1–10) | |
| Final Score | `c-Ce9HbYJXaM` | Number (1–10) | Weighted: R×0.4 + N×0.3 + A×0.3 |
| Use Case Tags | `c-PWU82W552A` | Multi-select | Content Idea, Newsletter Story, Workshop Signal, Platform Update, AI Tool, Industry News |
| Priority Flag | `c-ZShoFyoPPL` | Checkbox | true if Final Score ≥ 8.5 |
| Date Scouted | `c-zuMaYhogtL` | Date | |
| Used By | `c-ZyQo_yfQ8O` | Text | Which packages/newsletters cited this |

**Views**: 🔴 Priority Items, 📊 Workshop Signals, 📰 Newsletter Stories

---

## Test Results (`grid-hyU-mpiIb8`)

| Column | ID | Type |
|---|---|---|
| Run ID | `c-QdqsmiyE2n` | Link (display) |
| Date | `c-26qtYs8lWZ` | DateTime |
| Mode | `c-ZW6JjuiElI` | Select: daily, weekly, post-deploy, manual |
| Health Score | `c-B_cYnPX_2F` | Number (0–100) |
| Passed | `c-Y8GW-jFnHS` | Number |
| Failed | `c-NEufNLPXHB` | Number |
| Duration (s) | `c-2xfR1gGaW4` | Number |
| Summary | `c-ESTsKCJKiN` | Text |
| Status | `c--AvkEypwp8` | Select: All Passing, Failures Detected |

---

## Dev History (`grid-hYm6ozqbK9`)

| Column | ID | Type |
|---|---|---|
| Commit SHA | `c-NrdYU7foTR` | Link (display) |
| Date | `c-7h8jjAqwJY` | DateTime |
| Author | `c-PZvT8JxPXS` | Text |
| Phase | `c-4t-IY4uYbY` | Select |
| Files Changed | `c-nLcqipymWQ` | Number |
| Summary | `c-285BgW9DBm` | Text |
| Files Affected | `c-6QC0JI0t1_` | Text |
| Status | `c-2hzbWHi7my` | Select: ✅ Merged, 🔄 In Progress, ⚠️ Needs Review, ❌ Reverted |
