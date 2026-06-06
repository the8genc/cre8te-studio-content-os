/**
 * Agent 08 — The Research Scout
 * Surfaces creator economy intelligence from web, LinkedIn, Instagram, and TikTok.
 * Scores items and writes to Coda Research Intelligence table.
 */
import 'dotenv/config';
import { addRows, sleep, type CodaCell } from '../../lib/coda.js';
import { claudeComplete, parseJsonResponse } from '../../lib/anthropic.js';
import { runActor, type ApifyItem } from '../../lib/apify.js';
import researchTopics from '../../config/research-topics.json' with { type: 'json' };
import schema from '../../config/coda-schema.json' with { type: 'json' };

const RI_TABLE = schema.tables.research_intelligence.table_id;
const RI_COLS  = schema.tables.research_intelligence.columns;

// ── Types ─────────────────────────────────────────────────────────────────────
interface RawItem {
  title:       string;
  url:         string;
  platform:    'LinkedIn' | 'Instagram' | 'TikTok' | 'Web/News';
  source_type: 'Social' | 'Web';
  raw_excerpt: string;
  engagement:  number;
}

interface ScoredItem extends RawItem {
  scores:        { relevance: number; novelty: number; actionability: number; final: number };
  summary:       string;
  use_case_tags: string[];
}

interface ClaudeScore {
  item_number:    number;
  relevance:      number;
  novelty:        number;
  actionability:  number;
  use_case_tags:  string[];
  summary:        string;
}

const DAILY_LIMIT  = 50;
const WEEKLY_LIMIT = 150;
const isDeep       = process.argv.includes('--deep');
const LIMIT        = isDeep ? WEEKLY_LIMIT : DAILY_LIMIT;

// ── Perplexity ────────────────────────────────────────────────────────────────
const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY!;

async function perplexitySearch(query: string): Promise<{ content: string; citations: string[] }> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:                 'sonar',
      search_recency_filter: 'week',
      return_citations:       true,
      max_tokens:             800,
      messages: [
        {
          role: 'system',
          content: 'You are a research assistant for Cre8te Studio. Return factual, cited summaries of recent creator economy developments. Be specific: company names, dates, numbers, direct quotes from announcements.',
        },
        { role: 'user', content: query },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Perplexity ${res.status}: ${await res.text()}`);
  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
    citations?: string[];
  };
  return {
    content:   data.choices[0].message.content,
    citations: data.citations ?? [],
  };
}

async function runWebResearch(queryLimit: number): Promise<RawItem[]> {
  // Support both old flat list and new categorised object
  const queryConfig = researchTopics.perplexity_queries as
    string[] | { creator_economy: string[]; creative_economy: string[] };

  type QuerySet = { queries: string[]; category: 'creator_economy' | 'creative_economy' };
  const sets: QuerySet[] = Array.isArray(queryConfig)
    ? [{ queries: queryConfig, category: 'creator_economy' }]
    : [
        { queries: queryConfig.creator_economy ?? [], category: 'creator_economy'  },
        { queries: queryConfig.creative_economy ?? [], category: 'creative_economy' },
      ];

  const items: RawItem[] = [];

  for (const { queries, category } of sets) {
    const limited = queries.slice(0, Math.ceil(queryLimit / sets.length));
    for (const query of limited) {
      try {
        const { content, citations } = await perplexitySearch(query);
        for (const url of citations.slice(0, 2)) {
          items.push({
            title:       query,
            url,
            platform:    'Web/News',
            source_type: 'Web',
            raw_excerpt: content.slice(0, 500),
            engagement:  0,
            _category:   category,  // carry through for tagging
          });
        }
        await sleep(1000);
      } catch (err) {
        console.warn(`  Perplexity error [${query.slice(0, 40)}]:`, err);
      }
    }
  }
  return items;
}

// ── Apify scrapers ────────────────────────────────────────────────────────────
async function scrapeLinkedIn(keywords: string[], limit: number): Promise<RawItem[]> {
  const items: RawItem[] = [];
  for (const keyword of keywords.slice(0, 3)) {
    try {
      type LIPost = ApifyItem & { title?: string; text?: string; postUrl?: string; url?: string; totalReactionCount?: number; commentsCount?: number };
      const results = await runActor<LIPost>('curious_coder/linkedin-post-search-scraper', {
        searchQuery: keyword,
        maxPosts:    Math.min(Math.floor(limit / 3), 20),
      });
      for (const r of results) {
        items.push({
          title:       String(r.title ?? r.text ?? '').slice(0, 100),
          url:         String(r.postUrl ?? r.url ?? ''),
          platform:    'LinkedIn',
          source_type: 'Social',
          raw_excerpt:  String(r.text ?? '').slice(0, 500),
          engagement:  Number(r.totalReactionCount ?? 0) + Number(r.commentsCount ?? 0),
        });
      }
    } catch (err) {
      console.warn(`  LinkedIn error [${keyword}]:`, err);
    }
  }
  return items.slice(0, limit);
}

async function scrapeInstagram(hashtags: string[], limit: number): Promise<RawItem[]> {
  const items: RawItem[] = [];
  for (const tag of hashtags.slice(0, 3)) {
    try {
      type IGPost = ApifyItem & { caption?: string; url?: string; shortCode?: string; likesCount?: number; commentsCount?: number };
      const results = await runActor<IGPost>('apify/instagram-hashtag-scraper', {
        hashtags:     [tag],
        resultsLimit: Math.min(Math.floor(limit / 3), 20),
      });
      for (const r of results) {
        const caption = String(r.caption ?? '');
        items.push({
          title:       caption.slice(0, 100) || `#${tag} post`,
          url:         String(r.url ?? r.shortCode ?? ''),
          platform:    'Instagram',
          source_type: 'Social',
          raw_excerpt:  caption.slice(0, 500),
          engagement:  Number(r.likesCount ?? 0) + Number(r.commentsCount ?? 0),
        });
      }
    } catch (err) {
      console.warn(`  Instagram error [#${tag}]:`, err);
    }
  }
  return items.slice(0, limit);
}

