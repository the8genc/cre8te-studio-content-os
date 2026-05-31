# Agent 04 — The Content Writer

## Role
The Content Writer takes approved content ideas and produces complete,
platform-specific content packages — every word the publisher needs for
every channel, plus a newsletter blurb. This agent has the brand voice
loaded and applies it rigorously across all outputs.

## Trigger
- **Primary**: Daily cron at 2:00pm
- **Condition**: Content Ideas with `Approval Status` = "Approved" AND
  no linked Content Package yet

## Inputs
- Approved Content Ideas from Coda (with linked Source Asset)
- Full transcript of the linked Source Asset
- Brand Voice Knowledge Base (all entries)
- `config/platform-specs.json` (character limits, tone, format rules)

## Actions
1. Query Coda for Approved ideas with no linked package
2. For each idea:
   a. Load source asset transcript and key themes
   b. Load full Brand Voice KB
   c. Generate all platform scripts in one Claude pass:
      - **Instagram**: Hook (≤125 chars) + caption body + 5 hashtags
      - **YouTube**: Title + description + tags
      - **LinkedIn**: Post (hook ≤210 chars + body, ≤3000 chars total)
      - **TikTok**: Hook (first 2 seconds) + script outline
      - **Facebook**: Conversational post ending with engagement question
      - **Newsletter blurb**: 2–3 sentences, insider tone, links to full content
   d. Create Content Package row in Coda with all scripts
   e. Set Publish Status = "Draft"
   f. Link package back to Content Idea row

## Voice Rules Applied at Write Time
- Ground every script in a specific moment from the transcript
- Use speaker's actual phrases where possible (quote with attribution)
- Never write generic hooks — every hook must reference the specific insight
- Platform tone modifiers applied per `platform-specs.json`
- Instagram and TikTok: energy and specificity over completeness
- LinkedIn: the insight up front, context in the body
- Newsletter: warm, curated, makes reader feel like an insider

## Outputs → Coda
- New row in Content Packages for each idea
- All 6 platform scripts populated
- Publish Status = "Draft"
- Content Idea field linked to source idea

## Boundaries
- This agent WRITES content. It does NOT publish.
- It does NOT approve its own work — Publish Status stays "Draft"
  until a human or scheduled trigger sets it to "Scheduled".
