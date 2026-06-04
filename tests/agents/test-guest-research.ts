/**
 * Tier 1 Test — Guest Research Agent
 * Validates the 6-section brief structure and quality rules.
 */
import { dumpTable, resetStore, addRows } from '../../lib/mock-coda.js';
import schema from '../../config/coda-schema.json' assert { type: 'json' };

const GB = schema.tables.guest_briefs;

const FIXTURE_BRIEF = {
  trajectory:
    "Maya Chen started as a freelance graphic designer who couldn't get clients, then discovered that specificity — not reach — was the actual unlock. Over 8 years she built Content to Commerce, a creative agency that now works with direct-to-consumer brands on content strategy and creator partnerships. Her pivot point: landing an $80K contract from a LinkedIn post with 11 likes. She's since become a vocal counter-voice to the 'go viral' culture in creator economy spaces, advocating instead for what she calls 'Clarity Before Reach.' She speaks at creator economy events and has been building an education product around her framework.",
  recent_work:
    "- Launched the Clarity Before Reach online course (Feb 2026) — → WHY THIS MATTERS: first productized version of her framework, suggests she's moving from service to product\n- Published 'The $80K Post' essay on Substack (Jan 2026) — viral in creator economy circles\n- Guest: Creator Economy Podcast ep. 312 (Mar 2026) — discussed brand partnership models\n- Guest: Build in Public Podcast ep. 89 (Dec 2025) — discussed her 'slow growth' philosophy\n- Announced Content to Commerce Agency hitting 7 figures (Nov 2025)",
  fresh_questions: [
    {
      question: "The $80K post has become your most-cited story — but what's the story you haven't told yet about that client relationship after the contract?",
      why_fresh: "Every interview covers the 11-likes/$80K hook. None go past the initial contract.",
      what_it_unlocks: "The reality of whether the clarity work continued, what the actual delivery looked like, whether the client became long-term."
    },
    {
      question: "You've moved from service business to course product in the last year — how has teaching your framework changed how you see it?",
      why_fresh: "The course launched Feb 2026, post-dates all her podcast appearances.",
      what_it_unlocks: "What you discover when you have to make something teachable that you built intuitively."
    },
    {
      question: "What does a creator get wrong about your framework when they first apply it?",
      why_fresh: "Most interviewers ask what the framework is. Nobody asks what people misuse.",
      what_it_unlocks: "The nuances, the failure modes, the ways well-intentioned people still end up with noise."
    }
  ],
  conflict_checks:
    "No conflicts identified in public record as of 2026-05-31. She has publicly criticized the 'vanity metrics' culture, which could be sensitive if episode covers specific tools or platforms. Recommend confirming any recent developments with guest directly.",
  promo_tags:
    "- Her handles: @mayachen (Instagram, TikTok), Maya Chen on LinkedIn\n- Suggested hashtags: #claritybeforereach #creatoreconomy #contentcreator #personalbranding\n- 1-sentence promo: 'Maya Chen built a 7-figure creative agency from 47 followers — she joined us to share the framework that made it possible.'\n- Community tags: Creator Economy Club, Build in Public community",
  quick_bio:
    "Maya Chen is the founder of Content to Commerce, a creative agency she built to seven figures without a single paid ad. She's the creator of the Clarity Before Reach framework and a vocal advocate for slow, specific growth in a culture obsessed with virality."
};

