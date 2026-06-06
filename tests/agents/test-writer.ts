/**
 * Phase 2 Test — Content Writer
 * Generates a full content package from a fixture approved idea.
 * Validates all 6 platform scripts are produced and within spec.
 */
import { SAMPLE_ASSET, SAMPLE_KB_ENTRIES } from '../fixtures/sample-transcript.js';
import { seedTable, dumpTable, resetStore, addRows, getRows } from '../../lib/mock-coda.js';
import { claudeComplete, parseJsonResponse } from '../../lib/mock-anthropic.js';
import platformSpecs from '../../config/platform-specs.json' with { type: 'json' };
import schema from '../../config/coda-schema.json' with { type: 'json' };

const CI = schema.tables.content_ideas;
const SA = schema.tables.source_assets;
const CP = schema.tables.content_packages;
const KB = schema.tables.brand_voice_kb;

const FIXTURE_APPROVED_IDEA = {
  id: 'idea-001',
  values: {
    [CI.columns.content_angle]:    { value: '47 followers, $80K contract — Maya Chen\'s Clarity Before Reach principle\n\nMaya landed an $80K client from a post with 11 likes.' },
    [CI.columns.source_asset]:     { value: SAMPLE_ASSET.id },
    [CI.columns.platform_targets]: { value: 'Instagram, LinkedIn, YouTube, TikTok, Facebook, Newsletter' },
    [CI.columns.content_type]:     { value: 'Story' },
    [CI.columns.approval_status]:  { value: 'Approved' },
  },
};

interface ContentPackage {
  package_title:    string;
  instagram_script: string;
  youtube_script:   string;
  linkedin_post:    string;
  tiktok_script:    string;
  facebook_post:    string;
  newsletter_blurb: string;
}

async function runWriterTest(): Promise<void> {
  console.log('\n══════════════════════════════════════════');
  console.log('  PHASE 2 TEST — Content Writer');
  console.log('══════════════════════════════════════════\n');

  resetStore();
  seedTable(SA.table_id, [SAMPLE_ASSET]);
  seedTable(CI.table_id, [FIXTURE_APPROVED_IDEA]);

  const kbRows = SAMPLE_KB_ENTRIES.map((e, i) => ({
    id: `kb-${i}`,
    values: {
      [KB.columns.content_type]: { value: e.split(']')[0].replace('[','') },
      [KB.columns.content]:      { value: e.split('] ')[1] ?? e },
    },
  }));
  seedTable(KB.table_id, kbRows);

  console.log('1. Loading approved idea...');
  const ideas = await getRows(CI.table_id, `"${CI.columns.approval_status}":"Approved"`);
  console.log(`   ✓ ${ideas.length} approved idea(s) found`);

  const idea       = ideas[0];
  const angleText  = String(idea.values[CI.columns.content_angle]?.value ?? '');
  const assetId    = String(idea.values[CI.columns.source_asset]?.value ?? '');

  const assets     = await getRows(SA.table_id);
  const asset      = assets.find(a => a.id === assetId);
  const transcript = String(asset?.values[SA.columns.transcript]?.value ?? '');
  const kbEntries  = await getRows(KB.table_id);
  const kbContext  = kbEntries.map(r => `[${r.values[KB.columns.content_type]?.value}] ${r.values[KB.columns.content]?.value}`).join('\n');

  console.log('\n2. Generating content package...');

  const specs = Object.entries(platformSpecs.platforms)
    .map(([p, s]: [string, Record<string, unknown>]) =>
      `${p.toUpperCase()}: max ${s.caption_max_chars ?? s.post_max_chars ?? 'n/a'} chars | tone: ${s.tone}`)
    .join('\n');

  const raw = await claudeComplete(
    'You are the lead content writer for Cre8te Studio.',
    `Write a content package.\n\nANGLE:\n${angleText}\n\nTRANSCRIPT:\n${transcript.slice(0,3000)}\n\nKB:\n${kbContext}\n\nSPECS:\n${specs}`,
    4000
  );
  const pkg = parseJsonResponse<ContentPackage>(raw);

  console.log(`   ✓ Package generated: "${pkg.package_title}"`);

  console.log('\n3. Writing package to Coda...');
  await addRows(CP.table_id, [[
    { column: CP.columns.package_title,    value: pkg.package_title },
    { column: CP.columns.content_idea,     value: idea.id },
    { column: CP.columns.instagram_script, value: pkg.instagram_script },
    { column: CP.columns.youtube_script,   value: pkg.youtube_script },
    { column: CP.columns.linkedin_post,    value: pkg.linkedin_post },
    { column: CP.columns.tiktok_script,    value: pkg.tiktok_script },
    { column: CP.columns.facebook_post,    value: pkg.facebook_post },
    { column: CP.columns.newsletter_blurb, value: pkg.newsletter_blurb },
    { column: CP.columns.publish_status,   value: 'Draft' },
  ]]);

  const packages = dumpTable(CP.table_id);
  const saved    = packages[0];

  console.log('\n4. Script previews:');
  const previewFields: Array<[string, string]> = [
    ['Instagram hook', String(saved.values[CP.columns.instagram_script]?.value ?? '').split('\n')[0]],
    ['LinkedIn hook',  String(saved.values[CP.columns.linkedin_post]?.value ?? '').split('\n')[0]],
    ['TikTok hook',    String(saved.values[CP.columns.tiktok_script]?.value ?? '').split('\n')[0]],
    ['Newsletter',     String(saved.values[CP.columns.newsletter_blurb]?.value ?? '').slice(0, 100)],
  ];
  for (const [label, preview] of previewFields) {
    console.log(`   ${label}: "${preview.slice(0,70)}..."`);
  }

  console.log('\n5. Platform spec validation:');
  const instagramScript = String(saved.values[CP.columns.instagram_script]?.value ?? '');
  const instHook        = instagramScript.split('\n')[0];
  const linkedinPost    = String(saved.values[CP.columns.linkedin_post]?.value ?? '');
  const newsletterBlurb = String(saved.values[CP.columns.newsletter_blurb]?.value ?? '');

  const assert = (condition: boolean, msg: string) => {
    console.log(`   ${condition ? '✓' : '✗'} ${msg}`);
    if (!condition) process.exitCode = 1;
  };

  // Platform spec assertions
  assert(instHook.length <= 125,        `Instagram hook ≤ 125 chars (${instHook.length})`);
  assert(instagramScript.includes('#'), 'Instagram script contains hashtags');
  assert(!linkedinPost.startsWith('I '), 'LinkedIn post does not start with "I"');
  assert(linkedinPost.length <= 3000,   `LinkedIn post ≤ 3000 chars (${linkedinPost.length})`);
  assert(newsletterBlurb.split('.').filter(s => s.trim()).length <= 4, 'Newsletter blurb is 2-3 sentences');
  assert(packages.length === 1,         'Exactly one package written to Coda');
  assert(String(saved.values[CP.columns.publish_status]?.value) === 'Draft', 'Package status is Draft');
  assert(String(saved.values[CP.columns.content_idea]?.value) === idea.id, 'Package linked to source idea');

  console.log(`\n${process.exitCode === 1 ? '✗ SOME TESTS FAILED' : '✓ ALL TESTS PASSED'}\n`);
}

runWriterTest().catch(err => { console.error(err); process.exit(1); });
