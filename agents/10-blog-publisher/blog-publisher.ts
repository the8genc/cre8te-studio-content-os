/**
 * Agent 10 — The Blog Publisher
 * Publishes approved blog post drafts to Framer CMS, deploys to production,
 * writes live URLs back to Coda so Newsletter Editor can reference them.
 */
import 'dotenv/config';
import { getRows, updateRow, addRows, sleep, type CodaRow } from '../../lib/coda.js';
import { publishBlogPost, listBlogPosts } from '../../lib/framer.js';
import schema from '../../config/coda-schema.json' assert { type: 'json' };

const BP = schema.tables.blog_posts;
const CP = schema.tables.content_packages;

function toSlug(title: string, date: string): string {
  const dateStr  = date.slice(0, 10); // YYYY-MM-DD
  const titleStr = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${dateStr}-${titleStr}`;
}

function makeUniqueSlug(base: string, existingSlugs: Set<string>): string {
  if (!existingSlugs.has(base)) return base;
  let i = 2;
  while (existingSlugs.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

async function publishPost(row: CodaRow, existingSlugs: Set<string>): Promise<void> {
  const title       = String(row.values[BP.columns.title]?.value           ?? '');
  const body        = String(row.values[BP.columns.body]?.value            ?? '');
  const excerpt     = String(row.values[BP.columns.excerpt]?.value         ?? '');
  const category    = String(row.values[BP.columns.category]?.value        ?? 'Community');
  const tagsStr     = String(row.values[BP.columns.tags]?.value            ?? '');
  const isPaywalled = Boolean(row.values[BP.columns.is_paywalled]?.value   ?? false);
  const paywallTeaser = String(row.values[BP.columns.paywall_teaser]?.value ?? excerpt.slice(0, 300));
  const seoTitle    = String(row.values[BP.columns.seo_title]?.value       ?? title);
  const seoDesc     = String(row.values[BP.columns.seo_description]?.value ?? excerpt.slice(0, 160));
  const pkgId       = String(row.values[BP.columns.content_package]?.value ?? '');
  const collectionId = process.env.FRAMER_BLOG_COLLECTION_ID ?? '';

  if (!title || !body) {
    console.warn(`  SKIP ${row.id}: missing title or body`);
    await updateRow(BP.table_id, row.id, [{ column: BP.columns.status, value: 'Error — Missing content' }]);
    return;
  }

  const baseSlug = toSlug(title, new Date().toISOString());
  const slug     = makeUniqueSlug(baseSlug, existingSlugs);
  existingSlugs.add(slug);

  console.log(`  Publishing: "${title}" → /${slug}${isPaywalled ? ' 🔒 PAYWALLED' : ''}`);

  await updateRow(BP.table_id, row.id, [{ column: BP.columns.status, value: 'Publishing' }]);

  const result = await publishBlogPost({
    slug,
    title,
    excerpt,
    body,
    author:          'Cre8te Studio',
    category,
    tags:            tagsStr.split(',').map(t => t.trim()).filter(Boolean),
    published_date:  new Date().toISOString().split('T')[0],
    is_paywalled:    isPaywalled,
    paywall_teaser:  paywallTeaser,
    seo_title:       seoTitle,
    seo_description: seoDesc,
  }, collectionId);

  // Write back to Blog Posts table
  await updateRow(BP.table_id, row.id, [
    { column: BP.columns.framer_cms_id, value: result.cms_item_id },
    { column: BP.columns.live_url,      value: result.live_url    },
    { column: BP.columns.status,        value: 'Published'        },
    { column: BP.columns.published_at,  value: result.published_at },
  ]);

  // Update linked Content Package with blog URL
  if (pkgId) {
    const packages = await getRows(CP.table_id, undefined, 500);
    const pkg      = packages.find(p => p.id === pkgId);
    if (pkg) {
      const existingLinks = String(pkg.values[CP.columns.published_links]?.value ?? '{}');
      let links: Record<string, string> = {};
      try { links = JSON.parse(existingLinks); } catch { /* empty */ }
      links['Blog'] = result.live_url;
      await updateRow(CP.table_id, pkgId, [
        { column: CP.columns.published_links, value: JSON.stringify(links) },
      ]);
    }
  }

  console.log(`  ✓ Live: ${result.live_url}`);
}

async function main(): Promise<void> {
  console.log(`\n[Blog Publisher] Starting at ${new Date().toISOString()}`);

  const readyPosts = await getRows(
    BP.table_id,
    `"${BP.columns.status}":"Ready to Publish"`,
    20
  );
  console.log(`[Blog Publisher] ${readyPosts.length} posts ready to publish`);

  if (readyPosts.length === 0) {
    console.log('[Blog Publisher] Nothing to publish — done.\n');
    return;
  }

  // Load existing Framer slugs to prevent collisions
  let existingSlugs = new Set<string>();
  try {
    const existing = await listBlogPosts();
    existingSlugs  = new Set(existing.map(p => p.slug));
    console.log(`[Blog Publisher] ${existingSlugs.size} existing posts in Framer`);
  } catch (err) {
    console.warn('[Blog Publisher] Could not fetch existing slugs:', err);
  }

  let published = 0, errors = 0;
  for (const post of readyPosts) {
    try {
      await publishPost(post, existingSlugs);
      published++;
    } catch (err) {
      errors++;
      const title = String(post.values[BP.columns.title]?.value ?? post.id);
      console.error(`  ERROR "${title}":`, err);
      try {
        const msg = err instanceof Error ? err.message.slice(0, 100) : String(err);
        await updateRow(BP.table_id, post.id, [
          { column: BP.columns.status, value: `Error — ${msg}` },
        ]);
      } catch { /* log failure is non-fatal */ }
    }
    await sleep(2000); // Framer API: give time between WebSocket sessions
  }

  console.log(`[Blog Publisher] Done — ${published} published, ${errors} errors\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
