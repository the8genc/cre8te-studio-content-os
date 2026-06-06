/**
 * Agent 05 — The Newsletter Editor
 * Assembles that week's approved content packages into a weekly digest email.
 * Runs Thursday 8pm. Writes draft to Coda for human approval before Friday send.
 */
import 'dotenv/config';
import { getRows, addRows, sleep } from '../../lib/coda.js';
import { claudeComplete } from '../../lib/anthropic.js';
import researchTopics from '../../config/research-topics.json' with { type: 'json' };
import schema from '../../config/coda-schema.json' with { type: 'json' };

const CP  = schema.tables.content_packages;
const BP  = schema.tables.blog_posts;
const ND  = schema.tables.newsletter_drafts;
const SA  = schema.tables.source_assets;
const CI  = schema.tables.content_ideas;
const RI  = schema.tables.research_intelligence;

function getWeekOf(): string {
  const now   = new Date();
  const day   = now.getDay();
  const diff  = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function getFridayDate(): string {
  const now    = new Date();
  const day    = now.getDay();
  const diff   = day <= 5 ? 5 - day : 6;
  const friday = new Date(now);
  friday.setDate(now.getDate() + diff);
  return friday.toISOString().split('T')[0];
}

async function getThisWeeksPackages() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const all     = await getRows(CP.table_id, undefined, 100);
  return all.filter(pkg => {
    const status = String(pkg.values[CP.columns.publish_status]?.value ?? '');
    const date   = String(pkg.values[CP.columns.publish_date]?.value ?? '');
    return (status === 'Scheduled' || status === 'Published') && date >= weekAgo;
  });
}

/**
 * Pull creator economy stories: platform advancements, creator startups, ecosystem trends.
 * Feeds the Make-Monetize-Multiply section.
 */
async function getCreatorEconomyStories(): Promise<string> {
  try {
    const RI = schema.tables.research_intelligence;
    const rows = await getRows(RI.table_id, undefined, 100);
    const stories = rows
      .filter(r => {
        const tags  = String(r.values[RI.columns.use_case_tags]?.value ?? '');
        const score = Number(r.values[RI.columns.final_score]?.value  ?? 0);
        // Creator economy: platform updates, AI tools, industry news, ecosystem
        return (
          tags.includes('Newsletter Story') ||
          tags.includes('Platform Update')  ||
          tags.includes('AI Tool')          ||
          tags.includes('Industry News')
        ) && score >= 7.5;
      })
      .slice(0, 4)
      .map(r => `- ${r.values[RI.columns.item_title]?.value}: ${r.values[RI.columns.summary]?.value}`)
      .join('\n');
    return stories || 'No creator economy stories found this week.';
  } catch {
    return '';
  }
}

/**
 * Pull creative economy stories: music, film, fashion.
 * Feeds the "In the Creative Economy" section.
 */
async function getCreativeEconomyStories(): Promise<string> {
  try {
    const RI = schema.tables.research_intelligence;
    const rows = await getRows(RI.table_id, undefined, 100);
    const stories = rows
      .filter(r => {
        const tags    = String(r.values[RI.columns.use_case_tags]?.value ?? '');
        const title   = String(r.values[RI.columns.item_title]?.value    ?? '').toLowerCase();
        const summary = String(r.values[RI.columns.summary]?.value       ?? '').toLowerCase();
        const score   = Number(r.values[RI.columns.final_score]?.value   ?? 0);
        const creativeKeywords = ['music', 'film', 'fashion', 'movie', 'album', 'label',
          'streaming', 'box office', 'designer', 'collection', 'release', 'record'];
        const isCreative = creativeKeywords.some(k => title.includes(k) || summary.includes(k));
        return isCreative && score >= 7.0;
      })
      .slice(0, 3)
      .map(r => `- ${r.values[RI.columns.item_title]?.value}: ${r.values[RI.columns.summary]?.value}`)
      .join('\n');
    return stories || 'No creative economy stories found this week.';
  } catch {
    return '';
  }
}

/**
 * Resolve the live blog URL for a content package, if one has been published.
 * Used to replace [HERO_LINK] and [LINK_N] placeholders with real URLs.
 */
async function getBlogUrlForPackage(pkgId: string): Promise<string | null> {
  try {
    const BP = schema.tables.blog_posts;
    const blogPosts = await getRows(BP.table_id, `"${BP.columns.content_package}":"${pkgId}"`, 5);
    const published = blogPosts.find(p =>
      String(p.values[BP.columns.status]?.value ?? '') === 'Published' &&
      String(p.values[BP.columns.live_url]?.value ?? '').startsWith('http')
    );
    return published ? String(published.values[BP.columns.live_url].value) : null;
  } catch {
    return null;
  }
}



