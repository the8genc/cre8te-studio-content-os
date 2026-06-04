# Agent 11 — The Editorial Agent

## Role
The Editorial Agent ingests a podcast or session transcript and produces a
complete editorial package — all the structured outputs an editor needs to
assemble the newsletter, Substack post, and social distribution in ~1.5 hours
instead of ~6. It works in-voice (Cre8te Studio's warm, community-first tone)
and is explicitly designed to reduce editorial prep time, not replace editorial
judgment.

This agent runs on any Source Asset typed "Mini Pod" or "Summit Recording"
once transcription is complete. It runs in parallel with the Content
Strategist — both read the same transcript, each producing different outputs
for different workflows.

## Why this is separate from Agent 03 (Content Strategist)
The Strategist produces content angles for social packaging (Instagram, LinkedIn,
TikTok hooks). The Editorial Agent produces episodic editorial structure — the
narrative assembly work that drives the newsletter and Substack workflow. These
are different outputs, different consumers, different timing.

## Trigger
- **On-demand**: Manual trigger when episode is ready (`npm run editorial -- --asset-id <id>`)
- **Automatic**: When a Source Asset is processed AND source_type is "Mini Pod"
  (Summit recordings are handled manually due to length)
- **Cron**: Daily 10am — checks for newly processed Mini Pod assets with no editorial package

## Inputs
- Source Asset row (transcript + speaker labels + key themes)
- Brand Voice KB
- Episode metadata: guest name, episode title, episode number (from asset name field)

## Outputs → Coda (Editorial Packages table)
All 7 editorial outputs for a single episode:

1. **In-Voice Open** — The newsletter/email opening section. 150-200 words.
   Written in Cre8te Studio's first-person community voice ("This week we sat
   down with..."). Sets up the episode for someone who hasn't listened yet.

2. **Pull Quote 1** — Best standalone quote from the episode. Includes:
   - Exact quote text (verbatim from transcript)
   - Speaker name
   - Approximate timestamp (derived from sentence position in transcript)
   - Social-ready framing line (1 sentence that contextualizes the quote)

3. **Pull Quote 2** — Second-best quote. Same structure. Chosen for contrast
   with Pull Quote 1 — different topic or tone.

4. **"From the Conversation"** — 300-400 word narrative section for the
   newsletter. Tells the story of the conversation: what was covered, what
   surprised, what the community should take away. Written as editorial prose,
   not a listicle. Links to the full episode.

5. **Social Clip Moments** — 3 specific moments in the transcript that would
   make excellent short-form video clips. For each:
   - Clip title (what to call it)
   - Approximate start/end timestamp
   - Why this moment works as a standalone clip
   - Copy for posting (30-50 words, platform-agnostic hook)

6. **Spill Thread Starter** — A Twitter/X-style thread opener (3-5 posts,
   280 chars each) that teases the episode without giving away the best parts.
   Written to drive podcast listens, not replace them. Community-first tone.

7. **Substack-Native Cut** — A standalone 400-600 word Substack post version.
   Not a summary — a complete piece that works on its own AND drives listeners
   to the full episode. Written in the guest's most quotable voice. Includes
   1 pull quote formatted for Substack display.

## Editorial Timing
- Pull quotes: timestamp is estimated from sentence position in transcript
  (sentence N of M total → estimated minute = N/M × episode_length_minutes)
  Exact timestamps should be verified by editor before publishing.
- Editor expected time: ~1.5 hours reviewing and refining these outputs
  vs ~6 hours building from scratch.

## Quality Rules
- Every output must reference specific moments, quotes, and named concepts
  from the transcript — no generic summaries
- In-Voice Open and From the Conversation must be written in Cre8te Studio's
  voice, not the guest's voice
- Pull quotes must be verbatim — no paraphrasing
- Spill thread must not give away the best insight — it should create curiosity
- Substack cut must work as a standalone piece (no "as I mentioned..." references)

## Boundaries
- This agent produces editorial drafts — not published content
- All outputs require editor review before use
- Does NOT post to any platform
- Does NOT modify Source Assets or Content Ideas tables
