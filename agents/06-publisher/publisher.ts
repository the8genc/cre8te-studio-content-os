/**
 * Agent 06 — The Publisher
 * Posts approved content packages to all platforms via Postiz and sends newsletters via Kit.
 */
import 'dotenv/config';
import { getRows, updateRow, sleep } from '../../lib/coda.js';
import schema from '../../config/coda-schema.json' with { type: 'json' };

const CP = schema.tables.content_packages;
const ND = schema.tables.newsletter_drafts;
const CI = schema.tables.content_ideas;

const POSTIZ_KEY = process.env.POSTIZ_API_KEY!;
const POSTIZ_URL = process.env.POSTIZ_API_URL ?? 'https://api.postiz.com';
const KIT_KEY    = process.env.KIT_API_KEY!;
const KIT_URL    = 'https://api.kit.com/v4';

// ── Postiz social publishing ──────────────────────────────────────────────────
const PLATFORM_TO_POSTIZ: Record<string, string> = {
  Instagram: 'instagram',
  LinkedIn:  'linkedin',
  YouTube:   'youtube',
  TikTok:    'tiktok',
  Facebook:  'facebook',
};

const SCRIPT_COLUMN: Record<string, string> = {
  Instagram: CP.columns.instagram_script,
  LinkedIn:  CP.columns.linkedin_post,
  YouTube:   CP.columns.youtube_script,
  TikTok:    CP.columns.tiktok_script,
  Facebook:  CP.columns.facebook_post,
};

async function postizPublish(platform: string, content: string, publishDate: string): Promise<string> {
  const res = await fetch(`${POSTIZ_URL}/posts`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${POSTIZ_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      platform:    PLATFORM_TO_POSTIZ[platform],
      content,
      publish_at:  publishDate ? `${publishDate}T09:00:00Z` : new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error(`Postiz ${platform}: ${res.status} ${await res.text()}`);
  const data = await res.json() as { id: string; url?: string };
  return data.url ?? `postiz:${data.id}`;
}

async function publishSocialPackage(pkg: Awaited<ReturnType<typeof getRows>>[0]): Promise<void> {
  const title       = String(pkg.values[CP.columns.package_title]?.value ?? pkg.id);
  const publishDate = String(pkg.values[CP.columns.publish_date]?.value ?? '');
  const ideaRef     = String(pkg.values[CP.columns.content_idea]?.value ?? '');

  // Get platform targets from linked content idea
  const ideas = await getRows(CI.table_id, undefined, 500);
  const idea  = ideas.find(i => i.id === ideaRef);
  const platformsStr = idea ? String(idea.values[CI.columns.platform_targets]?.value ?? '') : '';
  const platforms    = platformsStr.split(',').map(p => p.trim()).filter(Boolean);

  if (platforms.length === 0) {
    console.warn(`    SKIP ${title}: no platform targets found`);
    return;
  }

  const publishedLinks: Record<string, string> = {};
  let anyFailed = false;

  for (const platform of platforms) {
    const colId  = SCRIPT_COLUMN[platform];
    if (!colId) { console.warn(`    SKIP unknown platform: ${platform}`); continue; }
    const content = String(pkg.values[colId]?.value ?? '');
    if (!content) { console.warn(`    SKIP ${platform}: empty script`); continue; }

    try {
      const url = await postizPublish(platform, content, publishDate);
      publishedLinks[platform] = url;
      console.log(`    ✓ ${platform}: ${url}`);
    } catch (err) {
      publishedLinks[platform] = `FAILED — ${err instanceof Error ? err.message : String(err)}`;
      anyFailed = true;
      console.error(`    ✗ ${platform}:`, err);
    }
    await sleep(500);
  }

  await updateRow(CP.table_id, pkg.id, [
    { column: CP.columns.published_links, value: JSON.stringify(publishedLinks, null, 2) },
    { column: CP.columns.publish_status,  value: anyFailed ? 'Scheduled' : 'Published' },
  ]);
}

// ── Kit newsletter sending ────────────────────────────────────────────────────
async function sendNewsletter(draft: Awaited<ReturnType<typeof getRows>>[0]): Promise<void> {
  const subject  = String(draft.values[ND.columns.subject_line]?.value ?? 'This Week in Cre8te');
  const content  = String(draft.values[ND.columns.full_draft]?.value ?? '');
  const sendDate = String(draft.values[ND.columns.send_date]?.value ?? '');

  const sendAt = sendDate ? `${sendDate}T08:00:00Z` : new Date().toISOString();

  const res = await fetch(`${KIT_URL}/broadcasts`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${KIT_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      broadcast: {
        subject,
        content:  `<pre style="font-family:sans-serif;white-space:pre-wrap">${content}</pre>`,
        public:   false,
        send_at:  sendAt,
      },
    }),
  });

  if (!res.ok) throw new Error(`Kit API: ${res.status} ${await res.text()}`);
  const data = await res.json() as { broadcast?: { id: number } };

  await updateRow(ND.table_id, draft.id, [
    { column: ND.columns.approval_status, value: 'Sent' },
  ]);

  console.log(`  ✓ Newsletter sent via Kit (broadcast ID: ${data.broadcast?.id})`);
  console.log(`    Subject: "${subject}" | Send at: ${sendAt}`);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`\n[Publisher] Starting at ${new Date().toISOString()}`);
  const today = new Date().toISOString().split('T')[0];

  // Social posts
  const allPackages = await getRows(CP.table_id, `"${CP.columns.publish_status}":"Scheduled"`, 50);
  const duePackages = allPackages.filter(pkg => {
    const date = String(pkg.values[CP.columns.publish_date]?.value ?? '');
    return !date || date <= today;
  });
  const alreadyPublished = allPackages.filter(pkg => {
    const links = String(pkg.values[CP.columns.published_links]?.value ?? '');
    return links.length > 5; // has content
  });
  const toPublish = duePackages.filter(pkg =>
    !alreadyPublished.some(p => p.id === pkg.id)
  );

  console.log(`[Publisher] ${toPublish.length} social packages due for publishing`);
  for (const pkg of toPublish) {
    const title = String(pkg.values[CP.columns.package_title]?.value ?? pkg.id);
    console.log(`  Publishing: ${title}`);
    try { await publishSocialPackage(pkg); }
    catch (err) { console.error(`  ERROR:`, err); }
    await sleep(1000);
  }

  // Newsletter
  const pendingNewsletters = await getRows(ND.table_id, `"${ND.columns.approval_status}":"Approved"`, 10);
  const dueNewsletters = pendingNewsletters.filter(d => {
    const sendDate = String(d.values[ND.columns.send_date]?.value ?? '');
    return !sendDate || sendDate <= today;
  });

  console.log(`[Publisher] ${dueNewsletters.length} newsletters due to send`);
  for (const draft of dueNewsletters) {
    try { await sendNewsletter(draft); }
    catch (err) { console.error(`  ERROR sending newsletter:`, err); }
    await sleep(1000);
  }

  console.log('[Publisher] Done\n');
}

main().catch(err => { console.error(err); process.exit(1); });
