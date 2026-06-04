/**
 * Agent 13 — The Guest Research Agent
 * Given a guest name, produces a complete pre-show research brief:
 * trajectory, recent work, 3 fresh questions, conflict checks,
 * promo tags, and a quick host intro. Saves ~90 min/episode.
 */
import 'dotenv/config';
import { addRows } from '../../lib/coda.js';
import { claudeComplete, parseJsonResponse } from '../../lib/anthropic.js';
import schema from '../../config/coda-schema.json' assert { type: 'json' };

const GB = schema.tables.guest_briefs;

const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY!;

// ── Web research via Perplexity ───────────────────────────────────────────────

async function perplexitySearch(query: string, recency = 'year'): Promise<string> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PERPLEXITY_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:                 'sonar',
      search_recency_filter: recency,
      max_tokens:            1200,
      messages: [
        { role: 'system', content: 'You are a research assistant. Return factual, cited information.' },
        { role: 'user',   content: query },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Perplexity: ${res.status}`);
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content;
}

// ── Brief generation ──────────────────────────────────────────────────────────

interface GuestBrief {
  trajectory:      string;
  recent_work:     string;
  fresh_questions: Array<{ question: string; why_fresh: string; what_it_unlocks: string }>;
  conflict_checks: string;
  promo_tags:      string;
  quick_bio:       string;
}

async function generateBrief(
  guestName:    string,
  guestUrl:     string,
  episodeTopic: string,
  webResearch:  string,
  recentPodcasts: string
): Promise<GuestBrief> {
  const system = `You are the pre-show research director for Cre8te Studio — a podcast and
community platform for creative entrepreneurs. Your job is to produce a research brief
that lets the host have the BEST possible conversation with this guest. Focus on what's
specific, recent, and genuinely interesting — not what's on their standard bio.`;

  const user = `Produce a complete pre-show research brief for guest: ${guestName}
${guestUrl ? `Profile/Website: ${guestUrl}` : ''}
${episodeTopic ? `Episode theme: ${episodeTopic}` : ''}

WEB RESEARCH FINDINGS:
${webResearch}

RECENT PODCAST APPEARANCES:
${recentPodcasts}

Return JSON only:
{
  "trajectory": "~200 words. Who they are, career arc, what they're known for, how they've evolved. Focus on the ARC — the interesting journey — not the bio.",

  "recent_work": "Bullet list of what they've shipped/published/announced in last 6-12 months. Include episode numbers, publication dates, product names where found. If something seems especially notable, flag it with → WHY THIS MATTERS.",

  "fresh_questions": [
    {
      "question": "A specific, open-ended question they likely haven't been asked recently",
      "why_fresh": "Based on research, this hasn't come up in their recent appearances",
      "what_it_unlocks": "What interesting territory this question might open up"
    }
  ],

  "conflict_checks": "Any public controversies, sensitive topics, competing relationships, or things to be aware of. If nothing found, say: 'No conflicts identified in public record as of [date]. Recommend confirming any recent developments with guest directly.' Never fabricate — only report what's in the research.",

  "promo_tags": "Ready-to-use social distribution fragments:\\n- Their handles: @... on [platform]\\n- Suggested hashtags: #...\\n- 1-sentence promo: '...'\\n- Community tags: any communities, newsletters, or groups they're active in",

  "quick_bio": "2-sentence host intro, readable verbatim. Accurate as of today. Specific — not 'entrepreneur and content creator' but what makes them specifically interesting to Cre8te's community."
}

QUALITY RULES:
- fresh_questions: provide exactly 3. Check the recent podcast appearances list — these
  questions should NOT be questions they've answered in the last 6 months.
- trajectory: write the interesting version of who they are, not the LinkedIn summary
- conflict_checks: be honest about uncertainty. Better to flag a maybe than miss something.
- quick_bio: should make the audience immediately understand why THIS guest, why NOW`;

  const raw = await claudeComplete(system, user, 3000);
  return parseJsonResponse<GuestBrief>(raw);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const guestName   = process.argv.find(a => a.startsWith('--guest='))?.split('=')[1];
  const guestUrl    = process.argv.find(a => a.startsWith('--url='))?.split('=')[1]    ?? '';
  const episodeTopic = process.argv.find(a => a.startsWith('--topic='))?.split('=')[1] ?? '';

  if (!guestName) {
    console.error('Usage: npm run guest-research -- --guest="Guest Name" [--url="https://..."] [--topic="Episode theme"]');
    process.exit(1);
  }

  console.log(`\n[Guest Research Agent] Researching: ${guestName}`);
  console.log(`[Guest Research Agent] This takes ~60-90 seconds...\n`);

  // Research pass 1: general trajectory and recent work
  console.log('  → Searching: trajectory and recent work...');
  const trajectoryResearch = await perplexitySearch(
    `${guestName} creator background career trajectory recent projects 2024 2025 2026`
  );

  // Research pass 2: recent podcast appearances (to find what questions to avoid)
  console.log('  → Searching: recent podcast appearances...');
  const podcastResearch = await perplexitySearch(
    `"${guestName}" podcast interview guest 2024 2025 topics discussed`,
    'year'
  );

  // Research pass 3: recent public work and controversies
  console.log('  → Searching: recent announcements and context...');
  const recentResearch = await perplexitySearch(
    `${guestName} 2025 2026 announcement publication launch controversy news`,
    'month'
  );

  const combinedResearch = `TRAJECTORY & BACKGROUND:\n${trajectoryResearch}\n\nRECENT WORK:\n${recentResearch}`;

  console.log('  → Generating brief...');
  const brief = await generateBrief(
    guestName, guestUrl, episodeTopic,
    combinedResearch, podcastResearch
  );

  // Format for Coda
  const freshQsStr = brief.fresh_questions.map((q, i) =>
    `Q${i+1}: ${q.question}\nWhy fresh: ${q.why_fresh}\nUnlocks: ${q.what_it_unlocks}`
  ).join('\n\n');

  await addRows(GB.table_id, [[
    { column: GB.columns.guest_name,      value: guestName                  },
    { column: GB.columns.episode_topic,   value: episodeTopic || 'TBD'      },
    { column: GB.columns.guest_url,       value: guestUrl || ''             },
    { column: GB.columns.trajectory,      value: brief.trajectory           },
    { column: GB.columns.recent_work,     value: brief.recent_work          },
    { column: GB.columns.fresh_questions, value: freshQsStr                 },
    { column: GB.columns.conflict_checks, value: brief.conflict_checks      },
    { column: GB.columns.promo_tags,      value: brief.promo_tags           },
    { column: GB.columns.quick_bio,       value: brief.quick_bio            },
    { column: GB.columns.status,          value: 'Ready for Review'         },
    { column: GB.columns.research_date,   value: new Date().toISOString().split('T')[0] },
  ]]);

  console.log(`\n✓ Brief complete for ${guestName}`);
  console.log(`  Check Coda → Guest Briefs table`);
  console.log(`\n  Quick Bio Preview:`);
  console.log(`  "${brief.quick_bio}"\n`);
  console.log(`  Fresh Questions:`);
  brief.fresh_questions.forEach((q, i) => {
    console.log(`  ${i+1}. ${q.question}`);
  });
  console.log();
}

main().catch(err => { console.error(err); process.exit(1); });
