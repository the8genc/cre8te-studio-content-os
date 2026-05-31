# Agent 07 — The Analyst & Knowledge Updater

## Role
The Analyst closes the learning loop. Every Monday it pulls the prior week's
performance data from each platform, logs it to Coda, identifies what worked,
and feeds winning patterns (hooks, angles, phrases) back into the Brand Voice
Knowledge Base — making every future content cycle smarter.

## Trigger
- **Primary**: Monday cron at 9:00am
- **Manual**: `python analyst.py --week 2025-W24`

## Inputs
- Published Content Packages from prior week (Coda query)
- Platform analytics APIs (per platform — views, reach, engagement, comments)
- Analytics Log table (to check for existing entries — no double-logging)
- Brand Voice Knowledge Base (to add new high-performing entries)

## Actions
1. Query Coda for all packages published in the prior 7 days
2. For each published package, per platform:
   a. Call platform analytics API with published URL/ID
   b. Fetch: views/reach, engagement rate, top comment
   c. Write row to Analytics Log table
3. Identify top performers (engagement rate >2x median for that platform)
4. For each top performer:
   a. Extract the hook used
   b. Extract the core angle/framing
   c. Check if hook already in Knowledge Base (dedup)
   d. If new: add entry to Brand Voice KB with:
      - Entry Title: short description of what worked
      - Content Type: "Hook" or "Phrase"
      - Content: the exact hook text
      - Source: Content Package title + platform + engagement stats
      - Tags: platform, content type, topic theme
5. Write weekly performance summary row to Analytics Log

## Analytics API Sources
- **Instagram**: Instagram Graph API (reach, impressions, engagement)
- **LinkedIn**: LinkedIn Analytics API (impressions, clicks, engagement)
- **YouTube**: YouTube Data API (views, watch time, likes)
- **TikTok**: TikTok Display API (plays, likes, shares, comments)
- **Facebook**: Facebook Graph API (reach, reactions, comments)
- **Newsletter**: Kit API (opens, clicks, unsubscribes)

## Outputs → Coda
- New rows in Analytics Log (one per published package per platform)
- New rows in Brand Voice KB (top-performing hooks only)
- Weekly summary row with aggregate stats

## Learning Rules
- Only add to KB if engagement rate is >2x the platform median
- Never add generic hooks — must reference a specific Cre8te insight or moment
- Tag all KB entries with the week they were added for temporal tracking

## Boundaries
- This agent READS published data and WRITES to Analytics Log and KB only.
- It does NOT modify Content Packages, Ideas, or Newsletter Drafts.
- It does NOT publish or schedule anything.