async function scrapeTikTok(hashtags: string[], limit: number): Promise<RawItem[]> {
  const items: RawItem[] = [];
  for (const tag of hashtags.slice(0, 3)) {
    try {
      type TTPost = ApifyItem & { text?: string; description?: string; webVideoUrl?: string; videoUrl?: string; diggCount?: number; commentCount?: number; shareCount?: number };
      const results = await runActor<TTPost>('clockworks/tiktok-scraper', {
        hashtags:       [tag],
        resultsPerPage: Math.min(Math.floor(limit / 3), 20),
      });
      for (const r of results) {
        const desc = String(r.text ?? r.description ?? '');
        items.push({
          title:       desc.slice(0, 100) || `#${tag} video`,
          url:         String(r.webVideoUrl ?? r.videoUrl ?? ''),
          platform:    'TikTok',
          source_type: 'Social',
          raw_excerpt:  desc.slice(0, 500),
          engagement:  Number(r.diggCount ?? 0) + Number(r.commentCount ?? 0) + Number(r.shareCount ?? 0),
        });
      }
    } catch (err) {
      console.warn(`  TikTok error [#${tag}]:`, err);
    }
  }
  return items.slice(0, limit);
}

// ── Scoring ────────────────────────────────────────────────────────────────────
async function scoreItems(items: RawItem[], existingUrls: Set<string>): Promise<ScoredItem[]> {
  // URL dedup
  const deduped = items.filter(item => item.url && !existingUrls.has(item.url));
  deduped.forEach(i => existingUrls.add(i.url));

  if (deduped.length === 0) return [];

  // Score in batches of 20
  const scored: ScoredItem[] = [];
  const batch = deduped.slice(0, 20);

  const itemsText = batch
    .map((item, i) =>
      `ITEM ${i + 1}:\nTitle: ${item.title}\nPlatform: ${item.platform}\nExcerpt: ${item.raw_excerpt.slice(0, 300)}`
    )
    .join('\n\n');

  const system = `You are scoring research items for Cre8te Studio — a community platform for creative entrepreneurs and content creators.`;
  const user   = `Score each item 1-10 on:
- relevance: how directly does this relate to creators, creative entrepreneurs, content creation, AI tools for creators, or platform changes affecting creators?
- novelty: is this genuinely new information (high) or well-known background (low)?
- actionability: does this suggest a content angle, workshop topic, newsletter story, or platform update to cover?

Also assign use_case_tags from:
- Content Idea, Workshop Signal, AI Tool, Industry News — general purpose
- Newsletter Story, Platform Update — creator economy: platform changes, monetization tools, ecosystem trends
- Creative Economy — music/film/fashion industry news (ONLY use this for items clearly about those industries)
Write a 2-sentence summary from Cre8te Studio's community-first perspective.

Return JSON array only, no other text:
[{"item_number": 1, "relevance": 8, "novelty": 7, "actionability": 9, "use_case_tags": ["Content Idea"], "summary": "..."}]

ITEMS:
${itemsText}`;

  try {
    const raw     = await claudeComplete(system, user, 2000);
    const results = parseJsonResponse<ClaudeScore[]>(raw);

    for (const score of results) {
      const idx = score.item_number - 1;
      if (idx >= batch.length) continue;
      const item  = batch[idx];
      const r     = score.relevance;
      const n     = score.novelty;
      const a     = score.actionability;
      const final = Math.round((r * 0.4 + n * 0.3 + a * 0.3) * 10) / 10;
      if (final >= 7.0) {
        scored.push({ ...item, scores: { relevance: r, novelty: n, actionability: a, final }, summary: score.summary, use_case_tags: score.use_case_tags });
      }
    }
  } catch (err) {
    console.warn('  Claude scoring error:', err);
  }

  return scored.sort((a, b) => b.scores.final - a.scores.final);
}

