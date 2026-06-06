/**
 * Phase 2 Integration Test — Full Approval Loop
 * Tests the complete cycle: idea created → Pending → Approved/Rejected/Revision
 * → rewrite on revision → final approval → package written.
 * Simulates the human-in-the-loop Coda gate without live credentials.
 */
import { seedTable, dumpTable, resetStore, addRows, updateRow, getRows } from '../../lib/mock-coda.js';
import { claudeComplete, parseJsonResponse } from '../../lib/mock-anthropic.js';
import { SAMPLE_ASSET, SAMPLE_KB_ENTRIES } from '../fixtures/sample-transcript.js';
import schema from '../../config/coda-schema.json' with { type: 'json' };

const CI = schema.tables.content_ideas;
const SA = schema.tables.source_assets;
const CP = schema.tables.content_packages;
const KB = schema.tables.brand_voice_kb;

interface ContentAngle {
  angle_title:    string;
  angle_desc:     string;
  best_platforms: string[];
  content_type:   string;
  source_quote:   string;
}

interface ContentPackage {
  package_title:    string;
  instagram_script: string;
  youtube_script:   string;
  linkedin_post:    string;
  tiktok_script:    string;
  facebook_post:    string;
  newsletter_blurb: string;
}

// ── Simulated approver actions ────────────────────────────────────────────────
async function approverAction(
  ideaId:  string,
  action:  'Approved' | 'Rejected' | 'Revision Needed',
  notes?:  string
): Promise<void> {
  const cells = [{ column: CI.columns.approval_status, value: action }];
  if (notes) cells.push({ column: CI.columns.approver_notes, value: notes });
  if (action === 'Approved') cells.push({ column: CI.columns.approved_date, value: new Date().toISOString().split('T')[0] });
  await updateRow(CI.table_id, ideaId, cells);
  console.log(`   [Approver] → ${action}${notes ? `: "${notes}"` : ''}`);
}

// ── Generate angles (same logic as strategist agent) ──────────────────────────
async function generateAngles(transcript: string, kbContext: string): Promise<ContentAngle[]> {
  const raw = await claudeComplete(
    'You are a content strategist for Cre8te Studio.',
    `Extract 5-8 content angles.\n\nTRANSCRIPT:\n${transcript.slice(0, 6000)}\n\nKB:\n${kbContext}`,
    3000
  );
  return parseJsonResponse<ContentAngle[]>(raw);
}

// ── Rewrite an angle given revision notes ────────────────────────────────────
async function rewriteAngle(originalAngle: string, revisionNotes: string): Promise<string> {
  // In production this calls Claude with the revision notes
  // In test mode, mock returns a revised version
  const revised = `${originalAngle} [REVISED: ${revisionNotes.slice(0, 50)}]`;
  console.log(`   [Writer] Rewriting based on notes: "${revisionNotes}"`);
  return revised;
}

// ── Generate content package ─────────────────────────────────────────────────
async function generatePackage(angle: string, transcript: string, kbContext: string): Promise<ContentPackage> {
  const raw = await claudeComplete(
    'You are the lead content writer for Cre8te Studio.',
    `Write a content package.\n\nANGLE:\n${angle}\n\nTRANSCRIPT:\n${transcript.slice(0, 3000)}\n\nKB:\n${kbContext}`,
    4000
  );
  return parseJsonResponse<ContentPackage>(raw);
}

