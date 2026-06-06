/**
 * Phase 2 Test — Content Strategist
 * Runs the full angle-generation pipeline against fixture data.
 * No live API keys required.
 */
import { SAMPLE_ASSET, SAMPLE_KB_ENTRIES } from '../fixtures/sample-transcript.js';
import { seedTable, dumpTable, resetStore } from '../../lib/mock-coda.js';
import { claudeComplete, parseJsonResponse } from '../../lib/mock-anthropic.js';
import schema from '../../config/coda-schema.json' with { type: 'json' };

const SA = schema.tables.source_assets;
const CI = schema.tables.content_ideas;
const KB = schema.tables.brand_voice_kb;

// ── Inline strategist logic (uses mock clients) ───────────────────────────────
interface ContentAngle {
  angle_title:   string;
  angle_desc:    string;
  best_platforms: string[];
  content_type:  string;
  source_quote:  string;
}

function isDuplicate(title: string, existing: string[]): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const n    = norm(title);
  return existing.some(e => {
    const words  = new Set(n.split(' '));
    const eWords = norm(e).split(' ');
    const hits   = eWords.filter(w => words.has(w)).length;
    return hits / Math.max(n.length, 1) > 0.7;
  });
}

async function runStrategistTest(): Promise<void> {
  console.log('\n══════════════════════════════════════════');
  console.log('  PHASE 2 TEST — Content Strategist');
  console.log('══════════════════════════════════════════\n');

  resetStore();

  // Seed source asset
  seedTable(SA.table_id, [SAMPLE_ASSET]);

  // Seed KB
  const kbRows = SAMPLE_KB_ENTRIES.map((entry, i) => ({
    id: `kb-${i}`,
    values: {
      [KB.columns.content_type]: { value: entry.split(']')[0].replace('[','') },
      [KB.columns.content]:      { value: entry.split('] ')[1] ?? entry },
    },
  }));
  seedTable(KB.table_id, kbRows);

  console.log('1. Loading source asset and KB...');
  const assets   = await import('../../lib/mock-coda.js').then(m => m.getRows(SA.table_id));
  const kbEntries = await import('../../lib/mock-coda.js').then(m => m.getRows(KB.table_id));
  const kbContext = kbEntries.map(r => `[${r.values[KB.columns.content_type]?.value}] ${r.values[KB.columns.content]?.value}`).join('\n');

  console.log(`   ✓ ${assets.length} asset(s) loaded`);
  console.log(`   ✓ ${kbEntries.length} KB entries loaded`);

  const asset      = assets[0];
  const transcript = String(asset.values[SA.columns.transcript]?.value ?? '');
  const themes     = String(asset.values[SA.columns.key_themes]?.value ?? '');
  const speaker    = String(asset.values[SA.columns.speaker_guest]?.value ?? 'Speaker');

  console.log(`\n2. Generating content angles for: ${String(asset.values[SA.columns.asset_name]?.value ?? '')}`);

  const system = `You are a content strategist for Cre8te Studio.`;
  const user   = `Extract 5-8 content angles.\n\nTRANSCRIPT:\n${transcript.slice(0,6000)}\n\nKB:\n${kbContext}`;

  const raw    = await claudeComplete(system, user, 3000);
  const angles = parseJsonResponse<ContentAngle[]>(raw);

  console.log(`   ✓ ${angles.length} angles generated`);

  console.log('\n3. Writing approved angles to Content Ideas...');
  const existingTitles: string[] = [];
  let written = 0;

  const { addRows } = await import('../../lib/mock-coda.js');

  for (const angle of angles) {
    if (isDuplicate(angle.angle_title, existingTitles)) {
      console.log(`   SKIP (dup): ${angle.angle_title.slice(0,50)}`);
      continue;
    }
    await addRows(CI.table_id, [[
      { column: CI.columns.content_angle,    value: `${angle.angle_title}\n\n${angle.angle_desc}` },
      { column: CI.columns.source_asset,     value: asset.id },
      { column: CI.columns.platform_targets, value: angle.best_platforms.join(', ') },
      { column: CI.columns.content_type,     value: angle.content_type },
      { column: CI.columns.approval_status,  value: 'Pending' },
    ]]);
    existingTitles.push(angle.angle_title);
    written++;
  }

  const ideas = dumpTable(CI.table_id);

  console.log('\n4. RESULTS:');
  console.log(`   Angles generated:  ${angles.length}`);
  console.log(`   Angles written:    ${written}`);
  console.log(`   Duplicates caught: ${angles.length - written}`);
  console.log(`   Ideas in table:    ${ideas.length}`);

  console.log('\n5. Sample angles generated:');
  for (const idea of ideas.slice(0, 3)) {
    const text  = String(idea.values[CI.columns.content_angle]?.value ?? '');
    const title = text.split('\n')[0];
    const plats = String(idea.values[CI.columns.platform_targets]?.value ?? '');
    const type  = String(idea.values[CI.columns.content_type]?.value ?? '');
    console.log(`\n   [${type}] ${title.slice(0, 70)}`);
    console.log(`   Platforms: ${plats}`);
    console.log(`   Status: ${idea.values[CI.columns.approval_status]?.value}`);
  }

  // Assertions
  console.log('\n6. Assertions:');
  const assert = (condition: boolean, msg: string) => {
    console.log(`   ${condition ? '✓' : '✗'} ${msg}`);
    if (!condition) process.exitCode = 1;
  };
  assert(angles.length >= 3,        'Generated at least 3 angles');
  assert(written >= 3,              'Wrote at least 3 ideas to Coda');
  assert(ideas.every(i => String(i.values[CI.columns.approval_status]?.value) === 'Pending'), 'All ideas set to Pending');
  assert(ideas.every(i => String(i.values[CI.columns.source_asset]?.value) === SAMPLE_ASSET.id), 'All ideas linked to source asset');

  console.log(`\n${process.exitCode === 1 ? '✗ SOME TESTS FAILED' : '✓ ALL TESTS PASSED'}\n`);
}

runStrategistTest().catch(err => { console.error(err); process.exit(1); });