async function runGuestResearchTest(): Promise<void> {
  console.log('\n══════════════════════════════════════════');
  console.log('  TIER 1 TEST — Guest Research Agent');
  console.log('══════════════════════════════════════════\n');

  resetStore();

  const assert = (cond: boolean, msg: string) => {
    console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
    if (!cond) process.exitCode = 1;
  };

  const brief = FIXTURE_BRIEF;
  const guestName = 'Maya Chen';

  console.log('1. Validating all 6 brief sections:');

  // Trajectory
  assert(brief.trajectory.length >= 150 && brief.trajectory.length <= 800,
    `Trajectory: ${brief.trajectory.length} chars (target ~200, accepts up to 800)`);
  assert(brief.trajectory.toLowerCase().includes(guestName.toLowerCase().split(' ')[1]),
    'Trajectory: references guest');

  // Recent work
  assert(brief.recent_work.includes('→ WHY THIS MATTERS'), 'Recent Work: flags notable items');
  assert(brief.recent_work.split('\n').filter(l => l.startsWith('-')).length >= 3,
    'Recent Work: at least 3 items');

  // Fresh questions
  assert(brief.fresh_questions.length === 3, `Fresh Questions: exactly 3 (got ${brief.fresh_questions.length})`);
  assert(brief.fresh_questions.every(q => q.question.length > 20), 'Fresh Questions: all substantive');
  assert(brief.fresh_questions.every(q => q.why_fresh.length > 10), 'Fresh Questions: all have why_fresh');
  assert(brief.fresh_questions.every(q => q.what_it_unlocks.length > 10), 'Fresh Questions: all have what_it_unlocks');
  // Questions should not be yes/no
  assert(brief.fresh_questions.every(q => !q.question.trim().startsWith('Did ')),
    'Fresh Questions: none are yes/no');

  // Conflict checks
  assert(brief.conflict_checks.length > 20, 'Conflict Checks: has content');
  assert(
    brief.conflict_checks.toLowerCase().includes('no conflict') ||
    brief.conflict_checks.toLowerCase().includes('conflict identified') ||
    brief.conflict_checks.toLowerCase().includes('sensitive'),
    'Conflict Checks: explicitly addresses status'
  );

  // Promo tags
  assert(brief.promo_tags.includes('@'), 'Promo Tags: includes social handles');
  assert(brief.promo_tags.includes('#'), 'Promo Tags: includes hashtags');
  assert(brief.promo_tags.includes('1-sentence promo'), 'Promo Tags: includes ready-to-use promo copy');

  // Quick bio
  assert(brief.quick_bio.split('.').filter(s => s.trim()).length <= 3,
    'Quick Bio: 2 sentences (≤3 sentence markers)');
  assert(!brief.quick_bio.toLowerCase().includes('entrepreneur and content creator'),
    'Quick Bio: avoids generic descriptions');

  console.log('\n2. Writing to Coda Guest Briefs...');
  await addRows(GB.table_id, [[
    { column: GB.columns.guest_name,      value: guestName },
    { column: GB.columns.episode_topic,   value: 'Clarity Before Reach' },
    { column: GB.columns.trajectory,      value: brief.trajectory },
    { column: GB.columns.recent_work,     value: brief.recent_work },
    { column: GB.columns.fresh_questions, value: brief.fresh_questions.map((q, i) =>
        `Q${i+1}: ${q.question}\nWhy fresh: ${q.why_fresh}\nUnlocks: ${q.what_it_unlocks}`
      ).join('\n\n') },
    { column: GB.columns.conflict_checks, value: brief.conflict_checks },
    { column: GB.columns.promo_tags,      value: brief.promo_tags },
    { column: GB.columns.quick_bio,       value: brief.quick_bio },
    { column: GB.columns.status,          value: 'Ready for Review' },
    { column: GB.columns.research_date,   value: new Date().toISOString().split('T')[0] },
  ]]);

  const rows = dumpTable(GB.table_id);
  assert(rows.length === 1, 'Exactly 1 guest brief written to Coda');
  assert(String(rows[0].values[GB.columns.status]?.value) === 'Ready for Review', 'Status = Ready for Review');

  console.log('\n══════════════════════════════════════════');
  console.log(`  ${process.exitCode === 1 ? '✗ SOME TESTS FAILED' : '✓ ALL TESTS PASSED'}`);
  console.log('══════════════════════════════════════════\n');
}

runGuestResearchTest().catch(err => { console.error(err); process.exit(1); });
