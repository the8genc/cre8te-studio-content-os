/**
 * Tier 3 — Full Pipeline Smoke Test
 * Simulates the complete Scout → Ingest → Transcribe → Strategize →
 * Write → Newsletter → Publish flow end-to-end against fixture data.
 * Validates agent-to-agent handoffs through shared Coda state.
 */
import { seedTable, dumpTable, resetStore, addRows, updateRow, getRows } from '../../lib/mock-coda.js';
import { claudeComplete, parseJsonResponse } from '../../lib/mock-anthropic.js';
import { mockPostizPublish, mockKitSend, resetPublisherStore, getPublishedPosts, getSentNewsletters } from '../../lib/mock-publisher.js';
import { SAMPLE_ASSET, SAMPLE_KB_ENTRIES, SAMPLE_RESEARCH_ITEMS } from '../fixtures/sample-transcript.js';
import schema from '../../config/coda-schema.json' assert { type: 'json' };

const SA = schema.tables.source_assets;
const CI = schema.tables.content_ideas;
const CP = schema.tables.content_packages;
const ND = schema.tables.newsletter_drafts;
const KB = schema.tables.brand_voice_kb;
const RI = schema.tables.research_intelligence;

const TODAY = new Date().toISOString().split('T')[0];

interface ContentAngle  { angle_title: string; angle_desc: string; best_platforms: string[]; content_type: string; source_quote: string; }
interface ContentPackage { package_title: string; instagram_script: string; youtube_script: string; linkedin_post: string; tiktok_script: string; facebook_post: string; newsletter_blurb: string; }

