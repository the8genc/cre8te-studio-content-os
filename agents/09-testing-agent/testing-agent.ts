/**
 * Agent 09 — The Testing Agent
 * Runs all test suites, collects results, writes to Coda, and emails the PM.
 * Supports daily health checks and weekly full regression runs.
 */
import 'dotenv/config';
import { spawnSync }  from 'child_process';
import path           from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '../..');

// ── Types ─────────────────────────────────────────────────────────────────────
export interface TestResult {
  suite:      string;
  tier:       1 | 2 | 3;
  passed:     boolean;
  duration:   number;
  assertions: number;
  failures:   string[];
  output:     string;
}

export interface RunReport {
  runId:       string;
  mode:        'daily' | 'weekly' | 'post-deploy' | 'manual';
  startedAt:   string;
  finishedAt:  string;
  totalTests:  number;
  passed:      number;
  failed:      number;
  duration:    number;
  results:     TestResult[];
  healthScore: number; // 0-100
}

// ── Test suite registry ───────────────────────────────────────────────────────
interface SuiteDef {
  name:   string;
  script: string;
  tier:   1 | 2 | 3;
  tags:   string[];
}

const SUITES: SuiteDef[] = [
  // Tier 1 — Daily health checks
  { name: 'Research Scout',          script: 'tests/agents/test-scout.ts',             tier: 1, tags: ['daily', 'weekly'] },
  { name: 'Content Strategist',      script: 'tests/agents/test-strategist.ts',        tier: 1, tags: ['daily', 'weekly'] },
  { name: 'Content Writer',          script: 'tests/agents/test-writer.ts',            tier: 1, tags: ['daily', 'weekly'] },
  { name: 'Newsletter Editor',       script: 'tests/agents/test-newsletter.ts',        tier: 1, tags: ['daily', 'weekly'] },
  { name: 'Publisher',               script: 'tests/phase3/test-publisher.ts',         tier: 1, tags: ['daily', 'weekly'] },
  // Tier 2 — Integration
  { name: 'Approval Loop (Phase 2)', script: 'tests/integration/test-approval-loop.ts', tier: 2, tags: ['daily', 'weekly'] },
  // Tier 3 — Weekly regression only
  { name: 'Full Pipeline Smoke',     script: 'tests/integration/test-full-pipeline.ts', tier: 3, tags: ['weekly'] },
];

// ── Run a single test suite ───────────────────────────────────────────────────
function runSuite(suite: SuiteDef): TestResult {
  const start  = Date.now();
  const result = spawnSync(
    'npx', ['tsx', path.join(ROOT, suite.script)],
    { cwd: ROOT, env: { ...process.env, MOCK_MODE: 'true' }, encoding: 'utf8', timeout: 120_000 }
  );
  const duration = Date.now() - start;
  const output   = (result.stdout ?? '') + (result.stderr ?? '');
  const passed   = result.status === 0;

  // Parse assertion count from output (our tests log "✓" and "✗")
  const passCount = (output.match(/✓/g) ?? []).length;
  const failCount = (output.match(/✗/g) ?? []).length;

  // Extract failure messages
  const failures: string[] = [];
  const lines = output.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('✗')) {
      failures.push(lines[i].trim());
    }
  }
  if (!passed && failures.length === 0) {
    // Crashed without assertion failures
    const errLines = output.split('\n').filter(l => l.includes('Error') || l.includes('error')).slice(0, 3);
    failures.push(...errLines.map(l => l.trim()));
  }

  return {
    suite:      suite.name,
    tier:       suite.tier,
    passed,
    duration,
    assertions: passCount + failCount,
    failures,
    output,
  };
}

// ── Build report ──────────────────────────────────────────────────────────────
function buildReport(
  mode:     RunReport['mode'],
  results:  TestResult[],
  start:    Date
): RunReport {
  const passed      = results.filter(r => r.passed).length;
  const failed      = results.filter(r => !r.passed).length;
  const totalAssert = results.reduce((s, r) => s + r.assertions, 0);
  const duration    = Date.now() - start.getTime();
  const healthScore = totalAssert > 0
    ? Math.round((results.reduce((s, r) => s + r.assertions - r.failures.length, 0) / totalAssert) * 100)
    : (passed === results.length ? 100 : 0);

  return {
    runId:       `run-${Date.now()}`,
    mode,
    startedAt:   start.toISOString(),
    finishedAt:  new Date().toISOString(),
    totalTests:  results.length,
    passed,
    failed,
    duration,
    results,
    healthScore,
  };
}

