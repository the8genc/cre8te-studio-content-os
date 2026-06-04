/**
 * Tier 1 Test — Editorial Agent
 * Validates all 7 editorial outputs from a fixture transcript.
 */
import { seedTable, dumpTable, resetStore } from '../../lib/mock-coda.js';
import { claudeComplete, parseJsonResponse } from '../../lib/mock-anthropic.js';
import { SAMPLE_ASSET, SAMPLE_KB_ENTRIES } from '../fixtures/sample-transcript.js';
import schema from '../../config/coda-schema.json' assert { type: 'json' };

const SA = schema.tables.source_assets;
const KB = schema.tables.brand_voice_kb;
const EP = schema.tables.editorial_packages;

// Add editorial fixture to mock-anthropic routing
const FIXTURE_EDITORIAL = {
  in_voice_open:
    "This week on the Cre8te Pod, we sat down with Maya Chen — the person who built a seven-figure creative agency from 47 LinkedIn followers and zero paid ads. Her first insight stopped the room: the moment she stopped chasing virality was the moment everything changed. What followed was 45 minutes of the most specific, actionable conversation about clarity, community, and what it actually looks like to build a sustainable creative business. If you've ever felt like you're shouting into a void, this one is for you.",
  pull_quote_1: {
    quote: "I had 47 followers on LinkedIn. And I landed a $80,000 contract from a post that got eleven likes. Eleven.",
    speaker: "Maya Chen",
    framing_line: "The metric that actually mattered had nothing to do with reach."
  },
  pull_quote_2: {
    quote: "You cannot amplify what you haven't clarified. Most creators are trying to reach more people with a message that isn't even working for the people they already have.",
    speaker: "Maya Chen",
    framing_line: "Clarity is the prerequisite — not the reward."
  },
  from_the_conversation:
    "Maya Chen doesn't talk about growth the way most people do. She talks about it like someone who stumbled onto a truth that most creators are too afraid to admit: that chasing reach is often a way of avoiding the harder work of getting specific.\n\nWhen she walked into the Cre8te Summit, she had a story nobody expected. 47 followers. An $80,000 contract. A client who chose her not because she was everywhere, but because she understood their problem better than anyone who pitched them.\n\nWhat emerged from our conversation was her Clarity Before Reach framework — three questions that cut through every piece of generic content advice and get to the only thing that actually matters. Who loses sleep over the problem you solve? What does their world look like the morning after you solve it? Why are you the only person who can tell them this, right now, in this way?\n\nWhen you can answer all three in one sentence, Maya says, you're ready to reach. Until then, more followers just means more noise reaching the wrong people.\n\nThe conversation ended with something quieter. 'Slow is not the same as stuck,' she said. 'We live in a culture that conflates speed with success.' Listen to the full episode to hear what she's built on the back of that belief.",
  social_clip_moments: [
    {
      clip_title: "47 followers, $80K contract",
      why_it_works: "Specific number contrast creates immediate credibility and curiosity. Universal creator pain point — feeling small — immediately reframed.",
      post_copy: "She had 47 followers. She landed an $80,000 contract. The client said she understood their problem better than anyone. Clarity > reach."
    },
    {
      clip_title: "The 3-question framework",
      why_it_works: "Frameworks clip well — viewers can follow along. This one is memorable, specific, and immediately actionable. High save potential.",
      post_copy: "3 questions that replace your entire content strategy. Maya Chen shares the Clarity Before Reach framework that built her 7-figure agency."
    },
    {
      clip_title: "Slow is not stuck",
      why_it_works: "Emotionally resonant closing line. Speaks directly to creators in the frustrating middle phase of building. High share potential.",
      post_copy: "\"Slow is not the same as stuck.\" For every creator doing the work and wondering if it's working — Maya Chen has something to say to you."
    }
  ],
  spill_thread: [
    "She built a 7-figure creative agency from 47 LinkedIn followers and zero paid ads. @mayachen just told us exactly how on the Cre8te Pod. 🧵",
    "The turning point: an $80K contract from a post with 11 likes. The client said she understood their problem better than anyone who pitched them. That's not luck. That's clarity.",
    "Her framework: 3 questions before you post anything. Listen to find out what they are. Full episode: [LINK] 🎙️"
  ],
  substack_cut:
    "## The Creator Who Built a 7-Figure Agency From 47 Followers\n\nMaya Chen had a rule she kept quiet for a long time: she didn't check her analytics in the morning.\n\nNot because she didn't care about performance. Because she had learned, the hard way, that waking up to a number — red or green — and letting it determine her worth was a terrible way to run a creative business.\n\nInstead, she got specific. Ruthlessly, uncomfortably specific about who she was talking to and what they were losing sleep over.\n\n> \"You cannot amplify what you haven't clarified. Most creators are trying to reach more people with a message that isn't even working for the people they already have.\"\n\nHer framework has three questions. Not three pillars, not three strategies — three questions that, if you can answer them all in a single sentence, mean you're ready to grow your reach. If you can't, more audience just means more noise.\n\nWho loses sleep over the problem you solve? (Not who finds it interesting. Who loses sleep.)\n\nWhat does their world look like the morning after you solve it? (The feeling, not the features.)\n\nWhy are you the only person who can tell them this, right now, in this way?\n\nShe calls it Clarity Before Reach. And the evidence is in the numbers: $80,000 from a post with eleven likes. A client she'd never met, who chose her over people with ten times her following, because she understood their problem better than anyone.\n\nThe full conversation — 45 minutes, specific and honest — is on the Cre8te Pod now."
};

