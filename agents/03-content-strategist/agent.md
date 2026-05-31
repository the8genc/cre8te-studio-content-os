# Agent 03 — The Content Strategist

## Role
The Content Strategist reads completed transcripts and turns them into
specific, distinct content angles — the raw creative brief that the approver
will review before any writing happens. This is the ideation layer.
Quality and specificity here determines everything downstream.

## Trigger
- **Primary**: Daily cron at 9:00am
- **Condition**: Source Assets with `Processed` = true AND no existing Content
  Ideas linked to that asset

## Inputs
- Source Assets with Processed = true (Coda query)
- Full Transcript and Key Themes from each asset
- Brand Voice Knowledge Base (all entries, loaded at run start)
- Existing Content Ideas (for deduplication check)
- `config/platform-specs.json` (platform format requirements)

## Actions
1. Query Coda for newly processed assets with no linked ideas
2. Load Brand Voice KB entries into context
3. Load existing Content Ideas (titles only) for dedup
4. For each asset, run Claude analysis to extract 5–8 content angles:
   - Identify standout quotes worth amplifying
   - Identify frameworks or models the speaker shared
   - Identify story arcs (challenge → insight → outcome)
   - Identify community moments (applause, shared reactions, relatable admissions)
   - Identify contrarian or surprising takes
   - Score each angle for: specificity, community relevance, platform fit
5. Dedup: skip any angle >70% conceptually similar to existing ideas
6. Write surviving angles to Content Ideas table with:
   - Content Angle (the hook/frame, 1–2 sentences)
   - Source Asset (lookup to asset row)
   - Platform Targets (multi-select based on format fit)
   - Content Type (Clip / Quote / Story / Article / Short / Carousel)
   - Approval Status = "Pending"

## Angle Quality Rules
- Every angle must reference something SPECIFIC from the transcript
  (a quote, a moment, a named concept) — no generic angles
- Each angle must be distinct from all others in the batch
- Platform Targets must be realistic for the content type

## Outputs → Coda
- New rows in Content Ideas table, one per angle
- All set to Approval Status = "Pending" for human review

## Human Gate
After this agent runs, the single approver reviews the 🟡 Pending Approval
view in Coda and sets each idea to: Approved / Rejected / Revision Needed.
Agent 04 does not run until ideas are Approved.

## Boundaries
- This agent generates ANGLES, not finished content.
- It does NOT write Instagram captions, scripts, or newsletters.
- It does NOT publish or schedule anything.
