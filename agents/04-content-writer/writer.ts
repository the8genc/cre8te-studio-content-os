/**
 * Agent 04 — The Content Writer
 * Takes approved content ideas and generates full platform-specific content packages.
 */
import 'dotenv/config';
import { getRows, addRows, updateRow, sleep, type CodaRow } from '../../lib/coda.js';
import { claudeComplete, parseJsonResponse } from '../../lib/anthropic.js';
import platformSpecs from '../../config/platform-specs.json' with { type: 'json' };
import schema from '../../config/coda-schema.json' with { type: 'json' };

const CI  = schema.tables.content_ideas;
const SA  = schema.tables.source_assets;
const CP  = schema.tables.content_packages;
const KB  = schema.tables.brand_voice_kb;

interface ContentPackage {
  package_title:     string;
  instagram_script:  string;
  youtube_script:    string;
  linkedin_post:     string;
  tiktok_script:     string;
  facebook_post:     string;
  newsletter_blurb:  string;
  // Blog post — long-form version for Framer CMS
  blog_title:        string;
  blog_excerpt:      string;  // 2-3 sentences for SEO meta + blog index
  blog_body:         string;  // full HTML post body, 600-900 words
  blog_category:     string;
  blog_tags:         string;  // comma-separated
  blog_seo_title:    string;
  blog_seo_description: string;
  is_paywalled:      boolean; // true = gated content for subscribers
  paywall_teaser:    string;  // first ~300 chars shown to non-subscribers
}

// Extracted from idea row — drives framework and CTA selection
interface ContentContext {
  bucket:     string;   // Growth | Authority | Conversion
  framework:  string;   // AIDA | PAS | StoryArc
  cta:        string;   // recommended CTA text from strategist
}

async function getKBContext(): Promise<string> {
  const rows = await getRows(KB.table_id, undefined, 50);
  return rows
    .slice(0, 10)
    .map(r => `[${r.values[KB.columns.content_type]?.value}] ${r.values[KB.columns.content]?.value}`)
    .join('\n');
}

async function getSourceAsset(assetId: string): Promise<CodaRow | null> {
  const rows = await getRows(SA.table_id, undefined, 500);
  return rows.find(r => r.id === assetId) ?? null;
}

