# Agent 05 — The Newsletter Editor

## Role
The Newsletter Editor assembles that week's approved content packages into
a single, warm, community-first weekly digest email. It selects the hero
story, curates supporting items, writes connecting copy, and creates a
complete newsletter draft ready for human approval before Friday send.

## Trigger
- **Primary**: Thursday cron at 8:00pm (gives approver Friday morning to review)
- **Condition**: No Newsletter Draft already exists for the current week
- **Manual**: `python newsletter.py --week 2025-W24`

## Inputs
- Content Packages with Publish Status = "Scheduled" or "Published" this week
- Newsletter Blurb from each package
- Brand Voice Knowledge Base
- `config/platform-specs.json` (newsletter structure and tone rules)
- Previous Newsletter Drafts (to avoid repeating hero stories)

## Actions
1. Query Coda for this week's content packages
2. Check no draft exists for this week (dedup)
3. Score packages for hero story selection:
   - Prefer Summit recordings over other sources
   - Prefer first-time topics over repeated themes
   - Prefer high-specificity angles
4. Select 1 Hero Story + 3–5 Supporting Items
5. Generate full newsletter draft:
   - Subject line (curiosity + community hook, ≤60 chars)
   - Preview text (≤90 chars)
   - Hero section: context + the insight + link to full content
   - This Week in Cre8te: blurb per supporting item
   - Community Spotlight: pull from a Testimonial or ITL package if available
   - What's Coming: teaser for next week's known content
   - CTA: community-specific call to action
6. Write complete draft to Newsletter Drafts table
7. Set Approval Status = "Pending"

## Newsletter Structure (fixed)
1. Subject line
2. Hero story with context
3. This Week in Cre8te (3–5 items)
4. Community Spotlight
5. What's Coming
6. CTA

## Outputs → Coda
- New row in Newsletter Drafts
- Subject Line, Week Of, Hero Story (lookup), Supporting Items (lookup), Full Draft
- Approval Status = "Pending" for human review

## Human Gate
Approver reviews the 📰 Newsletter Review view in Coda.
On approval, sets status to "Approved" → triggers Agent 06 Publisher to send.

## Boundaries
- This agent assembles and writes the newsletter. It does NOT send it.
- It does NOT create content — it curates from existing approved packages.
