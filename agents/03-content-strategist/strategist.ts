/**
 * Agent 03 — The Content Strategist
 * Reads completed transcripts and generates 5-8 specific content angles per asset.
 * Writes to Content Ideas table for human approval in Coda.
 */
import 'dotenv/config';
import { getRows, addRows, sleep, type CodaRow } from '../../lib/coda.js';
import { claudeComplete, parseJsonResponse } from '../../lib/anthropic.js';
import platformSpecs from '../../config/platform-specs.json' assert { type: 'json' };
import schema from '../../config/coda-schema.json' assert { type: 'json' };

const SA  = schema.tables.source_assets;
const CI  = schema.tables.content_ideas;
const KB  = schema.tables.brand_voice_kb;

interface ContentAngle {
  angle_title:         string;
  angle_desc:          string;
  content_bucket:      'Growth' | 'Authority' | 'Conversion';
  best_platforms:      string[];
  content_type:        string;
  linkedin_framework:  'AIDA' | 'PAS' | 'StoryArc';
  recommended_cta:     string;
  source_quote:        string;
}

async function getKnowledgeBase(): Promise<string> {
  const rows = await getRows(KB.table_id, undefined, 100);
  return rows
    .map(r => {
      const type    = r.values[KB.columns.content_type]?.value ?? '';
      const content = r.values[KB.columns.content]?.value ?? '';
      return `[${type}] ${content}`;
    })
    .join('\n');
}

async function getExistingAngleTitles(): Promise<string[]> {
  const rows = await getRows(CI.table_id, undefined, 500);
  return rows.map(r => String(r.values[CI.columns.content_angle]?.value ?? ''));
}

async function generateAngles(asset: CodaRow, kbContext: string): Promise<ContentAngle[]> {
  const transcript = String(asset.values[SA.columns.transcript]?.value ?? '');
  const themes     = String(asset.values[SA.columns.key_themes]?.value ?? '');
  const sourceType = String(asset.values[SA.columns.source_type]?.value ?? '');
  const speaker    = String(asset.values[SA.columns.speaker_guest]?.value ?? 'Speaker');

  if (!transcript) return [];

  const system = `You are a content strategist for Cre8te Studio — a community-first platform
for creative entrepreneurs and content creators. Your job is to find the most compelling,
specific, and distinct content angles in a transcript. Every angle must reference something
SPECIFIC from the transcript (a quote, a named concept, a story moment). No generic angles.

CONTENT BUCKET SYSTEM:
Assign every angle to one of three buckets. Target mix across a week: 40% Growth, 40% Authority, 20% Conversion.
- Growth: broad relatable problems, personal stories with universal lessons, contrarian takes, simple frameworks. Goal: reach and shares.
- Authority: systems breakdowns, playbooks, case studies, tool stacks, teardowns. Goal: saves and bookmarks. HIGH-PRIORITY — saves drive algorithm right now.
- Conversion: offer-adjacent posts, objection handling, keyword CTA opportunities, before/after outcomes. Goal: DMs and subscribers.`;

  const user = `Read this transcript from a Cre8te Studio ${sourceType} featuring ${speaker}.
Extract 5-8 specific, distinct content angles.

For each angle return JSON with:
- angle_title: hook in 8-12 words. Use one of these proven patterns:
    "Contrarian Take" → challenge assumption directly (e.g. "Your algorithm issue is actually a positioning issue...")
    "Stop/Start" → contrast old vs new behaviour
    "Number + Result" → specific metric + timeframe
    "Story + Unexpected" → personal moment with surprising outcome
    "Playbook/System" → the audit/process/framework someone can steal
    "Identity Challenge" → reframe how they see themselves
  End with ellipsis or open loop to force expansion click.
- angle_desc: why this angle is compelling and what makes it specific (2 sentences)
- content_bucket: "Growth" | "Authority" | "Conversion"
  Growth = relatable story/contrarian take/broad problem → drives reach and shares
  Authority = framework/playbook/system/case study → drives saves (PRIORITY metric now)
  Conversion = outcome/before-after/keyword CTA → drives DMs and sign-ups
- best_platforms: array of 1-4 from [Instagram, YouTube, LinkedIn, TikTok, Facebook, Newsletter]
- content_type: one of [Clip, Quote, Story, Article, Short, Carousel]
- linkedin_framework: "AIDA" | "PAS" | "StoryArc"
  AIDA = Conversion posts (hook→pain→better state→CTA)
  PAS = Authority posts (name pain→cost of pain→fix)
  StoryArc = Growth posts (setup→conflict→decision→outcome→lesson)
- recommended_cta: specific CTA text matching the bucket
  Growth → question or binary choice ("Which step are you trying first?")
  Authority → save CTA ("Save this before your next post.")
  Conversion → keyword reply ("Comment PLAYBOOK and I'll DM it to you.")
- source_quote: exact words from the transcript that anchor this angle

Angle types to find:
1. Standout quote (screenshot-worthy, emotionally resonant)
2. Framework or model (named, 2-5 step, stealable)
3. Story arc (challenge → insight → outcome — universal lesson)
4. Community moment (shared reaction, relatable admission, audience pain)
5. Contrarian take (challenges what creators believe to be true)
6. Practical takeaway (specific, immediately actionable)

Aim for: ~2 Growth angles, ~3 Authority angles, ~1 Conversion angle per asset (40/40/20 ratio).

Return JSON array only, no other text.

KEY THEMES: ${themes}

TRANSCRIPT:
${transcript.slice(0, 6000)}

BRAND VOICE CONTEXT:
${kbContext.slice(0, 1000)}`;

  const raw    = await claudeComplete(system, user, 3000);
  return parseJsonResponse<ContentAngle[]>(raw);
}