async function generatePackage(idea: CodaRow, transcript: string, kbContext: string, ctx: ContentContext): Promise<ContentPackage> {
  const angleText = String(idea.values[CI.columns.content_angle]?.value ?? '');
  const platforms = String(idea.values[CI.columns.platform_targets]?.value ?? '');

  const specs = Object.entries(platformSpecs.platforms)
    .map(([p, s]) => `${p.toUpperCase()}: max ${(s as Record<string,unknown>).caption_max_chars ?? (s as Record<string,unknown>).post_max_chars ?? 'n/a'} chars | tone: ${(s as Record<string,unknown>).tone}`)
    .join('\n');

  const system = `You are the lead content writer for Cre8te Studio. You write community-first
content grounded in specific moments from real conversations. You never write generic AI content.
Every script must reference something specific from the transcript — a quote, a named moment,
a real person's insight. Brand voice: inspirational, warm, specific, never corporate.

CONTENT BUCKET RULES — apply based on the bucket provided:

Growth (bucket: drives reach, shares, new followers):
- Lead with the relatable story or contrarian take
- Hook pattern: StoryArc (Setup→Conflict→Decision→Outcome→Lesson, 1-2 sentences per beat)
- CTA: question or binary choice to spark replies ("Which step are you trying first?")

Authority (bucket: drives saves, trust, expert positioning):
- Lead with the insight or framework — state it plainly in the hook
- Hook pattern: PAS (name the pain, give cost of pain in concrete terms, offer the fix)
- CTA: ALWAYS a save CTA ("Save this before your next post.") — saves are the #1 metric right now
- These posts are bookmarked, not always liked — design for saves not reactions

Conversion (bucket: drives DMs, subscribers, clients):
- Lead with the outcome or before/after
- Hook pattern: AIDA (sharp hook, prove the pain, paint better state, CTA)
- CTA: keyword reply that drives comment volume and DM conversations ("Comment [WORD] and I'll send it to you")

HOOK RULES (all platforms):
- 8-12 words. Simple verbs with slight tension.
- End with ellipsis or open loop — force the reader to expand
- Draft the body first, then mine the hook from the middle of the post
- If the hook needs context to make sense, it is not a hook

LINKEDIN SPECIFIC:
- Never start with "I"
- No em-dashes anywhere in the post
- 3 hashtags max
- 210 chars visible before "see more" — the hook IS the ad
- Apply the ${ctx.framework} framework for this post's structure.

BLOG POST GENERATION:
For Authority and Growth bucket content, you MUST also write a full blog post for the
Cre8te Studio website (Framer CMS). This turns every social post into a permanent,
SEO-indexed owned media asset. Authority posts may be paywalled (deeper systems/frameworks);
Growth posts are free (broad appeal, SEO traffic drivers).`;

  const user = `Write a complete content package for this approved angle.

CONTENT CONTEXT:
- Bucket: ${ctx.bucket} — ${ctx.bucket === 'Growth' ? 'optimize for reach and shares' : ctx.bucket === 'Authority' ? 'optimize for saves and bookmarks — PRIORITY METRIC' : 'optimize for DMs and conversions'}
- LinkedIn framework: ${ctx.framework}
- Recommended CTA: ${ctx.cta}

CONTENT ANGLE:
${angleText}

PLATFORM TARGETS: ${platforms}

TRANSCRIPT EXCERPT (find the specific moment this angle references):
${transcript.slice(0, 4000)}

BRAND VOICE KNOWLEDGE BASE:
${kbContext}

PLATFORM SPECS:
${specs}

Write all 6 outputs. Return JSON only:
{
  "package_title": "short internal title for this package",
  "instagram_script": "hook (<=125 chars)\\n\\nbody\\n\\n#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5",
  "youtube_script": "TITLE: ...\\n\\nDESCRIPTION: ...\\n\\nTAGS: tag1, tag2, tag3...",
  "linkedin_post": "hook (<=210 chars, insight stated plainly)\\n\\nbody\\n\\n#tag1 #tag2 #tag3",
  "tiktok_script": "HOOK (0-2s): ...\\n\\nSCRIPT:\\n- point 1\\n- point 2\\n- point 3\\n\\nCAPTION: short caption #hashtag",
  "facebook_post": "conversational opening\\n\\nbody with warmth\\n\\nengagement question?",
  "newsletter_blurb": "2-3 sentence warm, insider-tone blurb. Standalone readable. No link teaser.",
  "blog_title": "SEO-optimised blog post title (different from LinkedIn hook — more complete, searchable)",
  "blog_excerpt": "2-3 sentence excerpt for blog index and SEO meta description. Standalone, compelling.",
  "blog_body": "Full HTML blog post, 600-900 words. Structure: <h2> subheadings, <p> paragraphs, <ul>/<ol> for lists. Open with the hook story. Build to the framework or insight. Close with community CTA. Grounded in the source transcript — quote the speaker directly.",
  "blog_category": "One of: Community, Creator Economy, Strategy, Tools, Behind The Scenes, Member Stories",
  "blog_tags": "3-5 comma-separated tags, lowercase, no spaces (e.g. 'personal-branding,creator-economy,linkedin')",
  "blog_seo_title": "≤60 chars. Include primary keyword. Different from the post title if needed.",
  "blog_seo_description": "≤160 chars. What the reader gets from reading this post. Action-oriented.",
  "is_paywalled": false,
  "paywall_teaser": "First ~300 chars of the blog body that free visitors will see before the gate"
}

BLOG POST RULES:
- Paywalled (is_paywalled: true): deeper frameworks, exclusive data, step-by-step systems,
  member-only insights. Set paywall_teaser to the hook section that makes them want more.
- Free (is_paywalled: false): community stories, broad insights, top-of-funnel content,
  anything with SEO value that grows the owned audience.
- Authority bucket content → always generate a blog post (paywalled or free based on depth)
- Growth bucket content → free blog post (SEO value, community reach)
- Conversion bucket content → no blog post (these stay social-only)
- Blog body must quote the speaker directly at least once — authenticity is the differentiator

VOICE RULES:
- Ground every script in the specific transcript moment (quote or direct reference)
- Use the speaker's actual phrasing where possible
- Never write: "In today's world", "Have you ever wondered", "At the end of the day"
- LinkedIn: never start with "I", no em-dashes, 3 hashtags max, apply ${ctx.framework} structure
- TikTok: hook must land in first 2 seconds — most surprising or specific line
- Authority posts on ALL platforms: end with a save CTA — not a like, not a comment, a save
- Conversion posts: use keyword reply CTA format — drives comment volume + DMs
- Growth posts: end with a question or binary choice to spark replies`;

  const raw = await claudeComplete(system, user, 4000);
  return parseJsonResponse<ContentPackage>(raw);
}

