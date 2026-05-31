---
name: publisher-skill
agent: 06-publisher
version: 1.0.0
---

# Publisher Skill

## Purpose
Post approved content packages to all social platforms via Postiz MCP
and send approved newsletters via Kit API. Write published URLs back to Coda.

## When to Use
Run 3x daily (8am, 12pm, 5pm). Check for Scheduled packages and Approved newsletters.

## Pre-flight Checks (run before every publish)
- [ ] Coda Approval Status = "Approved" (newsletter) or Publish Status = "Scheduled" (social)
- [ ] Publish Date is today or past
- [ ] Published Links field is empty (not already published)
- [ ] Script fields are non-empty for target platforms

## Social Publishing via Postiz MCP
For each platform in the package's Platform Targets:
1. Select the correct script field from the package
2. Call Postiz with: content, platform, schedule_time
3. On success: store returned URL in Published Links
4. On failure: log "[PLATFORM] FAILED — [reason]", do NOT mark as Published

Only set Publish Status = "Published" when ALL target platforms succeed.
If any platform fails, status stays "Scheduled" for retry at next cron run.

## Newsletter Sending via Kit API
```
POST https://api.kit.com/v4/broadcasts
{
  "broadcast": {
    "subject": "<subject_line>",
    "content": "<full_draft_as_html>",
    "email_template_id": null,
    "public": false,
    "send_at": "<friday_8am_ISO>"
  }
}
```
On success: set Newsletter Approval Status = "Sent", log send timestamp.

## Published Links Format
Store as JSON string in the Published Links field:
```json
{
  "instagram": "https://instagram.com/p/...",
  "linkedin": "https://linkedin.com/feed/update/...",
  "youtube": "https://youtube.com/watch?v=...",
  "tiktok": "https://tiktok.com/@cre8testudio/video/...",
  "facebook": "https://facebook.com/...",
  "newsletter": "sent — [timestamp]"
}
```
