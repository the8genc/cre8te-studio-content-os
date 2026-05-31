---
name: analyst-skill
agent: 07-analyst
version: 1.0.0
---

# Analyst Skill

## Purpose
Pull prior week's platform performance data, log to Analytics table,
identify top performers, and feed winning hooks/patterns to Knowledge Base.

## When to Use
Every Monday at 9am for the prior 7 days of published content.

## Analytics Pull Per Platform

### Instagram
- API: Instagram Graph API
- Endpoint: `GET /{media_id}/insights?metric=reach,impressions,engagement`
- Key metrics: reach, engagement_rate (engagement/reach)

### LinkedIn
- API: LinkedIn Marketing API
- Endpoint: `GET /organizationalEntityShareStatistics`
- Key metrics: impressions, clicks, engagement (reactions+comments+shares)

### YouTube
- API: YouTube Data API v3
- Endpoint: `GET /videos?part=statistics&id={video_id}`
- Key metrics: viewCount, likeCount, commentCount

### TikTok
- API: TikTok Display API
- Key metrics: play_count, like_count, share_count, comment_count

### Facebook
- API: Facebook Graph API
- Key metrics: reach, post_impressions, post_engaged_users

### Newsletter (Kit)
- API: `GET https://api.kit.com/v4/broadcasts/{broadcast_id}/stats`
- Key metrics: opens, clicks, unsubscribes, open_rate, click_rate

## Top Performer Threshold
Flag as top performer if engagement rate > 2x the median for that platform
across all content published in the same week.

## Knowledge Base Entry Rules
Only add to KB if:
1. Engagement rate exceeds 2x median
2. Hook is not already in KB (check by first 50 chars)
3. Hook references a specific Cre8te insight (not generic)

Entry format:
- Entry Title: "High-performing hook — [platform] — [week]"
- Content Type: "Hook"
- Content: exact hook text
- Source: "[Package Title] — [platform] — [engagement_rate]% engagement"
- Tags: [platform], [content_type], [source_type], [week]