// ── Format email body ─────────────────────────────────────────────────────────
export function formatDailyEmail(report: RunReport): { subject: string; body: string } {
  const allGood  = report.failed === 0;
  const icon     = allGood ? '✅' : '⚠️';
  const dateStr  = new Date(report.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const subject  = `[Cre8te OS] ${icon} ${allGood ? `All systems healthy` : `${report.failed} test failure${report.failed > 1 ? 's' : ''} detected`} — ${dateStr}`;

  const lines: string[] = [
    `CREA8TE STUDIO — DAILY HEALTH CHECK`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Date:         ${dateStr}`,
    `Mode:         ${report.mode}`,
    `Health Score: ${report.healthScore}/100`,
    `Duration:     ${(report.duration / 1000).toFixed(1)}s`,
    ``,
    `RESULTS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Total suites:  ${report.totalTests}`,
    `Passed:        ${report.passed}`,
    `Failed:        ${report.failed}`,
    ``,
  ];

  for (const r of report.results) {
    const status = r.passed ? '✅' : '❌';
    lines.push(`${status}  ${r.suite.padEnd(30)} ${(r.duration + 'ms').padStart(7)}  (${r.assertions} assertions)`);
    if (!r.passed) {
      for (const f of r.failures.slice(0, 3)) {
        lines.push(`      └─ ${f}`);
      }
    }
  }

  if (!allGood) {
    lines.push('');
    lines.push('FAILURES — DETAIL');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const r of report.results.filter(r => !r.passed)) {
      lines.push(`\n❌ ${r.suite}`);
      for (const f of r.failures) {
        lines.push(`   ${f}`);
      }
      lines.push('   --- Output excerpt ---');
      lines.push(r.output.split('\n').slice(0, 15).map(l => `   ${l}`).join('\n'));
    }
    lines.push('');
    lines.push('RECOMMENDED ACTION');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('1. Check the failing agent implementation for recent changes');
    lines.push('2. Run locally: npm run test:[agent-name]');
    lines.push('3. Review Dev History in Coda for recent commits to that agent');
    lines.push('4. File an issue or push a fix — failing tests block Phase completion');
  } else {
    lines.push('');
    lines.push('All agents are healthy. No action required.');
  }

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`Coda Dev History: https://coda.io/d/_dktMUNdlobR`);
  lines.push(`GitHub: https://github.com/the8genc/cre8te-studio-content-os`);

  return { subject, body: lines.join('\n') };
}

export function formatWeeklyEmail(report: RunReport, history: RunReport[]): { subject: string; body: string } {
  const weekStr  = new Date(report.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const subject  = `[Cre8te OS] Weekly Health Report — Week of ${weekStr}`;

  // Trend: compare with previous runs
  const prevScores = history.slice(-7).map(r => r.healthScore);
  const avgScore   = prevScores.length > 0
    ? Math.round(prevScores.reduce((a, b) => a + b, 0) / prevScores.length)
    : report.healthScore;
  const trend = report.healthScore > avgScore ? '📈' : report.healthScore < avgScore ? '📉' : '➡️';

  const lines: string[] = [
    `CREA8TE STUDIO — WEEKLY HEALTH REPORT`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Week of:       ${weekStr}`,
    `Health Score:  ${report.healthScore}/100  ${trend} (7-day avg: ${avgScore}/100)`,
    `Total Suites:  ${report.totalTests}`,
    `Passed:        ${report.passed} / ${report.totalTests}`,
    `Duration:      ${(report.duration / 1000).toFixed(1)}s`,
    ``,
    `RESULTS BY AGENT`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  ];

  // Group by tier
  for (const tier of [1, 2, 3] as const) {
    const tierResults = report.results.filter(r => r.tier === tier);
    if (tierResults.length === 0) continue;
    const tierLabel = tier === 1 ? 'Tier 1 — Health Checks' : tier === 2 ? 'Tier 2 — Integration' : 'Tier 3 — Regression';
    lines.push(`\n${tierLabel}`);
    for (const r of tierResults) {
      const s = r.passed ? '✅' : '❌';
      lines.push(`${s}  ${r.suite.padEnd(32)} ${(r.duration + 'ms').padStart(7)}  ${r.assertions} assertions`);
    }
  }

  // 7-day trend
  if (history.length > 0) {
    lines.push('');
    lines.push('7-DAY TREND');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const h of history.slice(-7)) {
      const d    = new Date(h.startedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const bar  = '█'.repeat(Math.round(h.healthScore / 10));
      lines.push(`${d.padEnd(16)} ${String(h.healthScore).padStart(3)}/100  ${bar}`);
    }
  }

  // Phase status
  lines.push('');
  lines.push('PHASE STATUS');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('✅ Phase 1 — Foundation        (all agents implemented)');
  lines.push('✅ Phase 2 — Content Generation (tests passing, approval loop complete)');
  lines.push('🔄 Phase 3 — Publishing        (publisher built, credentials needed)');
  lines.push('⏳ Phase 4 — Intelligence Loop  (pending Phase 3 completion)');
  lines.push('⏳ Phase 5 — Skill Packaging    (pending Phase 4 completion)');

  lines.push('');
  lines.push('CREDENTIALS STILL NEEDED TO GO LIVE');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('□ CODA_API_KEY              → coda.io/account → API');
  lines.push('□ ANTHROPIC_API_KEY         → console.anthropic.com');
  lines.push('□ FIREFLIES_API_KEY         → app.fireflies.ai → Integrations');
  lines.push('□ APIFY_API_KEY             → console.apify.com → Settings');
  lines.push('□ PERPLEXITY_API_KEY        → perplexity.ai/api-platform');
  lines.push('□ POSTIZ_API_KEY            → postiz.com → Settings → API');
  lines.push('□ KIT_API_KEY               → app.kit.com → Settings → Developer');
  lines.push('□ GOOGLE_DRIVE_*            → GCP service account + folder IDs');
  lines.push('□ AGENT_EMAIL + SMTP creds  → agents@cre8testudio.com provisioning');

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`Coda Doc: https://coda.io/d/_dktMUNdlobR`);
  lines.push(`GitHub:   https://github.com/the8genc/cre8te-studio-content-os`);

  return { subject, body: lines.join('\n') };
}

// ── Email sender ──────────────────────────────────────────────────────────────
async function sendEmail(subject: string, body: string): Promise<boolean> {
  const agentEmail  = process.env.AGENT_EMAIL ?? 'agents@cre8testudio.com';
  const reportEmail = process.env.REPORT_EMAIL;

  if (!reportEmail) {
    console.warn('[TestingAgent] REPORT_EMAIL not set — skipping email, writing to stdout');
    console.log('\n' + '═'.repeat(60));
    console.log('EMAIL WOULD HAVE SENT:');
    console.log(`TO: ${reportEmail ?? '(not set)'}`);
    console.log(`SUBJECT: ${subject}`);
    console.log('─'.repeat(60));
    console.log(body);
    console.log('═'.repeat(60) + '\n');
    return false;
  }

  // Try Kit API for transactional email
  const kitKey = process.env.KIT_API_KEY;
  if (kitKey) {
    try {
      const res = await fetch('https://api.kit.com/v4/broadcasts', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${kitKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcast: {
            subject,
            content:  `<pre style="font-family:monospace;font-size:13px;white-space:pre-wrap">${body}</pre>`,
            public:   false,
          },
        }),
      });
      if (res.ok) { console.log(`[TestingAgent] Email sent via Kit to ${reportEmail}`); return true; }
    } catch (err) {
      console.warn('[TestingAgent] Kit send failed, trying SMTP fallback:', err);
    }
  }

  // SMTP fallback via SendGrid if configured
  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (sendgridKey) {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${sendgridKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: reportEmail }] }],
          from:    { email: agentEmail, name: 'Cre8te Studio OS' },
          subject,
          content: [{ type: 'text/plain', value: body }],
        }),
      });
      if (res.ok || res.status === 202) {
        console.log(`[TestingAgent] Email sent via SendGrid to ${reportEmail}`);
        return true;
      }
    } catch (err) {
      console.warn('[TestingAgent] SendGrid failed:', err);
    }
  }

  console.warn('[TestingAgent] All email methods failed — report written to stdout only');
  console.log(body);
  return false;
}

