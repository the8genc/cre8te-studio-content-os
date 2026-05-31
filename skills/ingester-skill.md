---
name: ingester-skill
agent: 01-ingester
version: 1.0.0
---

# Ingester Skill

## Purpose
Scan configured Google Drive folders for new source video/audio files
and register each unprocessed file as a row in the Coda Source Assets table.

## When to Use
Run daily at 6am. Also run manually when new batch content is uploaded.

## Folder Mapping
| Source Type | Drive Folder Env Var |
|---|---|
| Summit Recording | GOOGLE_DRIVE_SUMMIT_FOLDER_ID |
| Mini Pod | GOOGLE_DRIVE_MINIPOD_FOLDER_ID |
| Testimonial | GOOGLE_DRIVE_TESTIMONIAL_FOLDER_ID |
| ITL Engagement | GOOGLE_DRIVE_ITL_FOLDER_ID |

## File Types to Ingest
mp4, mov, mp3, wav, m4a — all others skip with log entry.

## Deduplication
Before creating a Coda row, check if the file's Drive URL already exists
in the Source Assets table Raw File URL column. If found, skip silently.

## Filename Convention (recommended)
`YYYY-MM-DD_SpeakerName_TopicSlug.mp4`
Example: `2025-06-14_JaneDoe_BuildingCommunityTrust.mp4`

The Ingester will parse speaker name from the filename if this convention is followed.

## Drive URL Format for Fireflies
When writing the Raw File URL to Coda, convert Drive URLs to direct download format:
`https://drive.google.com/file/d/{file_id}/view` → use file_id to generate:
`https://drive.google.com/uc?export=download&id={file_id}`
Store the direct download URL so the Transcriber can pass it to Fireflies.
