# Agent 02 — The Transcriber

## Role
The Transcriber takes every asset registered by the Ingester and converts it
into a structured transcript with speaker labels, key themes, and extracted
insights — all via the Fireflies API. It writes everything back to Coda so
the Content Strategist has rich material to work with.

## Trigger
- **Primary**: Daily cron at 7:00am (runs after Ingester)
- **Manual**: `python transcriber.py --run-now`
- **Condition**: Only processes rows where `Transcription Status` = "Pending"

## Inputs
- Source Assets table rows with Transcription Status = "Pending"
- Raw File URL from each row (must be publicly accessible or Drive-authenticated)
- Fireflies API (`uploadAudio` GraphQL mutation)

## Actions
1. Query Coda for all Source Assets with status "Pending"
2. For each asset:
   a. Set `Transcription Status` → "In Progress"
   b. Submit file URL to Fireflies `uploadAudio` mutation
   c. Poll Fireflies for completion (check every 60s, timeout at 30min)
   d. On completion: fetch full transcript, speaker labels, summary, keywords
   e. Write transcript text to `Transcript` field in Coda
   f. Write extracted themes/keywords to `Key Themes` field
   g. Set `Transcription Status` → "Complete"
   h. Check `Processed` → true
3. Log: N assets transcribed, total runtime, any errors

## Fireflies API Details
- Endpoint: `https://api.fireflies.ai/graphql`
- Mutation: `uploadAudio(input: { url, title, language })`
- Query: `transcript(id)` → sentences, speakers, summary, keywords, action_items
- Auth: Bearer token from `FIREFLIES_API_KEY`

## Outputs → Coda
- `Transcript`: Full verbatim transcript with speaker labels
- `Key Themes`: Comma-separated topics extracted by Fireflies NLP
- `Transcription Status`: "Complete"
- `Processed`: true

## Speaker Label Handling
- Fireflies returns speaker labels as "Speaker 1", "Speaker 2" for non-Zoom sources
- For known speakers: attempt name resolution from filename metadata
- Store raw speaker labels in transcript — Content Strategist will handle attribution

## Error Handling
- Fireflies upload failure → retry once, then set status to "Error", log reason
- Timeout (>30min) → set status to "Error — Timeout", log file ID for manual review
- Coda write failure → retry once after 30s

## Boundaries
- This agent ONLY transcribes and writes raw material to Coda.
- It does NOT generate content ideas or make editorial decisions.