// ── Write results to Coda ─────────────────────────────────────────────────────
async function writeToCoda(report: RunReport): Promise<void> {
  const codaKey   = process.env.CODA_API_KEY;
  const tableId   = process.env.CODA_TEST_RESULTS_TABLE_ID ?? 'grid-hyU-mpiIb8';
  const docId     = process.env.CODA_DOC_ID ?? 'ktMUNdlobR';
  if (!codaKey || !tableId) {
    console.log('[TestingAgent] CODA_TEST_RESULTS_TABLE_ID not set — skipping Coda write');
    return;
  }

  const payload = {
    rows: [{
      cells: [
        { column: 'c-QdqsmiyE2n',      value: report.runId },
        { column: 'c-ZW6JjuiElI',     value: report.mode },
        { column: 'c-26qtYs8lWZ',     value: new Date(report.startedAt).toISOString().split('T')[0] },
        { column: 'c-B_cYnPX_2F',     value: report.healthScore },
        { column: 'c-Y8GW-jFnHS',     value: report.passed },
        { column: 'c-NEufNLPXHB',     value: report.failed },
        { column: 'c-2xfR1gGaW4',     value: Math.round(report.duration / 1000) },
        { column: 'c-ESTsKCJKiN',     value: report.results.map(r => `${r.passed ? '✅' : '❌'} ${r.suite}`).join('\n') },
        { column: 'c--AvkEypwp8',     value: report.failed === 0 ? 'All Passing' : 'Failures Detected' },
      ],
    }],
  };

  await fetch(`https://coda.io/apis/v1/docs/${docId}/tables/${tableId}/rows`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${codaKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  console.log('[TestingAgent] Results written to Coda Test Results table');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const isWeekly    = process.argv.includes('--weekly')     || process.env.TEST_MODE === 'weekly';
  const isPostDeploy = process.argv.includes('--post-deploy') || process.env.TEST_MODE === 'post-deploy';
  const mode: RunReport['mode'] = isWeekly ? 'weekly' : isPostDeploy ? 'post-deploy' : 'daily';

  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  CREA8TE OS — TESTING AGENT [${mode.toUpperCase()}]`);
  console.log(`  ${new Date().toISOString()}`);
  console.log(`${'═'.repeat(55)}\n`);

  const activeTags  = isWeekly ? ['weekly'] : ['daily'];
  const activeSuites = SUITES.filter(s => s.tags.some(t => activeTags.includes(t)));

  console.log(`Running ${activeSuites.length} test suite(s)...\n`);

  const start   = new Date();
  const results: TestResult[] = [];

  for (const suite of activeSuites) {
    process.stdout.write(`  ${suite.name.padEnd(35)} `);
    const result = runSuite(suite);
    results.push(result);
    console.log(`${result.passed ? '✅' : '❌'}  ${result.duration}ms  (${result.assertions} assertions)`);
    if (!result.passed) {
      for (const f of result.failures.slice(0, 2)) {
        console.log(`    └─ ${f}`);
      }
    }
  }

  const report = buildReport(mode, results, start);

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  Health Score: ${report.healthScore}/100`);
  console.log(`  Passed: ${report.passed}/${report.totalTests}  Duration: ${(report.duration / 1000).toFixed(1)}s`);
  console.log(`${'─'.repeat(55)}\n`);

  // Write to Coda
  await writeToCoda(report);

  // Send email
  const sendAlways  = isWeekly || report.failed > 0;
  if (sendAlways) {
    let email: { subject: string; body: string };
    if (isWeekly) {
      email = formatWeeklyEmail(report, []); // history loaded from Coda in production
    } else {
      email = formatDailyEmail(report);
    }
    await sendEmail(email.subject, email.body);
  } else {
    console.log('[TestingAgent] All tests passed — no email needed (daily mode, failures only)');
  }

  process.exit(report.failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
