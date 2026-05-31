# DaVinci Resolve Integration Guide

## Overview
Two integration layers connect DaVinci Resolve to the Cre8te Studio Content OS:

1. **AutoSubs fork** — editor-facing transcription button inside Resolve
2. **davinci-resolve-mcp** — Claude ↔ Resolve bridge for automated workflows

---

## Layer 1: AutoSubs Fork (Editor Workflow)

### What it does
Adds a "Transcribe & Push to Coda" button inside DaVinci Resolve.
Editor clicks it → local Whisper transcribes the timeline →
transcript + SRT pushed directly to Coda Source Assets table.

### Setup
1. Fork: https://github.com/tmoroney/auto-subs
2. Clone your fork locally
3. Add Coda write-back hook (see modification below)
4. Install per AutoSubs docs (v3.5.3+)
5. Open DaVinci Resolve → Workspace → Scripts → AutoSubs

### Required Modification: Coda Write-Back Hook
Add to `AutoSubs-App/src/lib/codaExport.ts`:
```typescript
export async function pushToCoda(transcript: string, srtContent: string, assetName: string) {
  const CODA_API_KEY = process.env.CODA_API_KEY;
  const DOC_ID = "ktMUNdlobR";
  const TABLE_ID = "grid-_OYt6Tiix6";

  const response = await fetch(`https://coda.io/apis/v1/docs/${DOC_ID}/tables/${TABLE_ID}/rows`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CODA_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      rows: [{
        cells: [
          { column: "c-exr99MOr1E", value: assetName },
          { column: "c-FFKyvivHkc", value: transcript },
          { column: "c-BRN4p-Xq0A", value: "Complete" },
          { column: "c-6hFNqbKizF", value: true }
        ]
      }]
    })
  });
  return response.json();
}
```

Call `pushToCoda()` at the end of the transcription pipeline, after SRT export.

### Compatibility Note
Use AutoSubs v3.5.3+ — this version fixes DaVinci Resolve 20.x connection issues.
Does NOT work with Mac App Store version of Resolve — install from blackmagicdesign.com.

---

## Layer 2: davinci-resolve-mcp (Automation Bridge)

### What it does
Exposes 440+ DaVinci Resolve API methods to Claude Code as MCP tools.
Enables Agent 01 (Ingester) to trigger Resolve renders and export audio
for Fireflies upload — without editor involvement.

### Repository
https://github.com/samuelgursky/davinci-resolve-mcp

### Requirements
- DaVinci Resolve Studio (not free version)
- Python 3.10–3.12
- Resolve Preferences → General → External scripting using: **Local**

### Setup
```bash
git clone https://github.com/samuelgursky/davinci-resolve-mcp
cd davinci-resolve-mcp
python install.py  # universal installer for macOS/Windows/Linux
```

### Key Tools for Cre8te Workflows
- `media_pool_import` — import new source files into Resolve
- `project_render` — trigger audio-only render for Fireflies upload
- `timeline_get_item_list` — inspect clips on timeline
- `media_pool_item_get_metadata` — read clip metadata (speaker, date, etc.)

### Free Version Fallback
If Resolve Studio is not available, use:
https://github.com/hiteshK03/davinci-resolve-mcp
Works with free DaVinci Resolve via an internal bridge script.
155 of 162 tools available, includes local Whisper transcription.

---

## Layer 3: StoryToolkitAI (Phase 4 — Semantic Search)

### Repository
https://github.com/octimot/StoryToolkitAI

### What it adds
As the Summit archive grows, editors can search footage semantically:
"find every moment where someone talks about community building"
→ navigates directly to that clip in the Resolve timeline.

### Requirements
- DaVinci Resolve Studio 18+
- Python environment with sentence-transformers
- External scripting set to Local

### Phase 4 Integration Plan
Configure StoryToolkitAI to export search results and transcripts
to the Coda Brand Voice Knowledge Base, enabling the Content Strategist
to pull relevant archive moments when generating new content ideas.