async function processIdea(idea: CodaRow, kbContext: string): Promise<void> {
  const angleText = String(idea.values[CI.columns.content_angle]?.value ?? '').slice(0, 60);
  const assetRef  = String(idea.values[CI.columns.source_asset]?.value ?? '');

  console.log(`  Writing package for: ${angleText}...`);

  const asset = await getSourceAsset(assetRef);
  if (!asset) { console.warn(`    SKIP: source asset not found (${assetRef})`); return; }

  const transcript = String(asset.values[SA.columns.transcript]?.value ?? '');
  if (!transcript) { console.warn(`    SKIP: no transcript on source asset`); return; }

  // Extract bucket/framework/CTA context set by the Strategist
  const ctx: ContentContext = {
    bucket:    String(idea.values[CI.columns.content_bucket]?.value    ?? 'Authority'),
    framework: String(idea.values[CI.columns.linkedin_framework]?.value ?? 'PAS'),
    cta:       String(idea.values[CI.columns.recommended_cta]?.value   ?? 'Save this for your next content sprint.'),
  };

  const pkg = await generatePackage(idea, transcript, kbContext, ctx);

  await addRows(CP.table_id, [[
    { column: CP.columns.package_title,    value: pkg.package_title },
    { column: CP.columns.content_idea,     value: idea.id },
    { column: CP.columns.instagram_script, value: pkg.instagram_script },
    { column: CP.columns.youtube_script,   value: pkg.youtube_script },
    { column: CP.columns.linkedin_post,    value: pkg.linkedin_post },
    { column: CP.columns.tiktok_script,    value: pkg.tiktok_script },
    { column: CP.columns.facebook_post,    value: pkg.facebook_post },
    { column: CP.columns.newsletter_blurb,     value: pkg.newsletter_blurb     },
    { column: CP.columns.blog_title,           value: pkg.blog_title           },
    { column: CP.columns.blog_excerpt,         value: pkg.blog_excerpt         },
    { column: CP.columns.blog_body,            value: pkg.blog_body            },
    { column: CP.columns.blog_category,        value: pkg.blog_category        },
    { column: CP.columns.blog_tags,            value: pkg.blog_tags            },
    { column: CP.columns.blog_seo_title,       value: pkg.blog_seo_title       },
    { column: CP.columns.blog_seo_description, value: pkg.blog_seo_description },
    { column: CP.columns.is_paywalled,         value: pkg.is_paywalled         },
    { column: CP.columns.paywall_teaser,       value: pkg.paywall_teaser       },
    { column: CP.columns.publish_status,       value: 'Draft'                  },
  ]]);

  console.log(`    ✓ Package created: ${pkg.package_title}`);
}

async function main(): Promise<void> {
  console.log(`\n[Content Writer] Starting at ${new Date().toISOString()}`);

  const approvedIdeas = await getRows(CI.table_id, `"${CI.columns.approval_status}":"Approved"`, 50);

  // Filter out ideas that already have packages
  const existingPackages = await getRows(CP.table_id, undefined, 500);
  const ideaIdsWithPackages = new Set(
    existingPackages.map(r => String(r.values[CP.columns.content_idea]?.value ?? ''))
  );

  const toWrite = approvedIdeas.filter(i => !ideaIdsWithPackages.has(i.id));
  console.log(`[Content Writer] ${toWrite.length} approved ideas need content packages`);

  if (toWrite.length === 0) { console.log('[Content Writer] Nothing to write — done.\n'); return; }

  const kbContext = await getKBContext();
  let success = 0, errors = 0;

  for (const idea of toWrite) {
    try {
      await processIdea(idea, kbContext);
      success++;
    } catch (err) {
      errors++;
      console.error(`  ERROR on idea ${idea.id}:`, err);
    }
    await sleep(1500);
  }

  console.log(`[Content Writer] Done — ${success} packages created, ${errors} errors\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
