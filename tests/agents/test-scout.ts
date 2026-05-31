/**
 * Phase 2 Test — Research Scout
 * Validates scoring, deduplication, and Coda write logic against fixture data.
 */
import { SAMPLE_RESEARCH_ITEMS } from '../fixtures/sample-transcript.js';
import { seedTable, dumpTable, resetStore, addRows, getRows } from '../../lib/mock-coda.js';
import { claudeComplete, parseJsonResponse } from '../../lib/mock-anthropic.js';
import schema from '../../config/coda-schema.json' assert { type: 'json' };

const RI = schema.tables.research_intelligence;

interface RawItem {
  title:       string;
  url:         string;
  platform:    string;
  source_type: string;
  raw_excerpt: string;
  engagement:  number;
}

interface ClaudeScore {
  item_number:   number;
  relevance:     number;
  novelty:       number;
  actionability: number;
  use_case_tags: string[];
  summary:       string;
}

const FIXTURE_RAW_ITEMS: RawItem[] = [
  {
    title:       'Instagram rolls out new creator monetization features for mid-tier accounts',
    url:         'https://techcrunch.com/2026/05/instagram-creator-monetization',
    platform:    'Web/News',
    source_type: 'Web',
    raw_excerpt: 'Instagram announced expanded monetization access for creators with 10k-100k followers...',
    engagement:  0,
  },
  {
    title:       'New AI tool automates short-form video repurposing from long-form content',
    url:         'https://producthunt.com/posts/ai-repurpose-tool',
    platform:    'Web/News',
    source_type: 'Web',
    raw_excerpt: 'A new tool leverages AI to automatically identify highlight moments in long-form videos...',
    engagement:  0,
  },
  {
    title:       'Struggling with content repurposing — any tools that actually work?',
    url:         'https://linkedin.com/posts/creator-post-001',
    platform:    'LinkedIn',
    source_type: 'Social',
    raw_excerpt: 'I\'ve tried 5 different repurposing tools and none of them capture context well...',
    engagement:  287,
  },
  {
    title:       'Duplicate item to test dedup',
    url:         'https://techcrunch.com/2026/05/instagram-creator-monetization', // same URL as item 1
    platform:    'Web/News',
    source_type: 'Web',
    raw_excerpt: 'Duplicate URL should be filtered out by dedup logic',
    engagement:  0,
  },
];

async function runScoutTest(): Promise<void> {
  console.log('\n══════════════════════════════════════════');
  console.log('  PHASE 2 TEST — Research Scout');
  console.log('══════════════════════════════════════════\n');

  resetStore();

  console.log(`1. ${FIXTURE_RAW_ITEMS.length} raw items collected (including 1 deliberate duplicate)`);

  // Dedup by URL
  const existingUrls = new Set<string>();
  const deduped = FIXTURE_RAW_ITEMS.filter(item => {
    if (!item.url || existingUrls.has(item.url)) return false;
    existingUrls.add(item.url);
    return true;
  });

  console.log(`   After dedup: ${deduped.length} unique items`);

  console.log('\n2. Running Claude scoring pass...');
  const itemsText = deduped
    .map((item, i) => `ITEM ${i+1}:\nTitle: ${item.title}\nPlatform: ${item.platform}\nExcerpt: ${item.raw_excerpt}`)
    .join('\n\n');

  const raw     = await claudeComplete('Score research items.', `Score these items 1-10.\n\n${itemsText}`, 2000);
  const results = parseJsonResponse<ClaudeScore[]>(raw);

  console.log(`   ✓ ${results.length} items scored`);
  for (const r of results) {
    const item  = deduped[r.item_number - 1];
    const final = Math.round((r.relevance * 0.4 + r.novelty * 0.3 + r.actionability * 0.3) * 10) / 10;
    console.log(`   [${final}] ${item?.title.slice(0, 55)} | Tags: ${r.use_case_tags.join(', ')}`);
  }

  console.log('\n3. Writing items that pass threshold (≥ 7.0) to Coda...');
  let written = 0;
  for (const score of results) {
    const item  = deduped[score.item_number - 1];
    if (!item) continue;
    const final = Math.round((score.relevance * 0.4 + score.novelty * 0.3 + score.actionability * 0.3) * 10) / 10;
    if (final < 7.0) { console.log(`   SKIP [${final}]: ${item.title.slice(0, 40)}`); continue; }

    await addRows(RI.table_id, [[
      { column: RI.columns.item_title,      value: item.title },
      { column: RI.columns.source_url,      value: item.url },
      { column: RI.columns.source_type,     value: item.source_type },
      { column: RI.columns.platform,        value: item.platform },
      { column: RI.columns.summary,         value: score.summary },
      { column: RI.columns.raw_excerpt,     value: item.raw_excerpt.slice(0, 500) },
      { column: RI.columns.relevance_score, value: score.relevance },
      { column: RI.columns.novelty_score,   value: score.novelty },
      { column: RI.columns.actionability,   value: score.actionability },
      { column: RI.columns.final_score,     value: final },
      { column: RI.columns.use_case_tags,   value: score.use_case_tags.join(', ') },
      { column: RI.columns.priority_flag,   value: final >= 8.5 },
      { column: RI.columns.date_scouted,    value: new Date().toISOString().split('T')[0] },
    ]]);
    written++;
  }

  const rows     = dumpTable(RI.table_id);
  const priority = rows.filter(r => r.values[RI.columns.priority_flag]?.value === true);

  console.log('\n4. RESULTS:');
  console.log(`   Raw items collected:  ${FIXTURE_RAW_ITEMS.length}`);
  console.log(`   After dedup:          ${deduped.length}`);
  console.log(`   Written to Coda:      ${written}`);
  console.log(`   Priority items (≥8.5): ${priority.length}`);

  console.log('\n5. Assertions:');
  const assert = (condition: boolean, msg: string) => {
    console.log(`   ${condition ? '✓' : '✗'} ${msg}`);
    if (!condition) process.exitCode = 1;
  };

  assert(deduped.length === FIXTURE_RAW_ITEMS.length - 1, 'Duplicate URL correctly filtered');
  assert(written >= 1, 'At least 1 item passed scoring threshold');
  assert(rows.every(r => Number(r.values[RI.columns.final_score]?.value) >= 7.0), 'All written items scored ≥ 7.0');
  assert(priority.every(r => Number(r.values[RI.columns.final_score]?.value) >= 8.5), 'Priority items all ≥ 8.5');

  console.log(`\n${process.exitCode === 1 ? '✗ SOME TESTS FAILED' : '✓ ALL TESTS PASSED'}\n`);
}

runScoutTest().catch(err => { console.error(err); process.exit(1); });
