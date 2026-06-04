/**
 * Agent 11 — The Editorial Agent
 * Ingests a podcast transcript and produces the full editorial package:
 * in-voice Open, 2 pull quotes with timestamps, "From the Conversation"
 * narrative, 3 social clip moments, Spill thread starter, and Substack cut.
 * Cuts weekly editorial prep from ~6 hours to ~1.5 hours of editing.
 */
import 'dotenv/config';
import { getRows, addRows, updateRow, sleep, type CodaRow } from '../../lib/coda.js';
import { claudeComplete, parseJsonResponse } from '../../lib/anthropic.js';
import schema from '../../config/coda-schema.json' assert { type: 'json' };

const SA = schema.tables.source_assets;
const KB = schema.tables.brand_voice_kb;
const EP = schema.tables.editorial_packages;

// ── Types ─────────────────────────────────────────────────────────────────────

interface PullQuote {
  quote:          string;   // verbatim
  speaker:        string;
  est_timestamp:  string;   // e.g. "~14:30"
  framing_line:   string;   // 1 sentence context
}

interface ClipMoment {
  clip_title:    string;
  start_time:    string;    // e.g. "~8:45"
  end_time:      string;    // e.g. "~10:20"
  why_it_works:  string;
  post_copy:     string;    // 30-50 words
}

interface EditorialPackage {
  in_voice_open:        string;   // 150-200 words
  pull_quote_1:         PullQuote;
  pull_quote_2:         PullQuote;
  from_the_conversation: string;  // 300-400 words
  social_clip_moments:  ClipMoment[];  // exactly 3
  spill_thread:         string[];      // 3-5 posts, each ≤280 chars
  substack_cut:         string;        // 400-600 words standalone piece
}

// ── Timestamp estimation ──────────────────────────────────────────────────────

function estimateTimestamp(
  quoteText: string,
  fullTranscript: string,
  episodeLengthMins = 45
): string {
  const quotePos   = fullTranscript.indexOf(quoteText.slice(0, 40));
  if (quotePos === -1) return '~midpoint';
  const ratio      = quotePos / fullTranscript.length;
  const estMinutes = Math.round(ratio * episodeLengthMins);
  const mins       = String(estMinutes).padStart(2, '0');
  return `~${mins}:00`;
}

// ── Core generation ───────────────────────────────────────────────────────────

async function generateEditorialPackage(
  asset:     CodaRow,
  kbContext: string
): Promise<EditorialPackage> {
  const transcript  = String(asset.values[SA.columns.transcript]?.value  ?? '');
  const themes      = String(asset.values[SA.columns.key_themes]?.value  ?? '');
  const speaker     = String(asset.values[SA.columns.speaker_guest]?.value ?? 'our guest');
  const assetName   = String(asset.values[SA.columns.asset_name]?.value  ?? 'this episode');
  const sourceType  = String(asset.values[SA.columns.source_type]?.value ?? 'Mini Pod');

  const system = `You are the editorial director for Cre8te Studio — a community-first
platform for creative entrepreneurs and content creators. You write in Cre8te Studio's
voice: warm, specific, community-first, insider tone. Never generic. Always reference
real moments, quotes, and named concepts from the transcript.

Your job is to produce editorial drafts that reduce a 6-hour editorial week to 1.5 hours
of editing. These are drafts for a human editor to refine — they should be 80-90% there.`;

  const user = `Produce a complete editorial package for this ${sourceType} episode
featuring ${speaker}.

Episode: "${assetName}"
Key themes: ${themes}

TRANSCRIPT (full):
${transcript.slice(0, 8000)}

BRAND VOICE CONTEXT:
${kbContext.slice(0, 800)}

Produce all 7 editorial outputs. Return JSON only:
{
  "in_voice_open": "150-200 word newsletter opening in Cre8te Studio's first-person community voice. Sets up the episode. Warm, specific, not a summary. Opens with a hook moment from the conversation.",

  "pull_quote_1": {
    "quote": "verbatim quote from transcript — the single most powerful standalone sentence",
    "speaker": "${speaker}",
    "framing_line": "1 sentence that contextualizes why this quote matters to the community"
  },

  "pull_quote_2": {
    "quote": "verbatim quote — contrasts with quote 1 in topic or tone",
    "speaker": "${speaker}",
    "framing_line": "1 sentence context"
  },

  "from_the_conversation": "300-400 word editorial narrative. Tells the story of the conversation — what was covered, what surprised, what the community should take away. Prose format, not a listicle. Written in Cre8te Studio's editorial voice. Includes 1 pull quote inline. Ends by driving to the full episode.",

  "social_clip_moments": [
    {
      "clip_title": "short clip title",
      "why_it_works": "why this moment works as a standalone short-form video clip",
      "post_copy": "30-50 word hook for posting — platform-agnostic, community-first"
    }
  ],

  "spill_thread": [
    "Post 1 of thread (≤280 chars): opener that creates curiosity without spoiling the best insight",
    "Post 2 (≤280 chars)",
    "Post 3 (≤280 chars): closer with soft CTA to listen"
  ],

  "substack_cut": "400-600 word standalone Substack post. Complete piece that works on its own AND drives people to listen. Written in the guest's most quotable voice. Includes 1 pull quote formatted as a blockquote. Does not reference 'as I mentioned' — it stands alone."
}

QUALITY RULES:
- Pull quotes must be verbatim (exact words from transcript)
- Spill thread must NOT give away the best insight — create curiosity
- Substack cut must work as a standalone piece with no forward references
- in_voice_open and from_the_conversation must sound like Cre8te, not like AI
- social_clip_moments: provide exactly 3 moments`;

  const raw = await claudeComplete(system, user, 4000);
  const pkg  = parseJsonResponse<Omit<EditorialPackage, 'pull_quote_1' | 'pull_quote_2'> & {
    pull_quote_1: Omit<PullQuote, 'est_timestamp'>;
    pull_quote_2: Omit<PullQuote, 'est_timestamp'>;
    social_clip_moments: Array<Omit<ClipMoment, 'start_time' | 'end_time'>>;
  }>(raw);

  // Add estimated timestamps post-generation
  const clipsWithTimestamps: ClipMoment[] = (pkg.social_clip_moments ?? []).map((clip, i) => ({
    ...clip,
    start_time: estimateTimestamp(clip.post_copy, transcript, 45),
    end_time:   estimateTimestamp(clip.post_copy, transcript, 45)
      .replace(/~(\d+):/, (_, m) => `~${String(parseInt(m) + 2).padStart(2, '0')}:`),
  }));

  return {
    in_voice_open:          pkg.in_voice_open,
    pull_quote_1:           { ...pkg.pull_quote_1, est_timestamp: estimateTimestamp(pkg.pull_quote_1.quote, transcript) },
    pull_quote_2:           { ...pkg.pull_quote_2, est_timestamp: estimateTimestamp(pkg.pull_quote_2.quote, transcript) },
    from_the_conversation:  pkg.from_the_conversation,
    social_clip_moments:    clipsWithTimestamps,
    spill_thread:           pkg.spill_thread ?? [],
    substack_cut:           pkg.substack_cut,
  };
}

