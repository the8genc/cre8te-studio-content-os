---
name: research-scout-skill
agent: 08-research-scout
version: 1.0.0
---

# Research Scout Skill

## Purpose
Surface creator economy intelligence from web, LinkedIn, Instagram, and TikTok.
Score for relevance, novelty, and actionability. Write to Coda Research Intelligence
table. Flag high-priority items for immediate attention.

## When to Use
- Daily at 5:00am (standard run — seeds the day's research context)
- Sunday at 6:00am (deep scan — broader keyword sweep + weekly summary)
- Manually before workshop planning sessions or newsletter assembly

## Data Sources and What They Cover

### Perplexity Sonar (Web/News)
Best for: Press releases, platform announcements, funding news, regulatory updates,
industry publications, structured factual intelligence with citations.
Query: Natural language questions about creator economy topics.
Model: `sonar` for speed, `sonar-pro` for complex multi-source queries.

### Apify LinkedIn Post Scraper
Actor: `curious_coder/linkedin-post-search-scraper`
Best for: Professional discourse, thought leadership trends, skill gap signals,
B2B creator economy conversations, tool recommendations from practitioners.
Input: Search query keyword. Returns public posts only, no login required.

### Apify Instagram Hashtag Scraper
Actor: `apify/instagram-hashtag-scraper`
Best for: Visual creator trends, community conversations, UGC creator culture,
consumer-side creator economy, emerging aesthetics and content formats.
Input: Hashtag without # symbol. Returns public posts.

### Apify TikTok Scraper
Actor: `clockworks/tiktok-scraper`
Best for: Trending formats, viral content patterns, Gen Z creator culture,
fast-moving trends before they hit other platforms, sound/effect trends.
Input: Hashtag. Returns public content. Use residential proxies via Apify.

## Scoring System

All items scored 1-10 on:
- **Relevance** (weight: 40%): Direct connection to Cre8te's community of creators
- **Novelty** (weight: 30%): New information vs. already-known background
- **Actionability** (weight: 30%): Leads to a specific content angle, workshop topic, or story

**Final score** = Relevance×0.4 + Novelty×0.3 + Actionability×0.3

| Score | Action |
|---|---|
| < 7.0 | Discard — not relevant enough |
| 7.0 – 8.4 | Write to Coda Research Intelligence |
| ≥ 8.5 | Write to Coda + set Priority flag |

## Use Case Tags (apply to each item)
- **Content Idea**: Suggests a specific social post or video angle
- **Newsletter Story**: Worth featuring in the weekly digest
- **Workshop Signal**: Indicates a skill gap or learning need for IRL sessions
- **Platform Update**: Algorithm, policy, or feature change affecting creators
- **AI Tool**: New or updated tool that Cre8te creators should know about
- **Industry News**: Market news, funding, acquisitions, regulatory changes

## Coda Output Schema
Each item written to Research Intelligence table with:
- Title, Source URL, Source Type, Platform
- 2-sentence Claude summary (community-first framing)
- Raw excerpt (≤500 chars)
- Three individual scores + final weighted score
- Use case tags
- Priority flag (true if score ≥ 8.5)
- Date Scouted

## Workshop Signal Detection
Items are flagged "Workshop Signal" when they contain:
- Questions about HOW to do something
- Expressions of struggle or overwhelm with a tool or process
- Repeated mentions of the same skill gap across multiple posts
- High comment count relative to likes (indicates discussion/confusion)

The human Workshop Planner reviews Workshop Signal items monthly
to build the IRL session development calendar.

## Downstream Integration

### Agent 03 (Content Strategist)
Reads Research Intelligence weekly. Pulls items tagged "Content Idea" or
"Platform Update" and incorporates them into content angle generation.
Strategy: "What is the community currently discussing + what does this Summit
content say about it?" = differentiated, timely angles.

### Agent 05 (Newsletter Editor)
Pulls items tagged "Newsletter Story" when assembling weekly digest.
Adds a "What's Happening in the Creator Economy" section using top-scored items.
This keeps the newsletter informative and externally referenced, not just internal.

### Human (Workshop Planner)
Reviews "Workshop Signal" items monthly. High-volume signals (same topic
appearing 5+ times in a month) become IRL workshop candidates.

## Rate Limits
- Perplexity: 20 queries/run max, 1s delay between queries
- Apify: 50 items/platform/run (daily), 150 (weekly deep scan)
- Coda: 0.3s delay between row writes
