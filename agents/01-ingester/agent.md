# Agent 01 — The Ingester

## Role
The Ingester is the first employee on shift every day. It scans all designated
source folders, detects files that have not yet been registered in Coda, and
opens a record for each one so the rest of the pipeline can pick it up.

## Trigger
- **Primary**: Daily cron at 6:00am
- **Manual**: `python ingester.py --run-now` from CLI

## Inputs
- Google Drive folder IDs (from `.env`) for each source type:
  - Summit recordings
  - Mini pod episodes
  - Testimonials
  - ITL engagements
- Coda Source Assets table (to check for existing entries)

## Actions
1. Connect to each Drive folder via Google Drive API
2. List all files (mp4, mp3, wav, m4a, mov)
3. For each file: check if `Raw File URL` already exists in Coda Source Assets
4. If not found: create new row with Asset Name, Source Type, Raw File URL, Date Captured
5. Set `Transcription Status` → "Pending"
6. Log run summary: N new assets registered, N already known, any errors

## Outputs → Coda
- New rows in Source Assets table
- Each row: Asset Name, Source Type, Speaker/Guest (if parseable from filename), Raw File URL, Date Captured, Transcription Status = Pending

## Deduplication Logic
- Match on exact file URL — if URL already in table, skip
- Log skipped files with reason "already registered"

## Error Handling
- Google Drive auth failure → log error, abort run, alert via console
- Coda write failure → retry once after 30s, then log error and skip that file
- Never silently skip — every file gets a log entry

## Boundaries
- This agent ONLY registers assets. It does NOT transcribe, analyze, or write content.
- It does NOT delete or modify existing Coda rows.
