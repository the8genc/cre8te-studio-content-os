# Cre8te Studio Content OS — Manager Briefing

> Read this file at the start of every session, every time.

## Who We Are
Cre8te Studio builds a continuous community engagement platform. Our content
is rooted in real conversations captured at the Cre8te Summit and ongoing
community engagements (mini pods, testimonials, ITL sessions). Every piece
of content should feel like it came from the community — not from a marketing
department.

## Source Content Priority
1. **Cre8te Summit recordings** — highest authority, richest material
2. **Mini pod episodes** — regular cadence, interview-format depth
3. **Testimonials** — community voice, story-driven
4. **ITL (In The Loop) sessions** — live community engagement moments

## Brand Voice Rules
- Inspirational and community-first — always
- Specific over generic: quote real moments, real speakers, real names
- Warm and direct — like a trusted friend who also happens to know everything
- Never corporate, never hustle-bro, never generic AI tone
- Preserve speaker's exact language and phrasing wherever possible

## Platform Tone Modifiers
- **Instagram**: Hook first. Community feel. Reel-friendly pacing.
- **LinkedIn**: Thought leadership. Specific insight. No fluff.
- **TikTok**: Energy. Speed. Unexpected angle first.
- **YouTube**: Depth. Let it breathe. Clear value promise upfront.
- **Facebook**: Community voice. Conversational. Invite response.
- **Newsletter**: Curated and warm. Make the reader feel like an insider.

## Approval Rules — CRITICAL
- NEVER publish without Coda `Approval Status` = "Approved"
- NEVER send newsletter without Coda `Newsletter Approval Status` = "Approved"
- If status is "Revision Needed", read the `Approver Notes` field before rewriting
- If status is "Rejected", log reason and move on — do not retry without new input

## Deduplication Rules
- Check Content Ideas table before creating a new idea from any asset
- Check Knowledge Base before adding a new voice entry
- Check Newsletter Drafts before creating a new draft for the current week
- Similarity threshold: if angle is >70% conceptually similar to existing idea, skip it

## Output Locations
- All content → Coda tables (never local files in production)
- Published URLs → Content Packages table, `Published Links` field
- Analytics → Analytics Log table
- Voice learnings → Brand Voice Knowledge Base table
- Every Coda write is auto-mirrored by `lib/sync.ts` →
  `docs/coda-doc-snapshot.md` (🔄 Sync Log) + ZeroDB memory
  (session `cre8te-coda-sync`). Do not bypass `lib/coda.ts` for writes.

## Coda Configuration
- Doc ID: `ktMUNdlobR`
- Tables: Source Assets, Content Ideas, Content Packages, Newsletter Drafts, Analytics Log, Brand Voice KB
- Approver views: "🟡 Pending Approval", "✅ Approved This Week", "📰 Newsletter Review"

## Cron Schedule
- **Daily 6am**: Agent 1 (Ingester) — scan for new source files
- **Daily 7am**: Agent 2 (Transcriber) — process pending assets
- **Daily 9am**: Agent 3 (Content Strategist) — generate ideas from processed assets
- **Daily 2pm**: Agent 4 (Content Writer) — write packages for approved ideas
- **Thursday 8pm**: Agent 5 (Newsletter Editor) — assemble weekly digest
- **Per schedule**: Agent 6 (Publisher) — post approved content
- **Monday 9am**: Agent 7 (Analyst) — pull last week's analytics

## Agent Chaining
Agents communicate exclusively through Coda table status fields.
No agent calls another agent directly. The cron schedule and status
fields are the only coordination mechanism.

## Error Handling
- Log all errors to Coda with timestamp and agent name
- On API failure: retry once after 60s, then mark asset as "Error" in Coda
- Never silently skip — always leave a status trail in Coda
