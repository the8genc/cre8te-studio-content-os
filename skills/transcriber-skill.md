---
name: transcriber-skill
agent: 02-transcriber
version: 1.0.0
---

# Transcriber Skill

## Purpose
Convert raw source asset files into structured transcripts with speaker labels,
key themes, and NLP insights using the Fireflies API. Write all outputs to Coda.

## When to Use
Run this skill when Source Assets table has rows with `Transcription Status` = "Pending".

## Pre-conditions
- `FIREFLIES_API_KEY` set in environment
- `CODA_API_KEY` set in environment
- Raw File URL in the asset row must be a publicly accessible HTTPS URL
  OR a Google Drive link with appropriate sharing permissions

## Step-by-Step

### 1. Fetch Pending Assets from Coda
Query Source Assets table filtering `Transcription Status` = "Pending".
Process up to 10 assets per run to avoid API rate limits.

### 2. Mark as In Progress
Before submitting to Fireflies, update the row's `Transcription Status` to "In Progress".
This prevents duplicate processing if the agent restarts.

### 3. Submit to Fireflies uploadAudio
```graphql
mutation {
  uploadAudio(input: {
    url: "<file_url>"
    title: "<asset_name>"
  }) {
    success
    message
  }
}
```
The URL must be directly downloadable (not a preview link).
For Google Drive: use `https://drive.google.com/uc?export=download&id=<file_id>` format.

### 4. Poll for Completion
Check every 60 seconds. Timeout at 30 minutes.
Query by title to find the completed transcript.

### 5. Extract and Format
From the Fireflies response, extract:
- `sentences[]` → format into readable transcript with speaker label blocks
- `summary.keywords[]` → join as comma-separated Key Themes
- `summary.overview` → append to Key Themes as "Overview: ..."
- `summary.action_items[]` → optional, store if present

### 6. Write Back to Coda
Update the Source Asset row:
- `Transcript`: full formatted transcript text
- `Key Themes`: extracted keywords + overview
- `Transcription Status`: "Complete"
- `Processed`: true (checkbox)

## Error Handling
- Upload rejected → set status "Error — Upload Rejected", log message
- Timeout → set status "Error — Timeout", log asset name for manual review
- Coda write fails → retry once after 30s, then log and continue to next asset

## Fireflies Speaker Label Note
For non-Zoom sources, Fireflies returns "Speaker 1", "Speaker 2" etc.
Store these as-is — the Content Strategist will handle attribution.
If the filename contains the speaker name, pass it as a Fireflies attendee:
```graphql
attendees: [{ displayName: "Jane Smith", email: "jane@example.com" }]
```
