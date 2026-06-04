# Agent 10 — The Blog Publisher

## Role
The Blog Publisher takes approved content packages that have a blog post draft,
publishes them to the Framer CMS, deploys to production, writes the live URL
back to Coda, and makes that URL available to the Newsletter Editor so the
weekly digest can link to owned website content — driving traffic from
newsletter to the Cre8te Studio website.

This is the traffic-to-owned-media loop. Every blog post is a SEO-indexed
asset that lives permanently on the website, can be placed behind the paywall
for subscribers, and gets referenced in the newsletter as a "read more" link.

## Trigger
- **Primary**: Daily cron 1pm (runs before Content Writer's 2pm run so
  newsletter blurbs can reference live blog URLs)
- **Condition**: Blog Posts table with Framer Status = "Ready to Publish"
  AND human approval = "Approved"

## Inputs
- Blog Posts table in Coda (draft post + metadata)
- Framer Server API (`framer-api` npm package)
- Framer project URL + API key (from environment)

## Actions
1. Query Blog Posts table for rows with Status = "Ready to Publish"
2. For each post:
   a. Check for duplicate slug in Framer (listBlogPosts)
   b. Connect to Framer via Server API
   c. Write CMS item (title, body, slug, excerpt, tags, paywall flag)
   d. Publish preview → deploy to production
   e. Write live URL + CMS item ID back to Blog Posts row in Coda
   f. Set Blog Post Status → "Published"
   g. Update linked Content Package `published_links` with blog URL
3. Disconnect from Framer (required — WebSocket session)
4. Log: N posts published, N paywalled, N free

## Framer CMS Fields Required
The Framer blog collection must have these fields (create in Framer CMS editor):
```
title           Text
slug            Text (unique, URL-safe)
excerpt         Text (shown in blog index, newsletter blurb source)
body            Rich Text (full post HTML)
author          Text
category        Text (Select)
tags            Text (comma-separated)
published_date  Date
is_paywalled    Boolean
paywall_teaser  Text (first ~300 chars shown to non-subscribers)
seo_title       Text
seo_description Text
cover_image     Image URL
```

## Paywall Logic
- `is_paywalled = false` → full post publicly visible, SEO-indexed
- `is_paywalled = true` → excerpt/teaser visible, full body gated
- Newsletter ALWAYS links to the live URL regardless of paywall status
  (subscribers who click are already paying members)
- Free posts: use for SEO, community growth, top-of-funnel
- Paywalled posts: deeper frameworks, exclusive data, member-only content

## Slug Generation
`YYYY-MM-DD-title-in-kebab-case`
Example: `2026-05-31-maya-chen-clarity-before-reach`

Uniqueness: if slug exists in Framer, append `-2`, `-3` etc.

## Outputs → Coda
- Blog Posts row: `framer_cms_id`, `live_url`, `status = "Published"`, `published_at`
- Content Packages row: `published_links` updated with `{ "Blog": "https://..." }`

## Downstream Effect on Newsletter
Agent 05 (Newsletter Editor) queries Blog Posts for recently published posts.
When assembling the newsletter, it replaces `[HERO_LINK]` and `[LINK_N]`
placeholders with actual blog URLs. The result is a newsletter with real,
clickable links to the Cre8te Studio website — converting newsletter readers
to website visitors.

## Error Handling
- Framer connection failure → retry once after 60s, then log error, set status "Error"
- Duplicate slug → append suffix and retry
- Deploy failure → mark as "Published (preview only)", alert via log
- Always disconnect: wrap in try/finally to guarantee framer.disconnect()

## Boundaries
- This agent publishes blog content ONLY. It does not publish social posts.
- It does not write newsletter content.
- It does not approve content — that remains with the human approver.