// ── Write to Coda ─────────────────────────────────────────────────────────────

async function writeEditorialPackage(assetId: string, pkg: EditorialPackage): Promise<void> {
  const spillStr  = pkg.spill_thread.map((p, i) => `[${i+1}] ${p}`).join('\n\n');
  const clipsStr  = pkg.social_clip_moments.map((c, i) =>
    `CLIP ${i+1}: ${c.clip_title}\nTime: ${c.start_time} → ${c.end_time}\nWhy: ${c.why_it_works}\nCopy: ${c.post_copy}`
  ).join('\n\n---\n\n');

  const pq1Str = `"${pkg.pull_quote_1.quote}"\n— ${pkg.pull_quote_1.speaker} (${pkg.pull_quote_1.est_timestamp})\n\n${pkg.pull_quote_1.framing_line}`;
  const pq2Str = `"${pkg.pull_quote_2.quote}"\n— ${pkg.pull_quote_2.speaker} (${pkg.pull_quote_2.est_timestamp})\n\n${pkg.pull_quote_2.framing_line}`;

  await addRows(EP.table_id, [[
    { column: EP.columns.source_asset,           value: assetId      },
    { column: EP.columns.in_voice_open,          value: pkg.in_voice_open },
    { column: EP.columns.pull_quote_1,           value: pq1Str       },
    { column: EP.columns.pull_quote_2,           value: pq2Str       },
    { column: EP.columns.from_the_conversation,  value: pkg.from_the_conversation },
    { column: EP.columns.social_clip_moments,    value: clipsStr     },
    { column: EP.columns.spill_thread,           value: spillStr     },
    { column: EP.columns.substack_cut,           value: pkg.substack_cut },
    { column: EP.columns.status,                 value: 'Ready for Edit' },
    { column: EP.columns.created_at,             value: new Date().toISOString().split('T')[0] },
  ]]);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const assetIdArg = process.argv.find(a => a.startsWith('--asset-id='))?.split('=')[1];

  console.log(`\n[Editorial Agent] Starting at ${new Date().toISOString()}`);

  // Load KB
  const kbRows   = await getRows(KB.table_id, undefined, 50);
  const kbContext = kbRows.map(r =>
    `[${r.values[KB.columns.content_type]?.value}] ${r.values[KB.columns.content]?.value}`
  ).join('\n');

  // Get assets to process
  let assets: CodaRow[];
  if (assetIdArg) {
    // Manual mode: specific asset
    const all = await getRows(SA.table_id, undefined, 500);
    assets    = all.filter(r => r.id === assetIdArg);
    if (!assets.length) { console.error(`Asset ${assetIdArg} not found`); process.exit(1); }
  } else {
    // Auto mode: newly processed Mini Pods with no editorial package yet
    const processed  = await getRows(SA.table_id, `"${SA.columns.processed}":true`, 50);
    const existing   = await getRows(EP.table_id, undefined, 200);
    const doneAssets = new Set(existing.map(r => String(r.values[EP.columns.source_asset]?.value ?? '')));
    assets = processed.filter(r => {
      const type = String(r.values[SA.columns.source_type]?.value ?? '');
      return (type === 'Mini Pod' || type === 'Summit Recording') && !doneAssets.has(r.id);
    });
  }

  console.log(`[Editorial Agent] ${assets.length} asset(s) to process`);

  let success = 0, errors = 0;
  for (const asset of assets) {
    const name = String(asset.values[SA.columns.asset_name]?.value ?? asset.id);
    console.log(`  Processing: ${name}`);
    try {
      const pkg = await generateEditorialPackage(asset, kbContext);
      await writeEditorialPackage(asset.id, pkg);
      console.log(`  ✓ Editorial package ready: "${name}"`);
      success++;
    } catch (err) {
      errors++;
      console.error(`  ERROR "${name}":`, err);
    }
    await sleep(1500);
  }

  console.log(`[Editorial Agent] Done — ${success} packages created, ${errors} errors\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
