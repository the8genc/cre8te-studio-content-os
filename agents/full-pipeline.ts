/**
 * Full Pipeline Orchestrator
 * Chains all 8 agents for a manual end-to-end run.
 * Usage: npm run pipeline [-- --phase=scout|ingest|transcribe|strategize|write|newsletter|publish|analyze]
 */
import 'dotenv/config';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir   = path.resolve(__dirname, '..');

const PHASE_ARG = process.argv.find(a => a.startsWith('--phase='))?.split('=')[1];

interface AgentDef {
  name:    string;
  script:  string;
  phase:   string;
  human_gate?: string;
}

const AGENTS: AgentDef[] = [
  { name: 'Research Scout',      script: 'agents/08-research-scout/scout.ts',        phase: 'scout'      },
  { name: 'Ingester',            script: 'agents/01-ingester/ingester.ts',            phase: 'ingest'     },
  { name: 'Transcriber',         script: 'agents/02-transcriber/transcriber.ts',      phase: 'transcribe' },
  { name: 'Content Strategist',  script: 'agents/03-content-strategist/strategist.ts', phase: 'strategize',
    human_gate: '🟡 Coda approval required — review pending ideas in "Pending Approval" view before continuing' },
  { name: 'Content Writer',      script: 'agents/04-content-writer/writer.ts',        phase: 'write'      },
  { name: 'Newsletter Editor',   script: 'agents/05-newsletter-editor/newsletter.ts', phase: 'newsletter',
    human_gate: '📰 Newsletter approval required — review draft in "Newsletter Review" view before sending' },
  { name: 'Publisher',           script: 'agents/06-publisher/publisher.ts',          phase: 'publish'    },
  { name: 'Analyst',             script: 'agents/07-analyst/analyst.ts',              phase: 'analyze'    },
];

function runAgent(agent: AgentDef): boolean {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶ Running: ${agent.name}`);
  console.log(`${'─'.repeat(60)}`);

  const result = spawnSync(
    'npx', ['tsx', path.join(rootDir, agent.script)],
    { stdio: 'inherit', cwd: rootDir, env: process.env }
  );

  if (result.status !== 0) {
    console.error(`\n✗ ${agent.name} failed with exit code ${result.status}`);
    return false;
  }

  console.log(`\n✓ ${agent.name} completed`);
  return true;
}

function promptHumanGate(message: string): void {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⏸  HUMAN GATE`);
  console.log(`   ${message}`);
  console.log(`${'═'.repeat(60)}`);
  console.log('\nPress ENTER when approved in Coda to continue, or Ctrl+C to stop...');
  // In automated mode (GitHub Actions), skip gates — cron timing handles sequencing
  if (process.env.CI) {
    console.log('[CI mode] Skipping human gate — cron schedule handles sequencing');
    return;
  }
  // In interactive mode, wait for Enter
  const buf = Buffer.alloc(1);
  require('fs').readSync(0, buf, 0, 1, null);
}

async function main(): Promise<void> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  CREA8TE STUDIO CONTENT OS — FULL PIPELINE');
  console.log(`  Started: ${new Date().toISOString()}`);
  if (PHASE_ARG) console.log(`  Phase filter: ${PHASE_ARG}`);
  console.log(`${'═'.repeat(60)}\n`);

  const toRun = PHASE_ARG
    ? AGENTS.filter(a => a.phase === PHASE_ARG)
    : AGENTS;

  if (toRun.length === 0) {
    console.error(`Unknown phase: ${PHASE_ARG}`);
    console.error(`Valid phases: ${AGENTS.map(a => a.phase).join(', ')}`);
    process.exit(1);
  }

  for (const agent of toRun) {
    const ok = runAgent(agent);
    if (!ok) {
      console.error(`\n Pipeline halted at: ${agent.name}`);
      process.exit(1);
    }

    if (agent.human_gate && !PHASE_ARG && !process.env.CI) {
      promptHumanGate(agent.human_gate);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('  ✓ PIPELINE COMPLETE');
  console.log(`  Finished: ${new Date().toISOString()}`);
  console.log(`${'═'.repeat(60)}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