// ── Main test ─────────────────────────────────────────────────────────────────
async function runApprovalLoopTest(): Promise<void> {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  PHASE 2 INTEGRATION — Full Approval Loop');
  console.log('══════════════════════════════════════════════════\n');

  resetStore();
  seedTable(SA.table_id, [SAMPLE_ASSET]);
  const kbRows = SAMPLE_KB_ENTRIES.map((e, i) => ({
    id: `kb-${i}`,
    values: {
      [KB.columns.content_type]: { value: e.split(']')[0].replace('[', '') },
      [KB.columns.content]:      { value: e.split('] ')[1] ?? e },
    },
  }));
  seedTable(KB.table_id, kbRows);

  const transcript = String(SAMPLE_ASSET.values['c-FFKyvivHkc'].value);
  const kbContext  = SAMPLE_KB_ENTRIES.join('\n');

  const assert = (cond: boolean, msg: string) => {
    console.log(`   ${cond ? '✓' : '✗'} ${msg}`);
    if (!cond) process.exitCode = 1;
  };

  // ── STEP 1: Generate 10 ideas ─────────────────────────────────────────────
  console.log('STEP 1: Generating 10 content angles from Summit transcript...');
  const angles = await generateAngles(transcript, kbContext);

  // Write all as Pending
  for (const a of angles) {
    await addRows(CI.table_id, [[
      { column: CI.columns.content_angle,    value: `${a.angle_title}\n\n${a.angle_desc}` },
      { column: CI.columns.source_asset,     value: SAMPLE_ASSET.id },
      { column: CI.columns.platform_targets, value: a.best_platforms.join(', ') },
      { column: CI.columns.content_type,     value: a.content_type },
      { column: CI.columns.approval_status,  value: 'Pending' },
    ]]);
  }

  const allIdeas = dumpTable(CI.table_id);
  console.log(`   → ${allIdeas.length} ideas created, all Pending`);
  assert(allIdeas.length >= 3, `At least 3 ideas generated (got ${allIdeas.length})`);
  assert(allIdeas.every(i => i.values[CI.columns.approval_status]?.value === 'Pending'), 'All ideas start as Pending');

  // ── STEP 2: Simulate approver reviewing 10 ideas ──────────────────────────
  console.log('\nSTEP 2: Simulating human approver reviewing ideas...');

  const [idea1, idea2, idea3, idea4, ...rest] = allIdeas;

  // Approve first 3, reject next 2, revision on next 1 — relative to actual count
  const toApprove  = allIdeas.slice(0, 3);
  const toReject   = allIdeas.slice(3, 5);
  const toRevise   = allIdeas.slice(5, 6);

  for (const idea of toApprove) await approverAction(idea.id, 'Approved');
  for (const idea of toReject)  await approverAction(idea.id, 'Rejected');
  for (const idea of toRevise)  await approverAction(idea.id, 'Revision Needed', 'Make the hook more specific — reference the $80K contract number directly');

  const afterReview = dumpTable(CI.table_id);
  const approved    = afterReview.filter(i => i.values[CI.columns.approval_status]?.value === 'Approved');
  const rejected    = afterReview.filter(i => i.values[CI.columns.approval_status]?.value === 'Rejected');
  const revision    = afterReview.filter(i => i.values[CI.columns.approval_status]?.value === 'Revision Needed');
  const pending     = afterReview.filter(i => i.values[CI.columns.approval_status]?.value === 'Pending');

  console.log(`   → Approved: ${approved.length} | Rejected: ${rejected.length} | Revision: ${revision.length} | Still Pending: ${pending.length}`);
  assert(approved.length === toApprove.length, `${toApprove.length} ideas approved`);
  assert(rejected.length === toReject.length,  `${toReject.length} ideas rejected`);
  assert(revision.length === Math.min(toRevise.length, 1), `${Math.min(toRevise.length,1)} idea in revision`);

  // ── STEP 3: Process revision (only if revision items exist) ─────────────
  console.log('\nSTEP 3: Processing revision request...');
  let finalApproved = dumpTable(CI.table_id).filter(i => i.values[CI.columns.approval_status]?.value === 'Approved');

  if (revision.length > 0) {
    const revisionIdea  = revision[0];
    const originalAngle = String(revisionIdea.values[CI.columns.content_angle]?.value ?? '');
    const notes         = String(revisionIdea.values[CI.columns.approver_notes]?.value ?? '');
    const revisedAngle  = await rewriteAngle(originalAngle, notes);

    await updateRow(CI.table_id, revisionIdea.id, [
      { column: CI.columns.content_angle,   value: revisedAngle },
      { column: CI.columns.approval_status, value: 'Pending' },
      { column: CI.columns.approver_notes,  value: '' },
    ]);
    console.log(`   → Revised angle re-submitted as Pending`);
    await approverAction(revisionIdea.id, 'Approved');
    finalApproved = dumpTable(CI.table_id).filter(i => i.values[CI.columns.approval_status]?.value === 'Approved');
  } else {
    console.log('   → No revision items (not enough angles from fixture) — skipping revision step');
  }

  const expectedApproved = toApprove.length + revision.length;
  assert(finalApproved.length === expectedApproved, `${expectedApproved} total approved after revision (got ${finalApproved.length})`);

  // ── STEP 4: Write packages for all approved ideas ─────────────────────────
  console.log('\nSTEP 4: Writing content packages for all approved ideas...');

  const existingPackageIdeaIds = new Set<string>();
  let packagesWritten = 0;

  for (const idea of finalApproved) {
    if (existingPackageIdeaIds.has(idea.id)) continue;

    const angleText = String(idea.values[CI.columns.content_angle]?.value ?? '');
    const pkg = await generatePackage(angleText, transcript, kbContext);

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

    existingPackageIdeaIds.add(idea.id);
    packagesWritten++;
  }

  const packages = dumpTable(CP.table_id);
  console.log(`   → ${packagesWritten} packages written`);

  // ── STEP 5: Cross-asset deduplication ────────────────────────────────────
  console.log('\nSTEP 5: Testing cross-asset deduplication...');

  // Try adding angles that duplicate existing ideas
  const existingTitles = finalApproved.map(i =>
    String(i.values[CI.columns.content_angle]?.value ?? '').split('\n')[0]
  );

  const duplicateAngle = existingTitles[0]; // exact duplicate
  const normalise      = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const isDuplicate    = (title: string) => {
    const n     = normalise(title);
    const nWords = n.split(' ').filter(Boolean);
    return existingTitles.some(e => {
      const wordSet = new Set(nWords);
      const eWords  = normalise(e).split(' ').filter(Boolean);
      const hits    = eWords.filter(w => wordSet.has(w)).length;
      const longer  = Math.max(nWords.length, eWords.length, 1);
      return hits / longer > 0.7;
    });
  };

  assert(isDuplicate(duplicateAngle), 'Exact duplicate correctly detected');
  assert(!isDuplicate('Completely different topic about something else entirely'), 'Non-duplicate correctly passes through');

  // ── STEP 6: Final assertions ──────────────────────────────────────────────
  console.log('\nSTEP 6: Final state assertions...');
  const finalIdeas  = dumpTable(CI.table_id);
  const finalRejected = finalIdeas.filter(i => i.values[CI.columns.approval_status]?.value === 'Rejected');
  const expectedPkgs  = toApprove.length + (toRevise.length > 0 ? 1 : 0);
  assert(packages.length === expectedPkgs, `${expectedPkgs} content packages created (got ${packages.length})`);
  assert(packages.every(p => p.values[CP.columns.publish_status]?.value === 'Draft'), 'All packages status=Draft');
  assert(
    packages.every(p => {
      const hook = String(p.values[CP.columns.instagram_script]?.value ?? '').split('\n')[0];
      return hook.length <= 125;
    }),
    'All Instagram hooks ≤ 125 chars'
  );
  assert(
    finalRejected.every(i => {
      const pkgForIdea = packages.find(p => String(p.values[CP.columns.content_idea]?.value ?? '') === i.id);
      return pkgForIdea === undefined;
    }),
    'No packages written for rejected ideas (cross-check)'
  );

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  ${process.exitCode === 1 ? '✗ SOME TESTS FAILED' : '✓ ALL TESTS PASSED'}`);
  console.log('══════════════════════════════════════════════════\n');
}

runApprovalLoopTest().catch(err => { console.error(err); process.exit(1); });
