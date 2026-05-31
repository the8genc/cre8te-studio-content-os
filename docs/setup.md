# Setup Guide — Cre8te Studio Content OS

## Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- Git
- A Coda document (already created: https://coda.io/d/_dktMUNdlobR)

## Installation

```bash
git clone https://github.com/the8genc/cre8te-studio-content-os.git
cd cre8te-studio-content-os
npm install
cp .env.example .env
# Edit .env with your API keys (see docs/secret-management.md)
```

## Required API Keys

| Key | Where to get it |
|---|---|
| `CODA_API_KEY` | coda.io/account → API → Generate token |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `FIREFLIES_API_KEY` | app.fireflies.ai → Integrations → API |
| `APIFY_API_KEY` | console.apify.com → Settings → Integrations |
| `PERPLEXITY_API_KEY` | perplexity.ai/api-platform |
| `POSTIZ_API_KEY` | postiz.com → Settings → API |
| `KIT_API_KEY` | app.kit.com → Settings → Developer → API Secret |
| `GOOGLE_DRIVE_CREDENTIALS_JSON` | console.cloud.google.com → Service Accounts |

## Google Drive Setup
1. Create a Google Cloud project
2. Enable Google Drive API
3. Create a Service Account → Download JSON key → set path in `GOOGLE_DRIVE_CREDENTIALS_JSON`
4. Share each source folder with the service account email
5. Set folder IDs in `.env`

## Running Agents

```bash
# Individual agents
npm run scout         # Research Scout (web/social intel)
npm run ingester      # Scan Drive for new files
npm run transcriber   # Transcribe pending assets via Fireflies
npm run strategist    # Generate content angles from transcripts
npm run writer        # Write platform scripts for approved ideas
npm run newsletter    # Assemble weekly digest (run Thursday)
npm run publisher     # Post scheduled content + send newsletter
npm run analyst       # Pull analytics, update Knowledge Base

# Full pipeline (interactive, with human gate prompts)
npm run pipeline

# Single phase
npm run pipeline -- --phase=scout
npm run pipeline -- --phase=transcribe

# Type check
npm run typecheck
```

## Automated Runs (GitHub Actions)
See docs/secret-management.md → Option 2 for GitHub Secrets setup.
The workflow at .github/workflows/daily-pipeline.yml handles all scheduling.
Trigger manually: GitHub repo → Actions → Daily Content Pipeline → Run workflow.

## Coda Document
Live tables: https://coda.io/d/_dktMUNdlobR
- 📊 Content OS Tables (6 tables + approval views)
- 🔍 Research Intelligence (daily scout output)
- 🗺️ Development Plan
- ⚙️ Dev History (git commit log)

## DaVinci Resolve Integration
See docs/davinci-integration.md for AutoSubs fork and resolve-mcp setup.
