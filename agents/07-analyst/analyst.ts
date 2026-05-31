/**
 * Agent 07 — The Analyst & Knowledge Updater
 * Pulls prior week analytics from all platforms, logs to Coda, and feeds
 * winning hooks/patterns back into the Brand Voice Knowledge Base.
 */
import 'dotenv/config';
import { getRows, addRows, sleep } from '../../lib/coda.js';
import { claudeComplete } from '../../lib/anthropic.js';
import schema from '../../config/coda-schema.json' assert { type: 'json' };

const CP  = schema.tables.content_packages;
const AL  = schema.tables.analytics_log;
const KB  = schema.tables.brand_voice_kb;
const CI  = schema.tables.content_ideas;

interface PlatformMetrics {
  platform:        string;
  views_reach:     number;
  engagement_rate: number;
  top_comment:     string;
}

// ── Platform analytics fetchers ───────────────────────────────────────────────
// NOTE: These require platform-specific API credentials and OAuth setup.
// Each returns normalised PlatformMetrics. Stub implementations log what
// would be called — replace with live API calls once credentials are configured.

async function fetchInstagramMetrics(postUrl: string): Promise<PlatformMetrics | null> {
  // Instagram Graph API: GET /{media_id}/insights?metric=reach,impressions,engagement
  console.log(`    [Instagram Analytics] Would fetch: ${postUrl}`);
  return null; // Replace with live API call
}

async function fetchLinkedInMetrics(postUrl: string): Promise<PlatformMetrics | null> {
  // LinkedIn Marketing API: GET /organizationalEntityShareStatistics
  console.log(`    [LinkedIn Analytics] Would fetch: ${postUrl}`);
  return null;
}

async function fetchYouTubeMetrics(postUrl: string): Promise<PlatformMetrics | null> {
  // YouTube Data API v3: GET /videos?part=statistics&id={video_id}
  console.log(`    [YouTube Analytics] Would fetch: ${postUrl}`);
  return null;
}

async function fetchTikTokMetrics(postUrl: string): Promise<PlatformMetrics | null> {
  // TikTok Display API
  console.log(`    [TikTok Analytics] Would fetch: ${postUrl}`);
  return null;
}

async function fetchFacebookMetrics(postUrl: string): Promise<PlatformMetrics | null> {
  // Facebook Graph API
  console.log(`    [Facebook Analytics] Would fetch: ${postUrl}`);
  return null;
}

async function fetchKitMetrics(broadcastId: string): Promise<PlatformMetrics | null> {
  const res = await fetch(`https://api.kit.com/v4/broadcasts/${broadcastId}/stats`, {
    headers: { 'Authorization': `Bearer ${process.env.KIT_API_KEY}` },
  });
  if (!res.ok) return null;
  const data = await res.json() as { open_rate?: number; click_rate?: number };
  return {
    platform:        'Newsletter',
    views_reach:     0,
    engagement_rate: Number(data.open_rate ?? 0),
    top_comment:     `Open rate: ${data.open_rate ?? 0}% | Click rate: ${data.click_rate ?? 0}%`,
  };
}

const PLATFORM_FETCHERS: Record<string, (url: string) => Promise<PlatformMetrics | null>> = {
  Instagram: fetchInstagramMetrics,
  LinkedIn:  fetchLinkedInMetrics,
  YouTube:   fetchYouTubeMetrics,
  TikTok:    fetchTikTokMetrics,
  Facebook:  fetchFacebookMetrics,
  Newsletter: fetchKitMetrics,
};

