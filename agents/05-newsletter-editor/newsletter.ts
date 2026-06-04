/**
 * Agent 05 — The Newsletter Editor
 * Assembles that week's approved content packages into a weekly digest email.
 * Runs Thursday 8pm. Writes draft to Coda for human approval before Friday send.
 */
import 'dotenv/config';
import { getRows, addRows, sleep } from '../../lib/coda.js';
import { claudeComplete } from '../../lib/anthropic.js';
import researchTopics from '../../config/research-topics.json' assert { type: 'json' };
import schema from '../../config/coda-schema.json' assert { type: 'json' };

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

async function getResearchStories(): Promise<string> {
  try {
    const rows = await getRows(RI.table_id, undefined, 50);
    const stories = rows
      .filter(r => {
        const tags  = String(r.values[RI.columns.use_case_tags]?.value ?? '');
        const score = Number(r.values[RI.columns.final_score]?.value ?? 0);
        return tags.includes('Newsletter Story') && score >= 7.5;
      })
      .slice(0, 3)
      .map(r => `- ${r.values[RI.columns.item_title]?.value}: ${r.values[RI.columns.summary]?.value}`)
      .join('\n');
    return stories || 'No external stories found this week.';
  } catch {
    return '';
  }
}

async function checkDraftExists(weekOf: string): Promise<boolean> {
  const drafts = await getRows(ND.table_id, undefined, 20);
  return drafts.some(d => String(d.values[ND.columns.week_of]?.value ?? '') === weekOf);
}

async function generateNewsletter(packages: Awaited<ReturnType<typeof getThisWeeksPackages>>, researchStories: string, blogUrlMap?: Map<string, string>): Promise<{ subject: string; draft: string; heroId: string; supportingIds: string[] }> {
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

  const user = `Write a complete weekly newsletter digest for Cre8te Studio.

HERO STORY (featured content):
${heroBlurb}

SUPPORTING ITEMS (3-5 items):
${supportItems}

WHAT'S HAPPENING IN THE CREATOR ECONOMY (from our research this week):
${researchStories}

Write the newsletter in this EXACT structure:
1. Subject line (≤60 chars — choose the strongest from these options and write ONE:
   a. Contrarian: challenge something creators believe
   b. Specific metric: "[name] hit [number] with [surprising method]"
   c. Curiosity gap: makes reader feel they'll miss something important
   d. Community signal: "what we captured this week" / "our community is talking about")
2. Preview text (completes the subject's thought, ≤90 chars)
3. Hero section (2-3 sentences context + the insight + link placeholder [HERO_LINK])
4. "This Week in Cre8te" (3-5 blurbs — mark the most save-worthy one with 📌)
5. "What's Happening in the Creator Economy" (2-3 sentences from research — include 1 actionable takeaway)
6. Community Spotlight (testimonial-style moment from the community)
7. "What's Coming" (1-2 sentences teasing next week)
8. CTA — single clear action aligned to one of these:
   - Grow the owned audience: "Subscribe / share this with one creator you know"
   - Drive event attendance: "Register for [upcoming session]"
   - Drive saves: "Bookmark this edition — section 4 is worth keeping"

Format as plain text with clear section headers. Return as JSON:
{
  "subject_line": "...",
  "full_draft": "complete newsletter text with all sections"
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

  const researchStories = await getResearchStories();
  console.log(`[Newsletter Editor] Research stories loaded`);

  // Resolve live blog URLs for packages before assembly
const blogUrlMap = new Map<string, string>();
for (const { pkg } of [...(heroRef ? [heroRef] : []), ...supporting]) {
  const url = await getBlogUrlForPackage(pkg.id);
  if (url) blogUrlMap.set(pkg.id, url);
}

const { subject, draft, heroId, supportingIds } = await generateNewsletter(packages, researchStories, blogUrlMap);

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