// ── Coda write ─────────────────────────────────────────────────────────────────
async function writeItem(item: ScoredItem): Promise<void> {
  const cells: CodaCell[] = [
    { column: RI_COLS.item_title,      value: item.title },
    { column: RI_COLS.source_url,      value: item.url },
    { column: RI_COLS.source_type,     value: item.source_type },
    { column: RI_COLS.platform,        value: item.platform },
    { column: RI_COLS.summary,         value: item.summary },
    { column: RI_COLS.raw_excerpt,     value: item.raw_excerpt.slice(0, 500) },
    { column: RI_COLS.relevance_score, value: item.scores.relevance },
    { column: RI_COLS.novelty_score,   value: item.scores.novelty },
    { column: RI_COLS.actionability,   value: item.scores.actionability },
    { column: RI_COLS.final_score,     value: item.scores.final },
    { column: RI_COLS.use_case_tags,   value: item.use_case_tags.join(', ') },
    { column: RI_COLS.priority_flag,   value: item.scores.final >= 8.5 },
    { column: RI_COLS.date_scouted,    value: new Date().toISOString().split('T')[0] },
  ];
  await addRows(RI_TABLE, [cells]);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`\n[Research Scout] Starting ${isDeep ? 'DEEP' : 'daily'} run at ${new Date().toISOString()}`);

  const topics = researchTopics as {
    linkedin_keywords:  string[];
    instagram_hashtags: string[];
    tiktok_hashtags:    string[];
    perplexity_queries: string[];
  };

  const queryLimit = isDeep ? 20 : 10;
  const existingUrls = new Set<string>(); // populated from Coda in production

  const allItems: RawItem[] = [];

  console.log('[Research Scout] Web research (Perplexity)...');
  allItems.push(...await runWebResearch(queryLimit));

  console.log('[Research Scout] LinkedIn scrape...');
  allItems.push(...await scrapeLinkedIn(topics.linkedin_keywords, LIMIT));

  console.log('[Research Scout] Instagram scrape...');
  allItems.push(...await scrapeInstagram(topics.instagram_hashtags, LIMIT));

  console.log('[Research Scout] TikTok scrape...');
  allItems.push(...await scrapeTikTok(topics.tiktok_hashtags, LIMIT));

  console.log(`[Research Scout] ${allItems.length} raw items — running scoring...`);

  const scored = await scoreItems(allItems, existingUrls);
  console.log(`[Research Scout] ${scored.length} items passed threshold (≥ 7.0)`);

  let written = 0, errors = 0;
  for (const item of scored) {
    try {
      await writeItem(item);
      const flag = item.scores.final >= 8.5 ? ' 🔴 PRIORITY' : '';
      console.log(`  ✓ [${item.scores.final}] ${item.title.slice(0, 60)}${flag}`);
      written++;
      await sleep(300);
    } catch (err) {
      errors++;
      console.error(`  ERROR writing item:`, err);
    }
  }

  console.log(`\n[Research Scout] Done — ${written} written, ${errors} errors`);

  const priority = scored.filter(i => i.scores.final >= 8.5);
  if (priority.length > 0) {
    console.log(`\n🔴 ${priority.length} PRIORITY items:`);
    for (const item of priority) {
      console.log(`  [${item.scores.final}] ${item.title.slice(0, 70)}`);
      console.log(`  Tags: ${item.use_case_tags.join(', ')}`);
      console.log(`  ${item.summary.slice(0, 120)}`);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