async function runFullPipelineTest(): Promise<void> {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TIER 3 — Full Pipeline Smoke Test');
  console.log('══════════════════════════════════════════════════\n');

  resetStore();
  resetPublisherStore();

  const assert = (cond: boolean, msg: string) => {
    console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
    if (!cond) process.exitCode = 1;
  };

  // Seed KB and research intel
  const kbRows = SAMPLE_KB_ENTRIES.map((e, i) => ({
    id: `kb-${i}`,
    values: {
      [KB.columns.content_type]: { value: e.split(']')[0].replace('[','') },
      [KB.columns.content]:      { value: e.split('] ')[1] ?? e },
    },
  }));
  seedTable(KB.table_id, kbRows);

  const riRows = SAMPLE_RESEARCH_ITEMS.map((item, i) => ({
    id: `ri-${i}`,
    values: {
      [RI.columns.item_title]:    { value: item.title },
      [RI.columns.summary]:       { value: item.summary },
      [RI.columns.use_case_tags]: { value: item.use_case_tags },
      [RI.columns.final_score]:   { value: item.final_score },
    },
  }));
  seedTable(RI.table_id, riRows);

  // ── STAGE 1: Ingestion ────────────────────────────────────────────────────
  console.log('STAGE 1 ─ Ingestion');
  await addRows(SA.table_id, [[
    { column: SA.columns.asset_name,           value: String(SAMPLE_ASSET.values['c-exr99MOr1E'].value) },
    { column: SA.columns.source_type,          value: 'Summit Recording' },
    { column: SA.columns.speaker_guest,        value: 'Maya Chen' },
    { column: SA.columns.raw_file_url,         value: 'https://drive.google.com/uc?id=test123' },
    { column: SA.columns.date_captured,        value: TODAY },
    { column: SA.columns.transcription_status, value: 'Pending' },
    { column: SA.columns.processed,            value: false },
  ]]);
  const ingestedAssets = dumpTable(SA.table_id);
  assert(ingestedAssets.length === 1, 'Asset registered in Source Assets');
  assert(String(ingestedAssets[0].values[SA.columns.transcription_status]?.value) === 'Pending', 'Asset status is Pending');

  // ── STAGE 2: Transcription ────────────────────────────────────────────────
  console.log('STAGE 2 ─ Transcription');
  const assetId = ingestedAssets[0].id;
  await updateRow(SA.table_id, assetId, [
    { column: SA.columns.transcript,            value: String(SAMPLE_ASSET.values['c-FFKyvivHkc'].value) },
    { column: SA.columns.key_themes,            value: 'clarity, reach, community, creator economy, personal brand' },
    { column: SA.columns.transcription_status,  value: 'Complete' },
    { column: SA.columns.processed,             value: true },
  ]);
  const transcribedAssets = dumpTable(SA.table_id);
  assert(String(transcribedAssets[0].values[SA.columns.transcription_status]?.value) === 'Complete', 'Asset transcribed');
  assert(transcribedAssets[0].values[SA.columns.processed]?.value === true, 'Asset marked processed');

  // ── STAGE 3: Content Strategy ─────────────────────────────────────────────
  console.log('STAGE 3 ─ Content Strategy');
  const transcript = String(transcribedAssets[0].values[SA.columns.transcript]?.value ?? '');
  const kbContext  = SAMPLE_KB_ENTRIES.join('\n');
  const anglesRaw  = await claudeComplete('Strategist', `Extract angles.\n\nTRANSCRIPT:\n${transcript}`, 3000);
  const angles     = parseJsonResponse<ContentAngle[]>(anglesRaw);

  for (const a of angles) {
    await addRows(CI.table_id, [[
      { column: CI.columns.content_angle,    value: `${a.angle_title}\n\n${a.angle_desc}` },
      { column: CI.columns.source_asset,     value: assetId },
      { column: CI.columns.platform_targets, value: a.best_platforms.join(', ') },
      { column: CI.columns.content_type,     value: a.content_type },
      { column: CI.columns.approval_status,  value: 'Pending' },
    ]]);
  }
  const allIdeas = dumpTable(CI.table_id);
  assert(allIdeas.length >= 3, `≥3 content ideas generated (got ${allIdeas.length})`);
  assert(allIdeas.every(i => i.values[CI.columns.approval_status]?.value === 'Pending'), 'All ideas start Pending');

  // ── STAGE 4: Human Gate (simulated approval) ──────────────────────────────
  console.log('STAGE 4 ─ Human Approval Gate');
  const [toApprove1, toApprove2, toApprove3, ...toReject] = allIdeas;
  await updateRow(CI.table_id, toApprove1.id, [{ column: CI.columns.approval_status, value: 'Approved' }]);
  await updateRow(CI.table_id, toApprove2.id, [{ column: CI.columns.approval_status, value: 'Approved' }]);
  await updateRow(CI.table_id, toApprove3.id, [{ column: CI.columns.approval_status, value: 'Approved' }]);
  for (const r of toReject) {
    await updateRow(CI.table_id, r.id, [{ column: CI.columns.approval_status, value: 'Rejected' }]);
  }
  const approved = dumpTable(CI.table_id).filter(i => i.values[CI.columns.approval_status]?.value === 'Approved');
  assert(approved.length === 3, '3 ideas approved through human gate');

  // ── STAGE 5: Content Writing ──────────────────────────────────────────────
  console.log('STAGE 5 ─ Content Writing');
  for (const idea of approved) {
    const angleText = String(idea.values[CI.columns.content_angle]?.value ?? '');
    const pkgRaw    = await claudeComplete('Writer', `Write package.\n\nANGLE:\n${angleText}`, 4000);
    const pkg       = parseJsonResponse<ContentPackage>(pkgRaw);
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
  }
  const packages = dumpTable(CP.table_id);
  assert(packages.length === 3, '3 content packages created');
  assert(packages.every(p => p.values[CP.columns.publish_status]?.value === 'Draft'), 'All packages start as Draft');

  // ── STAGE 6: Scheduling ───────────────────────────────────────────────────
  console.log('STAGE 6 ─ Scheduling');
  for (const pkg of packages) {
    await updateRow(CP.table_id, pkg.id, [
      { column: CP.columns.publish_status, value: 'Scheduled' },
      { column: CP.columns.publish_date,   value: TODAY },
    ]);
  }
  const scheduled = dumpTable(CP.table_id).filter(p => p.values[CP.columns.publish_status]?.value === 'Scheduled');
  assert(scheduled.length === 3, '3 packages scheduled');

  // ── STAGE 7: Publishing ───────────────────────────────────────────────────
  console.log('STAGE 7 ─ Publishing');
  const readyToPublish = dumpTable(CP.table_id).filter(
    p => String(p.values[CP.columns.publish_status]?.value) === 'Scheduled'
  );
  const platforms   = ['Instagram', 'LinkedIn', 'YouTube', 'TikTok', 'Facebook'];
  const scriptCols: Record<string, string> = {
    Instagram: CP.columns.instagram_script,
    LinkedIn:  CP.columns.linkedin_post,
    YouTube:   CP.columns.youtube_script,
    TikTok:    CP.columns.tiktok_script,
    Facebook:  CP.columns.facebook_post,
  };

  for (const pkg of readyToPublish) {
    const links: Record<string, string> = {};
    for (const platform of platforms) {
      const content = String(pkg.values[scriptCols[platform]]?.value ?? '');
      if (!content) continue;
      const result  = await mockPostizPublish(platform, content);
      links[platform] = result.url;
    }
    await updateRow(CP.table_id, pkg.id, [
      { column: CP.columns.published_links, value: JSON.stringify(links) },
      { column: CP.columns.publish_status,  value: 'Published' },
    ]);
  }

  const published = dumpTable(CP.table_id).filter(p => p.values[CP.columns.publish_status]?.value === 'Published');
  const postsMade = getPublishedPosts();
  assert(published.length === readyToPublish.length, `${readyToPublish.length} packages published`);
  assert(postsMade.length === readyToPublish.length * platforms.length, `${readyToPublish.length * platforms.length} platform posts made`);
  assert(published.every(p => String(p.values[CP.columns.published_links]?.value ?? '').includes('instagram')), 'All packages have Instagram URLs');

  // ── STAGE 8: Newsletter ───────────────────────────────────────────────────
  console.log('STAGE 8 ─ Newsletter Assembly');
  const blurbs       = published.map(p => String(p.values[CP.columns.newsletter_blurb]?.value ?? ''));
  const researchItems = riRows.filter(r =>
    String(r.values[RI.columns.use_case_tags]?.value ?? '').includes('Newsletter Story')
  ).map(r => `- ${r.values[RI.columns.item_title]?.value}: ${r.values[RI.columns.summary]?.value}`).join('\n');

  const nlRaw  = await claudeComplete('Newsletter', `Write newsletter.\n\nBLURBS:\n${blurbs.join('\n\n')}\n\nRESEARCH:\n${researchItems}`, 3000);
  const nlData = JSON.parse(nlRaw) as { subject_line: string; full_draft: string };

  await addRows(ND.table_id, [[
    { column: ND.columns.subject_line,    value: nlData.subject_line },
    { column: ND.columns.week_of,         value: TODAY },
    { column: ND.columns.full_draft,      value: nlData.full_draft },
    { column: ND.columns.approval_status, value: 'Pending' },
    { column: ND.columns.send_date,       value: TODAY },
  ]]);
  const drafts = dumpTable(ND.table_id);
  assert(drafts.length === 1,              'Newsletter draft created');
  assert(String(drafts[0].values[ND.columns.approval_status]?.value) === 'Pending', 'Newsletter awaiting approval (human gate)');

  // Approver approves
  await updateRow(ND.table_id, drafts[0].id, [{ column: ND.columns.approval_status, value: 'Approved' }]);

  // Send newsletter
  await mockKitSend(nlData.subject_line, nlData.full_draft);
  await updateRow(ND.table_id, drafts[0].id, [{ column: ND.columns.approval_status, value: 'Sent' }]);

  const newsletters   = getSentNewsletters();
  const sentDraft     = dumpTable(ND.table_id)[0];
  assert(newsletters.length === 1, 'Newsletter sent via Kit');
  assert(String(sentDraft.values[ND.columns.approval_status]?.value) === 'Sent', 'Newsletter Coda status = Sent');

  // ── FINAL ASSERTIONS ─────────────────────────────────────────────────────
  console.log('\nFINAL STATE VALIDATION');
  const finalAssets   = dumpTable(SA.table_id);
  const finalIdeas    = dumpTable(CI.table_id);
  const finalPackages = dumpTable(CP.table_id);
  const finalDrafts   = dumpTable(ND.table_id);

  assert(finalAssets[0].values[SA.columns.processed]?.value  === true,        'Asset: processed=true');
  assert(finalIdeas.filter(i => i.values[CI.columns.approval_status]?.value === 'Approved').length === 3, 'Ideas: 3 approved');
  assert(finalIdeas.filter(i => i.values[CI.columns.approval_status]?.value === 'Rejected').length === finalIdeas.length - 3, 'Ideas: remainder rejected');
  assert(finalPackages.every(p => p.values[CP.columns.publish_status]?.value === 'Published'), 'Packages: all Published');
  assert(String(finalDrafts[0].values[ND.columns.approval_status]?.value) === 'Sent', 'Newsletter: Sent');

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  ${process.exitCode === 1 ? '✗ SOME TESTS FAILED' : '✓ ALL TESTS PASSED'}`);
  console.log('══════════════════════════════════════════════════\n');
}

runFullPipelineTest().catch(err => { console.error(err); process.exit(1); });
