/**
 * Phase 2 Test Runner
 * Runs all agent tests in sequence and reports results.
 * Usage: npx tsx tests/run-phase2.ts
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root      = path.resolve(__dirname, '..');

interface TestSuite {
  name:   string;
  script: string;
}

const SUITES: TestSuite[] = [
  { name: 'Research Scout',     script: 'tests/agents/test-scout.ts'      },
  { name: 'Content Strategist', script: 'tests/agents/test-strategist.ts' },
  { name: 'Content Writer',     script: 'tests/agents/test-writer.ts'     },
  { name: 'Newsletter Editor',  script: 'tests/agents/test-newsletter.ts' },
];

const results: Array<{ name: string; passed: boolean; duration: number }> = [];

console.log('\n╔══════════════════════════════════════════╗');
console.log('║   CREA8TE STUDIO — PHASE 2 TEST SUITE   ║');
console.log('╚══════════════════════════════════════════╝');
console.log('  Running all agent tests against fixture data');
console.log('  No live API keys required\n');

for (const suite of SUITES) {
  const start  = Date.now();
  const result = spawnSync('npx', ['tsx', path.join(root, suite.script)], {
    stdio: 'inherit', cwd: root, env: { ...process.env, MOCK_MODE: 'true' },
  });
  const duration = Date.now() - start;
  const passed   = result.status === 0;
  results.push({ name: suite.name, passed, duration });
}

console.log('\n╔══════════════════════════════════════════╗');
console.log('║              SUMMARY                     ║');
console.log('╠══════════════════════════════════════════╣');
let allPassed = true;
for (const r of results) {
  const icon = r.passed ? '✅' : '❌';
  console.log(`║  ${icon} ${r.name.padEnd(26)} ${String(r.duration + 'ms').padStart(6)}  ║`);
  if (!r.passed) allPassed = false;
}
console.log('╠══════════════════════════════════════════╣');
console.log(`║  ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'} ${''.padEnd(allPassed ? 19 : 17)}║`);
console.log('╚══════════════════════════════════════════╝\n');

process.exit(allPassed ? 0 : 1);