async function checkDraftExists(weekOf: string): Promise<boolean> {
  const drafts = await getRows(ND.table_id, undefined, 20);
  return drafts.some(d => String(d.values[ND.columns.week_of]?.value ?? '') === weekOf);
}

async function generateNewsletter(packages: Awaited<ReturnType<typeof getThisWeeksPackages>>, creatorEconomyStories: string, creativeEconomyStories: string, blogUrlMap?: Map<string, string>): Promise<{ subject: string; draft: string; heroId: string; supportingIds: string[] }> {
  // Score packages — Summit > Mini Pod > Testimonial > ITL
  const sourceScore: Record<string, number> = {
    'Summit Recording': 4,
    'Mini Pod':         3,
    'Testimonial':      2,
    'ITL Engagement':   1,
  };

  const scored = packages.map(pkg => {
    const blurb = String(pkg.values[CP.columns.newsletter_blurb]?.value ?? '');
    return { pkg, blurb, score: sourceScore['Summit Recording'] ?? 1 };
  }).filter(p => p.blurb.length > 20);

  scored.sort((a, b) => b.score - a.score);
  const [hero, ...supporting] = scored;

  if (!hero) throw new Error('No packages with newsletter blurbs found');

  const heroBlurb    = hero.blurb;
  const supportItems = supporting.slice(0, 5).map(s => s.blurb).join('\n\n');

  const system = `You are the newsletter editor for Cre8te Studio. You write warm, curated,
community-first weekly email digests. Your voice: like a trusted community member writing
to a close-knit group of creative entrepreneurs. Specific, warm, insider. Never corporate.

SUBJECT LINE RULES:
- ≤60 chars. Test against these proven patterns:
  Contrarian → "The advice everyone gives that's actually wrong"
  Specific claim → "How [name] hit [specific metric] with [surprising method]"
  Curiosity gap → "What happened when we tried [unexpected thing]"
  Community signal → reference 'this week', 'our community', 'what we captured'
- Never: generic ("This week in content"), clickbait, or promises you don't keep inside

NEWSLETTER SAVE-WORTHINESS:
- Include at least one section the reader will want to screenshot or save
- Authority content = frameworks, systems, checklists — write them to be save-worthy
- Label save-worthy sections clearly so readers know to bookmark them`;

  const user = `Write a complete Cre8te Sumthin weekly newsletter issue.

EPISODE / FEATURED CONTENT (From the Conversation source):
${heroBlurb}

SUPPORTING CONTENT THIS WEEK:
${supportItems}

CREATOR ECONOMY INTELLIGENCE (for Make-Monetize-Multiply — platform advancements, creator startups, ecosystem trends):
${creatorEconomyStories}

CREATIVE ECONOMY INTELLIGENCE (for In the Creative Economy — music, film, fashion):
${creativeEconomyStories}

Write the newsletter in these EIGHT EXACT SECTIONS in this order:

1. SUBJECT LINE (≤60 chars — one of: Contrarian / Specific metric / Curiosity gap / Community signal)

2. PREVIEW TEXT (≤90 chars, completes the subject's thought)

3. THE OPEN
   2-3 paragraphs in the founder's voice. Frank, specific, no "this week we have..." preamble.
   The opening must earn the rest of the read. Reference something real from the week —
   a conversation, an observation, something that happened — not a content summary.
   This is the most personal section. It sounds like a person, not a publication.

4. ONE THING WORTH YOUR TIME
   A single curated pick. One, not a list. Could be an article, tool, event, essay, or
   creator to follow. State the pick, then 1-2 sentences on why it's worth the reader's
   attention right now. Opinionated. If you wouldn't actually recommend it, don't write it.

5. FROM THE CONVERSATION
   A clip, quote, or moment pulled from the featured episode content.
   Sets up the link to the full episode. 3-5 sentences max.
   Include the [HERO_LINK] placeholder where the episode link goes.
   This is the content flywheel — every issue should make the reader want to listen.

6. MAKE-MONETIZE-MULTIPLY
   Practical creator economy intelligence from the research this week.
   Structure: Make (what to build or create), Monetize (how to earn from it),
   Multiply (how to scale or distribute it). 3 punchy paragraphs, one per beat.
   Grounded in creator economy research: platform advancements, startups helping creators
   earn more, ecosystem trends. Actionable, not aspirational.
   This is the save-worthy section — write it so readers bookmark it.

7. IN THE CREATIVE ECONOMY
   Intelligence from the creative economy this week — music, film, and fashion.
   NOT the same as the creator economy. This is about the industries where creative work
   is made and sold: new releases, industry deals, technology shifting production,
   business model changes in music/film/fashion, cultural moments worth noting.
   2-3 items, each 2-3 sentences. Curated, specific, no fluff.
   Format each item with a bold lead-in: **Music:** / **Film:** / **Fashion:**
   Use whichever 2-3 are most relevant this week based on research provided.
   If only 1-2 verticals have strong stories, use those — do not pad.

8. WORKING CREATOR
   Short profile or Q&A moment from someone in the Cre8te network.
   Draw from the supporting content or community testimonials.
   2-3 sentences intro + 1 direct quote or specific detail.
   Deepens relationships; carries the cultural positioning.
   If no specific person is available, write a placeholder: [WORKING CREATOR — insert this week's profile].

9. PARTNER SPOTLIGHT
   One partner, written in-voice, clearly labeled "Cre8te Partner."
   Editorial not promotional. Specific about why this partner matters to creators.
   If no active partner this week, write a placeholder: [PARTNER SPOTLIGHT — insert this week's partner].

10. THE CLOSE
   A question or reply hook. We want people writing back.
   1-2 sentences max. Direct, warm, specific to this issue.
   End with something like "Hit reply and tell me..." or "What would you add?"

Format as plain text with clear section headers labeled exactly as above.
Return as JSON:
{
  "subject_line": "...",
  "full_draft": "complete newsletter text with all 9 elements above"
}`;

  const raw  = await claudeComplete(system, user, 3000);
  const parsed = JSON.parse(raw.replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim()) as { subject_line: string; full_draft: string };

  // Replace link placeholders with real blog URLs if available
  let resolvedDraft = parsed.full_draft;
  if (blogUrlMap) {
    const heroUrl = blogUrlMap.get(hero.pkg.id);
    if (heroUrl) resolvedDraft = resolvedDraft.replace(/\[HERO_LINK\]/g, heroUrl);
    supporting.slice(0, 5).forEach((s, i) => {
      const url = blogUrlMap.get(s.pkg.id);
      if (url) resolvedDraft = resolvedDraft.replace(new RegExp(`\\[LINK_${i + 1}\\]`, 'g'), url);
    });
  }

  return {
    subject:       parsed.subject_line,
    draft:         resolvedDraft,
    heroId:        hero.pkg.id,
    supportingIds: supporting.slice(0, 5).map(s => s.pkg.id),
  };
}

