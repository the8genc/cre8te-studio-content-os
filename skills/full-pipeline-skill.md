---
name: full-pipeline-skill
agent: orchestrator
version: 1.0.0
---

# Full Pipeline Skill

## Purpose
The meta-skill that chains all 7 agents for a complete end-to-end run.
Use this for manual full-pipeline triggers or weekly review runs.

## Usage
```bash
python orchestrator.py --full-pipeline
# or target a specific phase:
python orchestrator.py --phase ingest
python orchestrator.py --phase transcribe
python orchestrator.py --phase strategize
python orchestrator.py --phase write
python orchestrator.py --phase newsletter
python orchestrator.py --phase publish
python orchestrator.py --phase analyze
```

## Pipeline Sequence
```
1. Ingester     → registers new assets in Coda
   [wait for cron / proceed immediately in manual mode]
2. Transcriber  → processes Pending assets via Fireflies
   [wait for all Complete]
3. Strategist   → generates Content Ideas from processed assets
   [HUMAN GATE — approver reviews Coda Pending Approval view]
4. Writer       → generates packages for Approved ideas
   [HUMAN GATE — approver reviews newsletter in Coda]
5. Newsletter   → assembles weekly digest
   [HUMAN GATE — approver approves newsletter in Coda]
6. Publisher    → posts to all platforms, sends newsletter
   [runs on schedule]
7. Analyst      → pulls analytics, updates KB
   [runs Monday]
```

## Human Gates
The pipeline does NOT auto-proceed through human gates.
Agents 4, 5, and 6 each check Coda approval status before executing.
The pipeline will wait indefinitely until the approver acts in Coda.

## Emergency Stop
To halt a running pipeline: set the relevant asset or idea to "Rejected" in Coda.
No agent will process a row marked Rejected.