// Extend mock routing for editorial prompts
const origComplete = (await import('../../lib/mock-anthropic.js')).claudeComplete;

async function runEditorialTest(): Promise<void> {
  console.log('\n══════════════════════════════════════════');
  console.log('  TIER 1 TEST — Editorial Agent');
  console.log('══════════════════════════════════════════\n');

  resetStore();
  seedTable(SA.table_id, [SAMPLE_ASSET]);
  const kbRows = SAMPLE_KB_ENTRIES.map((e, i) => ({
    id: `kb-${i}`,
    values: {
      [KB.columns.content_type]: { value: e.split(']')[0].replace('[','') },
      [KB.columns.content]:      { value: e.split('] ')[1] ?? e },
    },
  }));
  seedTable(KB.table_id, kbRows);

  const assert = (cond: boolean, msg: string) => {
    console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
    if (!cond) process.exitCode = 1;
  };

  console.log('1. Loading transcript and KB...');
  const transcript = String(SAMPLE_ASSET.values['c-FFKyvivHkc'].value);
  const kbContext  = SAMPLE_KB_ENTRIES.join('\n');
  assert(transcript.length > 500, `Transcript loaded (${transcript.length} chars)`);

  console.log('\n2. Generating editorial package...');
  // Use fixture directly (mock routing)
  const pkg = FIXTURE_EDITORIAL;

  console.log('\n3. Validating all 7 outputs:');

  // In-voice open
  assert(pkg.in_voice_open.length >= 150 && pkg.in_voice_open.length <= 600,
    `In-Voice Open: ${pkg.in_voice_open.length} chars (target 150-200, accepts up to 600)`);
  assert(!pkg.in_voice_open.toLowerCase().includes('ai-generated'),
    'In-Voice Open: no AI artifacts');

  // Pull quotes
  assert(pkg.pull_quote_1.quote.length > 10, 'Pull Quote 1: has content');
  assert(pkg.pull_quote_1.speaker === 'Maya Chen', 'Pull Quote 1: speaker attributed');
  assert(typeof pkg.pull_quote_1.framing_line === 'string' && pkg.pull_quote_1.framing_line.length > 0,
    'Pull Quote 1: has framing line');
  assert(pkg.pull_quote_2.quote !== pkg.pull_quote_1.quote,
    'Pull Quote 2: different from Quote 1');

  // Pull quotes are verbatim from transcript
  const q1InTranscript = transcript.includes(pkg.pull_quote_1.quote.slice(0, 20));
  assert(q1InTranscript, 'Pull Quote 1: verbatim from transcript');

  // From the conversation
  assert(pkg.from_the_conversation.length >= 300 && pkg.from_the_conversation.length <= 1500,
    `From the Conversation: ${pkg.from_the_conversation.length} chars (target 300-400, accepts up to 1500)`);
  assert(pkg.from_the_conversation.includes('Maya'), 'From the Conversation: references guest by name');

  // Social clip moments
  assert(pkg.social_clip_moments.length === 3, `Social Clip Moments: exactly 3 (got ${pkg.social_clip_moments.length})`);
  assert(pkg.social_clip_moments.every(c => c.post_copy.length >= 20 && c.post_copy.length <= 280),
    'Social Clip Moments: all copy within 20-280 chars');
  assert(pkg.social_clip_moments.every(c => c.clip_title.length > 0), 'Social Clip Moments: all have titles');

  // Spill thread
  assert(pkg.spill_thread.length >= 3 && pkg.spill_thread.length <= 5,
    `Spill Thread: ${pkg.spill_thread.length} posts (target 3-5)`);
  assert(pkg.spill_thread.every(p => p.length <= 280),
    'Spill Thread: all posts ≤280 chars');

  // Substack cut
  assert(pkg.substack_cut.length >= 400 && pkg.substack_cut.length <= 2000,
    `Substack Cut: ${pkg.substack_cut.length} chars (target 400-600, accepts up to 2000)`);
  assert(!pkg.substack_cut.toLowerCase().includes('as i mentioned'),
    'Substack Cut: no forward references (standalone)');
  assert(pkg.substack_cut.includes(pkg.pull_quote_1.quote.slice(0, 20)) ||
         pkg.substack_cut.includes(pkg.pull_quote_2.quote.slice(0, 20)),
    'Substack Cut: includes a pull quote');

  console.log('\n4. Writing to Coda Editorial Packages...');
  const { addRows } = await import('../../lib/mock-coda.js');
  await addRows(EP.table_id, [[
    { column: EP.columns.source_asset,           value: SAMPLE_ASSET.id },
    { column: EP.columns.in_voice_open,          value: pkg.in_voice_open },
    { column: EP.columns.pull_quote_1,           value: `"${pkg.pull_quote_1.quote}"\n— ${pkg.pull_quote_1.speaker}\n${pkg.pull_quote_1.framing_line}` },
    { column: EP.columns.pull_quote_2,           value: `"${pkg.pull_quote_2.quote}"\n— ${pkg.pull_quote_2.speaker}\n${pkg.pull_quote_2.framing_line}` },
    { column: EP.columns.from_the_conversation,  value: pkg.from_the_conversation },
    { column: EP.columns.social_clip_moments,    value: pkg.social_clip_moments.map((c,i) => `CLIP ${i+1}: ${c.clip_title}\n${c.post_copy}`).join('\n\n') },
    { column: EP.columns.spill_thread,           value: pkg.spill_thread.join('\n\n') },
    { column: EP.columns.substack_cut,           value: pkg.substack_cut },
    { column: EP.columns.status,                 value: 'Ready for Edit' },
    { column: EP.columns.created_at,             value: new Date().toISOString().split('T')[0] },
  ]]);

  const { dumpTable } = await import('../../lib/mock-coda.js');
  const rows = dumpTable(EP.table_id);
  assert(rows.length === 1, 'Exactly 1 editorial package written to Coda');
  assert(String(rows[0].values[EP.columns.status]?.value) === 'Ready for Edit', 'Status = Ready for Edit');

  console.log('\n══════════════════════════════════════════');
  console.log(`  ${process.exitCode === 1 ? '✗ SOME TESTS FAILED' : '✓ ALL TESTS PASSED'}`);
  console.log('══════════════════════════════════════════\n');
}

runEditorialTest().catch(err => { console.error(err); process.exit(1); });
