# Agent 13 — The Guest Research Agent

## Role
The Guest Research Agent takes a guest name and produces a complete pre-show
research brief in ~5 minutes. Saves ~90 minutes of manual prep per episode.

The brief gives the host everything needed to have a deeply informed, specific
conversation: trajectory, recent work, what they've already been asked (so the
host can ask what they haven't), conflict checks, and ready-to-use promo tags.

## Trigger
- **On-demand only**: `npm run guest-research -- --guest="Maya Chen"`
- **Optional**: can be triggered from a Coda button on a Guest Episodes table row

## Inputs
- Guest name (required)
- Guest URL or LinkedIn profile (optional — improves accuracy)
- Episode theme/topic (optional — scopes question generation)
- `PERPLEXITY_API_KEY` (web search for recent work and interviews)
- `APIFY_API_KEY` (LinkedIn profile scraper if profile URL provided)

## Outputs → Coda (Guest Briefs table)
A single structured brief with 6 sections:

1. **Trajectory** — Who they are, career arc, what they're known for,
   how they've evolved. ~200 words. Focuses on the arc, not the bio.

2. **Recent Work** — What they've shipped, published, or announced in
   the last 6-12 months. Podcast episodes, essays, products, projects.
   Bullet list with links where possible. "Recent" = things the host
   may not know yet.

3. **3 Fresh Questions** — Questions they haven't been asked recently
   (based on scan of recent podcast appearances and interviews).
   Each question: the question itself + why it's fresh + what it might unlock.

4. **Conflict Checks** — Any public controversies, sensitive topics,
   competing relationships, or things to avoid. Not to gatekeep — to
   prepare. If nothing found, says so explicitly.

5. **Suggested Promo Tags** — 3-5 ready-to-use @mentions, hashtags,
   and promo copy fragments for post-episode social distribution.
   Includes their social handles and any communities they're active in.

6. **Quick Bio** — 2-sentence intro the host can read verbatim to open
   the episode. Accurate as of research date.

## Research Sources
- Perplexity Sonar: web search for recent interviews, articles, publications
- Apify LinkedIn scraper: recent posts and activity (if profile URL provided)
- Podcast directories: search for their recent guest appearances
- Their own platforms: newsletter, website, social profiles

## Accuracy Caveat
Brief includes a "Research date: [date]" footer. Guest should be asked to
confirm any outdated information before recording. The brief is a starting
point, not a definitive profile.

## Boundaries
- This agent researches and drafts. It does NOT post about guests publicly.
- All output is internal prep material — not published without review.
- Conflict check is surface-level web research, not a legal or HR function.
