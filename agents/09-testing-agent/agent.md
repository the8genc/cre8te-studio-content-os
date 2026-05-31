# Agent 09 — The Testing Agent

## Role
The Testing Agent is the system's immune system. It runs every agent's test
suite on a schedule, detects failures before they reach production, and emails
the PM with results — daily summaries and weekly deep regression reports.

It is the only agent that communicates externally without human approval:
test results are informational, not content, and do not require the Coda
approval gate.

## Triggers
- **Daily cron**: 3:00am UTC — runs all health checks, sends email if any fail
- **Weekly cron**: Sunday 4:00am UTC — full regression suite, always sends report
- **Post-deploy hook**: runs after any git push to main (via GitHub Actions)
- **Manual**: `npm run test:agent` or `npm run test:full`

## Email Configuration
- **From**: agents@cre8testudio.com (dedicated agent email — provision via your email provider)
- **To**: PM email (set via `REPORT_EMAIL` env var)
- **Provider**: Kit API (same as newsletter) — uses a dedicated broadcast or
  transactional endpoint, OR SendGrid/Postmark if Kit doesn't support transactional
- **Fallback**: If email fails, writes report to Coda Test Results table

## Test Tiers

### Tier 1 — Health Checks (daily, ~30 seconds)
Smoke tests that verify each agent's core logic path works.
Runs against mock clients only — no live API calls.
Failure threshold: any single assertion fail → immediate email alert.

| Check | What it validates |
|---|---|
| Strategist smoke | Generates ≥3 angles from fixture transcript |
| Writer smoke | All 6 platform scripts non-empty, Instagram hook ≤125 chars |
| Scout smoke | Dedup logic catches duplicate URLs, scoring threshold works |
| Newsletter smoke | Subject ≤60 chars, draft has required sections |
| Publisher smoke | Due packages published, future packages skipped |
| Approval loop | Pending→Approved→Package flow completes |

### Tier 2 — Integration Tests (daily, ~2 minutes)
Full pipeline simulation from fixture transcript to published package.
Tests agent-to-agent handoffs via shared Coda state.

### Tier 3 — Regression Suite (weekly, ~10 minutes)
Every assertion across all test files. Catches regressions from
new code that looked fine in isolation.

## Report Format

### Daily Email (failures only, or "all clear")
```
Subject: [Cre8te OS] ✅ All systems healthy — May 30 2026
         [Cre8te OS] ⚠️  2 test failures detected — May 30 2026

Body:
- Total tests run: N
- Passed: N | Failed: N | Duration: Ns
- Failed tests (if any): test name + assertion + stack trace excerpt
- Recommended action: specific fix or "no action needed"
```

### Weekly Email (always sent, full detail)
```
Subject: [Cre8te OS] Weekly Health Report — Week of May 25 2026

Body:
- Executive summary: system health score (tests passed / total)
- Test results by agent (table)
- Performance trends (test duration over time)
- Any flaky tests (passed this week but failed last week)
- Phase progress: which phases are complete / in progress
- Pending actions: what credentials still need provisioning
```

## Coda Integration
- Writes every test run to `Test Results` table in Coda
- PM can review historical test results alongside Dev History
- Failing runs are flagged red; passing runs green

## Error Handling
- If the testing agent itself crashes: GitHub Actions captures exit code and
  sends a failure notification via its own email integration
- If email send fails: write full report to Coda as fallback
- Never suppress failures — every broken test must surface

## Boundaries
- This agent RUNS tests and REPORTS results. It does not fix code.
- It does NOT modify any content pipeline tables.
- It ONLY writes to the Test Results table and sends emails.
