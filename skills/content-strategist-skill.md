---
name: content-strategist-skill
agent: 03-content-strategist
version: 1.0.0
---

# Content Strategist Skill

## Purpose
Read completed transcripts and extract 5–8 specific, distinct content angles
per asset. Write each angle to the Content Ideas table for human approval.

## When to Use
Run after transcription is complete (Source Assets with Processed = true)
and no Content Ideas are yet linked to those assets.

## Angle Extraction Framework

For each transcript, look for these 6 angle types:

### 1. Standout Quotes
A single sentence so good it can anchor a post.
Test: Would someone screenshot this and send it to a friend?

### 2. Frameworks & Models
Any 2-5 step process, named concept, or mental model the speaker shared.
Best for LinkedIn carousels and YouTube explainer content.

### 3. Story Arcs
Challenge → insight → outcome narrative.
Best for Instagram Reels, TikTok, and Newsletter Hero stories.

### 4. Community Moments
Audience reactions, shared admissions, relatable struggles raised in the room.
Best for Facebook community posts and testimonial-style content.

### 5. Contrarian Takes
Something the speaker said that challenges conventional wisdom.
Best for LinkedIn and Twitter/X engagement hooks.

### 6. Practical Takeaways
Specific, actionable advice someone can implement today.
Best for all platforms — high shareability.

## Quality Filters (apply before writing to Coda)
- [ ] Angle references something SPECIFIC from the transcript (quote, moment, name)
- [ ] Angle is distinct from all other angles in this batch (no near-duplicates)
- [ ] Angle is distinct from existing Content Ideas in Coda (dedup check)
- [ ] Platform Targets are realistic for the content format

## Deduplication Rule
If the new angle is >70% conceptually similar to an existing idea
(same speaker + same core insight + same platform), skip it.
Log: "Skipped — similar to [existing idea title]"

## Coda Output Format
For each approved angle, write:
- **Content Angle**: 1–2 sentences describing the specific hook and frame
- **Source Asset**: lookup to the source row
- **Platform Targets**: multi-select (choose 1–4 realistic platforms)
- **Content Type**: Clip / Quote / Story / Article / Short / Carousel
- **Approval Status**: "Pending" (never pre-approve)

## Prompt Template for Claude
```
You are a content strategist for Cre8te Studio — a community-first brand
built on real conversations from the Cre8te Summit.

Read this transcript and extract 5-8 specific content angles.
For each angle, provide:
- angle_title: 1 sentence hook
- angle_description: what makes this specific and compelling
- best_platforms: list of 1-4 platforms
- content_type: Clip | Quote | Story | Article | Short | Carousel
- source_quote: exact words from the transcript that anchor this angle

Rules:
- Every angle must cite a specific moment, quote, or named concept
- No generic angles ("leadership is important")
- Each angle must be meaningfully distinct from the others

Transcript:
[TRANSCRIPT]

Brand Voice KB context:
[KB_ENTRIES]
```