// ── Knowledge Base update ─────────────────────────────────────────────────────
async function extractAndStoreHook(
  pkg:     Awaited<ReturnType<typeof getRows>>[0],
  platform: string,
  metrics:  PlatformMetrics
): Promise<void> {
  const instScript = String(pkg.values[CP.columns.instagram_script]?.value ?? '');
  const liPost     = String(pkg.values[CP.columns.linkedin_post]?.value ?? '');
  const content    = platform === 'Instagram' ? instScript : liPost;
  const hookLine   = content.split('\n')[0].trim();
  if (!hookLine || hookLine.length < 10) return;

  // Check for duplicate in KB
  const existing = await getRows(KB.table_id, undefined, 200);
  const alreadyExists = existing.some(r => {
    const kbContent = String(r.values[KB.columns.content]?.value ?? '');
    return kbContent.slice(0, 50) === hookLine.slice(0, 50);
  });
  if (alreadyExists) return;

  const weekStr = new Date().toISOString().slice(0, 10);
  const pkgTitle = String(pkg.values[CP.columns.package_title]?.value ?? pkg.id);

  await addRows(KB.table_id, [[
    { column: KB.columns.entry_title,  value: `High-performing hook — ${platform} — ${weekStr}` },
    { column: KB.columns.content_type, value: 'Hook' },
    { column: KB.columns.content,      value: hookLine },
    { column: KB.columns.source,       value: `${pkgTitle} — ${platform} — ${metrics.engagement_rate}% engagement` },
    { column: KB.columns.tags,         value: `${platform}, hook, ${weekStr}` },
  ]]);

  console.log(`    → KB updated: "${hookLine.slice(0, 60)}"`);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`\n[Analyst] Starting at ${new Date().toISOString()}`);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const allPkgs = await getRows(CP.table_id, `"${CP.columns.publish_status}":"Published"`, 100);
  const lastWeek = allPkgs.filter(pkg => {
    const date = String(pkg.values[CP.columns.publish_date]?.value ?? '');
    return date >= weekAgo;
  });

  console.log(`[Analyst] ${lastWeek.length} published packages from the last 7 days`);

  const allMetrics: Array<{ pkg: typeof lastWeek[0]; platform: string; metrics: PlatformMetrics }> = [];

  for (const pkg of lastWeek) {
    const linksStr = String(pkg.values[CP.columns.published_links]?.value ?? '{}');
    let links: Record<string, string> = {};
    try { links = JSON.parse(linksStr); } catch { continue; }

    for (const [platform, url] of Object.entries(links)) {
      if (url.startsWith('FAILED')) continue;
      const fetcher = PLATFORM_FETCHERS[platform];
      if (!fetcher) continue;

      try {
        const metrics = await fetcher(url);
        if (!metrics) continue;

        await addRows(AL.table_id, [[
          { column: AL.columns.log_entry,       value: `${String(pkg.values[CP.columns.package_title]?.value ?? pkg.id)} — ${platform}` },
          { column: AL.columns.content_package, value: pkg.id },
          { column: AL.columns.platform,        value: platform },
          { column: AL.columns.views_reach,     value: metrics.views_reach },
          { column: AL.columns.engagement_rate, value: metrics.engagement_rate },
          { column: AL.columns.top_comment,     value: metrics.top_comment },
          { column: AL.columns.logged_date,     value: new Date().toISOString().split('T')[0] },
        ]]);

        allMetrics.push({ pkg, platform, metrics });
        console.log(`  ✓ Logged ${platform}: ${metrics.engagement_rate}% engagement`);
        await sleep(300);
      } catch (err) {
        console.error(`  ERROR fetching ${platform} for ${pkg.id}:`, err);
      }
    }
  }

  // Identify top performers (engagement > 2x median)
  if (allMetrics.length > 0) {
    const rates   = allMetrics.map(m => m.metrics.engagement_rate).sort((a, b) => a - b);
    const median  = rates[Math.floor(rates.length / 2)] ?? 0;
    const threshold = median * 2;

    console.log(`\n[Analyst] Median engagement: ${median}% | Top performer threshold: ${threshold}%`);

    const topPerformers = allMetrics.filter(m => m.metrics.engagement_rate >= threshold);
    console.log(`[Analyst] ${topPerformers.length} top performers — updating Knowledge Base`);

    for (const { pkg, platform, metrics } of topPerformers) {
      await extractAndStoreHook(pkg, platform, metrics);
      await sleep(500);
    }
  }

  console.log('[Analyst] Done\n');
}

main().catch(err => { console.error(err); process.exit(1); });
