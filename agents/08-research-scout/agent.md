# Agent 08 — The Research Scout

## Role
The Research Scout is the intelligence layer of the Content OS. It goes out
into the world — web, LinkedIn, Instagram, TikTok — and surfaces what is
happening right now in the creative and creator economy. Its findings inform
three downstream systems: the content pipeline, the IRL workshop development
calendar, and the newsletter editorial layer.

This agent never creates content. It surfaces signals. The Content Strategist
(Agent 03) and Newsletter Editor (Agent 05) pull from its intelligence table
when generating ideas and assembling weekly digests.

## Trigger
- **Primary**: Daily cron at 5:00am (runs before Ingester, seeds the day's context)
- **Deep scan**: Weekly on Sunday at 6:00am (broader research pass)
- **Manual**: `python scout.py --run-now [--mode=deep]`

## Research Domains

### 1. Creator Economy News & Industry Intelligence
Sources: web search, press release feeds, industry publications
Topics to track:
- Platform policy changes (Instagram, TikTok, YouTube, LinkedIn algorithm updates)
- Creator monetization news (new tools, partnerships, revenue model changes)
- AI tools for creators (new launches, updates to existing tools)
- Creator economy funding, acquisitions, market moves
- Brand and agency news affecting creator partnerships
- Regulatory changes affecting creators and digital media

### 2. Trending Topics (Social Intelligence)
Sources: LinkedIn post search, Instagram hashtag trends, TikTok trending content
Topics to track:
- What creators in the personal branding and content creation space are discussing
- Emerging hashtags with high engagement velocity
- Viral formats and content styles gaining traction
- Community pain points surfacing in comments and replies
- Cross-platform trends (same conversation happening on multiple platforms)

### 3. Workshop Intelligence (IRL Session Development)
Sources: web search, LinkedIn, event databases
Topics to track:
- Skills gaps creators are asking about in online communities
- Tools and workflows creators struggle to learn
- Emerging roles in the creator economy (new job titles, new specializations)
- Conference topics and workshop formats that are gaining attendance
- Community questions that repeat across platforms (signal for workshop demand)

## Inputs
- `config/research-topics.json` — tracked keywords, accounts, hashtags
- `config/research-sources.json` — RSS feeds, publication URLs, Apify actors
- Perplexity Sonar API (web + news search with citations)
- Apify LinkedIn Post Scraper (public posts by keyword)
- Apify Instagram Hashtag Scraper (public hashtag feeds)
- Apify TikTok Scraper (public trending content)
- Research Intelligence table in Coda (for dedup and output)

## Actions

### Daily Run (standard)
1. Pull 10 web/news items via Perplexity Sonar on core topic clusters
2. Pull top 20 LinkedIn posts matching tracked keywords (last 24h)
3. Pull top 15 Instagram posts from tracked hashtags (last 24h)
4. Pull top 15 TikTok posts from tracked hashtags (last 24h)
5. Run Claude synthesis pass: score each item for relevance and novelty
6. Deduplicate against items already in Research Intelligence table
7. Write surviving items to Research Intelligence table
8. Flag high-priority items (score ≥ 8/10) for immediate attention

### Weekly Deep Scan (Sunday)
Same as daily, plus:
- Broader keyword sweep (20+ queries instead of 10)
- Engagement velocity analysis (which stories grew fastest over the week)
- Workshop signal extraction (what questions/struggles repeated most)
- Weekly intelligence summary written to Coda for PM visibility

## Scoring Rubric (Claude synthesis pass)
Each item scored 1–10 across three dimensions:
- **Relevance** (1–10): How directly does this relate to Cre8te's community?
- **Novelty** (1–10): Is this new, or have we covered this before?
- **Actionability** (1–10): Does this suggest a content angle, workshop topic, or newsletter story?

Final score = weighted average (Relevance ×0.4 + Novelty ×0.3 + Actionability ×0.3)
Items scoring ≥ 7.0 are written to Coda.
Items scoring ≥ 8.5 are flagged as Priority.

## Outputs → Coda (Research Intelligence Table)
- Item Title
- Source (platform + URL)
- Source Type (Web/News, LinkedIn, Instagram, TikTok)
- Summary (2–3 sentence Claude synthesis)
- Raw Excerpt (first 500 chars of original content)
- Relevance Score / Novelty Score / Actionability Score / Final Score
- Use Case Tags (Content Idea, Newsletter Story, Workshop Signal, Platform Update, AI Tool)
- Priority Flag (checkbox)
- Date Scouted
- Used By (lookup — which content packages or newsletters cited this item)

## Downstream Consumption
- **Agent 03 (Content Strategist)**: reads Research Intelligence weekly before
  generating angles — uses it to ensure content reflects current conversations
- **Agent 05 (Newsletter Editor)**: pulls top-scored items tagged "Newsletter Story"
  when assembling the weekly digest "What's Happening in the Creator Economy" section
- **Workshop Planner** (human, monthly): reviews items tagged "Workshop Signal"
  to inform IRL session development calendar

## Deduplication Logic
- Check if item URL already exists in Research Intelligence table
- Check if item title has >70% similarity to any item from the past 14 days
- Skip duplicates silently, log count

## Rate Limiting & Ethics
- Apify: max 50 items per platform per run (daily), 150 (weekly deep scan)
- Perplexity: max 20 queries per run
- Public-only data collection — no authenticated scraping, no login bypass
- Purpose: internal research and content planning only

## Error Handling
- Apify actor failure → log error, skip that platform, continue with others
- Perplexity API failure → retry once after 30s, then log and skip
- Coda write failure → retry once, then log to local error file
- Never abort entire run on single source failure — partial results are better than none

## Boundaries
- This agent SURFACES signals. It does NOT write content, scripts, or ideas.
- It does NOT post, publish, or send anything.
- It does NOT access private or authenticated social media content.
- It NEVER stores personal data — only public content metadata and summaries.