function isDuplicate(title: string, existingTitles: string[]): boolean {
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const norm = normalise(title);
  return existingTitles.some(existing => {
    const existNorm = normalise(existing);
    const longer    = Math.max(norm.length, existNorm.length) || 1;
    let matches     = 0;
    const normWords = new Set(norm.split(' '));
    for (const w of existNorm.split(' ')) if (normWords.has(w)) matches++;
    return matches / longer > 0.7;
  });
}

async function processAsset(asset: CodaRow, kbContext: string, existingTitles: string[]): Promise<number> {
  const name = String(asset.values[SA.columns.asset_name]?.value ?? asset.id);
  console.log(`  Generating angles for: ${name}`);

  const angles = await generateAngles(asset, kbContext);
  let written  = 0;

  for (const angle of angles) {
    if (isDuplicate(angle.angle_title, existingTitles)) {
      console.log(`    SKIP (duplicate): ${angle.angle_title.slice(0, 60)}`);
      continue;
    }

    await addRows(CI.table_id, [[
      { column: CI.columns.content_angle,   value: `${angle.angle_title}\n\n${angle.angle_desc}` },
      { column: CI.columns.source_asset,    value: asset.id },
      { column: CI.columns.platform_targets, value: angle.best_platforms.join(', ') },
      { column: CI.columns.content_type,    value: angle.content_type },
      { column: CI.columns.approval_status, value: 'Pending' },
    ]]);

    existingTitles.push(angle.angle_title);
    console.log(`    ✓ ${angle.content_type}: ${angle.angle_title.slice(0, 60)}`);
    written++;
    await sleep(300);
  }

  return written;
}

async function main(): Promise<void> {
  console.log(`\n[Content Strategist] Starting at ${new Date().toISOString()}`);

  // Get assets that are processed but have no linked ideas
  const allAssets    = await getRows(SA.table_id, `"${SA.columns.processed}":true`, 50);
  const existingIdeas = await getRows(CI.table_id, undefined, 500);

  // Find asset IDs that already have ideas
  const assetIdsWithIdeas = new Set(
    existingIdeas.map(r => String(r.values[CI.columns.source_asset]?.value ?? ''))
  );

  const toProcess = allAssets.filter(a => !assetIdsWithIdeas.has(a.id));
  console.log(`[Content Strategist] ${toProcess.length} assets need content angles`);

  if (toProcess.length === 0) {
    console.log('[Content Strategist] Nothing to process — done.\n');
    return;
  }

  const kbContext      = await getKnowledgeBase();
  const existingTitles = await getExistingAngleTitles();

  let total = 0;
  for (const asset of toProcess) {
    try {
      const n = await processAsset(asset, kbContext, existingTitles);
      total  += n;
    } catch (err) {
      console.error(`  ERROR processing asset ${asset.id}:`, err);
    }
    await sleep(1000);
  }

  console.log(`[Content Strategist] Done — ${total} content ideas created\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
