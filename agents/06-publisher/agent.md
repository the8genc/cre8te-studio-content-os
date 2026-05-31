# Agent 06 — The Publisher

## Role
The Publisher is the hands that ship the work. It reads approved content
packages from Coda and posts them to every platform on schedule. It also
sends the approved newsletter. After publishing, it writes the live URLs
back to Coda so there is a complete record.

## Trigger
- **Primary**: 3x daily cron — 8am, 12pm, 5pm
- **Condition (social)**: Content Packages with Publish Status = "Scheduled"
  AND Publish Date = today or past
- **Condition (newsletter)**: Newsletter Drafts with Approval Status = "Approved"
  AND Send Date = today

## Inputs
- Content Packages (Scheduled) from Coda
- Newsletter Drafts (Approved) from Coda
- Postiz MCP (social publishing — Instagram, YouTube, LinkedIn, TikTok, Facebook)
- Kit API (newsletter email delivery)

## Actions — Social Posts
1. Query Coda for Scheduled packages due today
2. For each package:
   a. Determine platform targets from linked Content Idea
   b. For each platform: call Postiz MCP with correct script + metadata
   c. On success: write published URL to `Published Links` field
   d. Set Publish Status = "Published"
3. Log: N posts published, platforms, timestamps, any errors

## Actions — Newsletter
1. Query Coda for Approved newsletter draft with today's send date
2. Extract Full Draft, Subject Line
3. Send via Kit API to subscriber list
4. On success: set Newsletter Approval Status = "Sent"
5. Log: send timestamp, recipient count (from Kit response)

## Postiz Integration
- Tool: Postiz MCP (connected)
- Posts: one call per platform per package
- Media: attach media URL if provided in package (future: clip URL from video)

## Kit Integration
- Endpoint: `POST https://api.kit.com/v4/broadcasts`
- Auth: Bearer `KIT_API_KEY`
- Body: subject, content (HTML from Full Draft field), send_at

## Outputs → Coda
- `Published Links` field populated with live URLs
- `Publish Status` → "Published"
- Newsletter `Approval Status` → "Sent"

## Error Handling
- Platform API failure → log error, set that platform's link to "FAILED — [reason]"
- Never mark overall status as Published if any platform failed
- Newsletter send failure → retry once after 5min, then alert and hold

## Boundaries
- This agent ONLY publishes. It does NOT generate, edit, or approve content.
- It does NOT create new Coda rows — only updates existing ones.
