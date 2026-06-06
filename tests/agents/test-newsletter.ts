/**
 * Phase 2 Test — Newsletter Editor
 * Validates weekly digest assembly from fixture content packages + research intel.
 */
import { SAMPLE_RESEARCH_ITEMS } from '../fixtures/sample-transcript.js';
import { seedTable, dumpTable, resetStore, addRows, getRows } from '../../lib/mock-coda.js';
import { claudeComplete } from '../../lib/mock-anthropic.js';
import schema from '../../config/coda-schema.json' with { type: 'json' };

const CP = schema.tables.content_packages;
const ND = schema.tables.newsletter_drafts;
const RI = schema.tables.research_intelligence;

const FIXTURE_PACKAGES = [
  {
    id: 'pkg-001',
    values: {
      [CP.columns.package_title]:    { value: 'Maya Chen — 47 Followers $80K Contract' },
      [CP.columns.newsletter_blurb]: { value: 'Maya Chen walked into the Cre8te Summit and stopped the room. 47 LinkedIn followers. $80,000 contract. Zero paid ads. Her Clarity Before Reach framework changes everything about how creators think about audience size.' },
      [CP.columns.publish_status]:   { value: 'Published' },
      [CP.columns.publish_date]:     { value: new Date().toISOString().split('T')[0] },
      [CP.columns.content_idea]:     { value: 'idea-001' },
    },
  },
  {
    id: 'pkg-002',
    values: {
      [CP.columns.package_title]:    { value: 'Maya Chen — 3 Questions Framework Carousel' },
      [CP.columns.newsletter_blurb]: { value: 'Three questions. One sentence. Ready to reach. Maya\'s Clarity Before Reach diagnostic cuts through every content strategy shortcut and gets to the only thing that actually matters: do you understand your person\'s problem better than anyone?' },
      [CP.columns.publish_status]:   { value: 'Scheduled' },
      [CP.columns.publish_date]:     { value: new Date().toISOString().split('T')[0] },
      [CP.columns.content_idea]:     { value: 'idea-002' },
    },
  },
  {
    id: 'pkg-003',
    values: {
      [CP.columns.package_title]:    { value: 'Maya Chen — Slow Is Not Stuck Quote' },
      [CP.columns.newsletter_blurb]: { value: '"Slow is not the same as stuck." Maya\'s closing line hit the room differently. For every creator doing the work and wondering if it\'s working — this one\'s for you.' },
      [CP.columns.publish_status]:   { value: 'Scheduled' },
      [CP.columns.publish_date]:     { value: new Date().toISOString().split('T')[0] },
      [CP.columns.content_idea]:     { value: 'idea-003' },
    },
  },
];

const FIXTURE_RI_ROWS = SAMPLE_RESEARCH_ITEMS.map((item, i) => ({
  id: `ri-${i}`,
  values: {
    [schema.tables.research_intelligence.columns.item_title]:   { value: item.title },
    [schema.tables.research_intelligence.columns.summary]:      { value: item.summary },
    [schema.tables.research_intelligence.columns.use_case_tags]:{ value: item.use_case_tags },
    [schema.tables.research_intelligence.columns.final_score]:  { value: item.final_score },
  },
}));

function getWeekOf(): string {
  const now   = new Date();
  const day   = now.getDay();
  const diff  = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toISOString().split('T')[0];
}

function getFridayDate(): string {
  const now    = new Date();
  const day    = now.getDay();
  const diff   = day <= 5 ? 5 - day : 6;
  const friday = new Date(now);
  friday.setDate(now.getDate() + diff);
  return friday.toISOString().split('T')[0];
}