async function main(): Promise<void> {
  console.log(`\n[Newsletter Editor] Starting at ${new Date().toISOString()}`);

  const weekOf = getWeekOf();
  const friday = getFridayDate();

  if (await checkDraftExists(weekOf)) {
    console.log(`[Newsletter Editor] Draft already exists for week of ${weekOf} — done.\n`);
    return;
  }

  const packages = await getThisWeeksPackages();
  console.log(`[Newsletter Editor] ${packages.length} packages found for this week`);

  if (packages.length === 0) {
    console.log('[Newsletter Editor] No published/scheduled content this week — skipping.\n');
    return;
  }

  const creatorEconomyStories  = await getCreatorEconomyStories();
  const creativeEconomyStories = await getCreativeEconomyStories();
  console.log(`[Newsletter Editor] Research stories loaded — creator economy + creative economy`);

  // Resolve live blog URLs for packages before assembly
  const blogUrlMap = new Map<string, string>();
  for (const { pkg } of [...(heroRef ? [heroRef] : []), ...supporting]) {
    const url = await getBlogUrlForPackage(pkg.id);
    if (url) blogUrlMap.set(pkg.id, url);
  }

  const { subject, draft, heroId, supportingIds } = await generateNewsletter(packages, creatorEconomyStories, creativeEconomyStories, blogUrlMap);

  await addRows(ND.table_id, [[
    { column: ND.columns.subject_line,    value: subject },
    { column: ND.columns.week_of,         value: weekOf },
    { column: ND.columns.hero_story,      value: heroId },
    { column: ND.columns.supporting_items, value: supportingIds.join(', ') },
    { column: ND.columns.full_draft,      value: draft },
    { column: ND.columns.approval_status, value: 'Pending' },
    { column: ND.columns.send_date,       value: friday },
  ]]);

  console.log(`[Newsletter Editor] Draft created for week of ${weekOf}`);
  console.log(`  Subject: "${subject}"`);
  console.log(`  Send date: ${friday}`);
  console.log(`  Status: Pending — awaiting approver review in Coda\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