async function runNewsletterTest(): Promise<void> {
  console.log('\n══════════════════════════════════════════');
  console.log('  PHASE 2 TEST — Newsletter Editor');
  console.log('══════════════════════════════════════════\n');

  resetStore();
  seedTable(CP.table_id, FIXTURE_PACKAGES);
  seedTable(RI.table_id, FIXTURE_RI_ROWS);

  const weekOf = getWeekOf();
  const friday = getFridayDate();

  console.log(`1. Week of: ${weekOf} | Send date: ${friday}`);

  // Get this week's packages
  const allPkgs = await getRows(CP.table_id);
  console.log(`   ✓ ${allPkgs.length} packages loaded`);

  // Get research stories
  const riRows = await getRows(RI.table_id);
  const stories = riRows
    .filter(r => {
      const tags  = String(r.values[schema.tables.research_intelligence.columns.use_case_tags]?.value ?? '');
      const score = Number(r.values[schema.tables.research_intelligence.columns.final_score]?.value ?? 0);
      return tags.includes('Newsletter Story') && score >= 7.5;
    })
    .map(r => `- ${r.values[schema.tables.research_intelligence.columns.item_title]?.value}: ${r.values[schema.tables.research_intelligence.columns.summary]?.value}`)
    .join('\n');

  console.log(`\n2. Research stories for newsletter: ${stories ? stories.split('\n').length : 0} items`);

  // Build hero + supporting
  const [hero, ...supporting] = allPkgs;
  const heroBlurb    = String(hero.values[CP.columns.newsletter_blurb]?.value ?? '');
  const supportItems = supporting.map(p => String(p.values[CP.columns.newsletter_blurb]?.value ?? '')).join('\n\n');

  console.log('\n3. Generating newsletter draft...');
  const raw    = await claudeComplete(
    'You are the newsletter editor for Cre8te Studio.',
    `Write newsletter.\n\nHERO:\n${heroBlurb}\n\nSUPPORT:\n${supportItems}\n\nRESEARCH:\n${stories}`,
    3000
  );
  const parsed = JSON.parse(raw) as { subject_line: string; full_draft: string };

  console.log(`   ✓ Subject: "${parsed.subject_line}"`);

  console.log('\n4. Writing draft to Coda...');
  await addRows(ND.table_id, [[
    { column: ND.columns.subject_line,     value: parsed.subject_line },
    { column: ND.columns.week_of,          value: weekOf },
    { column: ND.columns.hero_story,       value: hero.id },
    { column: ND.columns.supporting_items, value: supporting.map(p => p.id).join(', ') },
    { column: ND.columns.full_draft,       value: parsed.full_draft },
    { column: ND.columns.approval_status,  value: 'Pending' },
    { column: ND.columns.send_date,        value: friday },
  ]]);

  const drafts = dumpTable(ND.table_id);
  const draft  = drafts[0];
  const fullDraft = String(draft.values[ND.columns.full_draft]?.value ?? '');

  console.log('\n5. Newsletter structure validation:');
  const assert = (condition: boolean, msg: string) => {
    console.log(`   ${condition ? '✓' : '✗'} ${msg}`);
    if (!condition) process.exitCode = 1;
  };

  const subjectLine = String(draft.values[ND.columns.subject_line]?.value ?? '');

  assert(drafts.length === 1, 'Exactly one newsletter draft created');
  assert(subjectLine.length > 0, 'Subject line not empty');
  assert(subjectLine.length <= 60, `Subject ≤ 60 chars (${subjectLine.length})`);
  assert(fullDraft.length > 500, `Full draft has substantive content (${fullDraft.length} chars)`);
  assert(fullDraft.includes('HERO') || fullDraft.toLowerCase().includes('maya'), 'Hero story present in draft');
  assert(fullDraft.toLowerCase().includes('creator') || fullDraft.toLowerCase().includes('cre8te'), 'Brand voice present');
  assert(String(draft.values[ND.columns.approval_status]?.value) === 'Pending', 'Status is Pending (human gate)');
  assert(String(draft.values[ND.columns.send_date]?.value) === friday, 'Send date set to Friday');

  console.log('\n6. Draft preview (first 300 chars):');
  console.log(`   "${fullDraft.slice(0, 300)}..."`);

  console.log(`\n${process.exitCode === 1 ? '✗ SOME TESTS FAILED' : '✓ ALL TESTS PASSED'}\n`);
}

runNewsletterTest().catch(err => { console.error(err); process.exit(1); });
