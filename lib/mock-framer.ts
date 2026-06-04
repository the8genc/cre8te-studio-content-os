/**
 * Mock Framer client for testing.
 * Returns deterministic results without hitting the Framer Server API.
 */

export interface FramerCMSItem {
  id?:            string;
  slug:           string;
  title:          string;
  excerpt:        string;
  body:           string;
  author:         string;
  category:       string;
  tags:           string[];
  published_date: string;
  is_paywalled:   boolean;
  paywall_teaser?: string;
  seo_title?:     string;
  seo_description?: string;
  cover_image?:   string;
}

export interface FramerPublishResult {
  cms_item_id:    string;
  live_url:       string;
  deployment_id:  string;
  published_at:   string;
}

const publishedItems: Array<FramerCMSItem & { cms_item_id: string; live_url: string }> = [];
let   itemCounter = 1000;
let   failNext    = false;

export function injectFramerFailure(): void { failNext = true; }
export function getPublishedBlogPosts() { return [...publishedItems]; }
export function resetFramerStore() { publishedItems.length = 0; }

export async function publishBlogPost(
  item: FramerCMSItem,
  _collectionId: string
): Promise<FramerPublishResult> {
  await new Promise(r => setTimeout(r, 80));
  if (failNext) { failNext = false; throw new Error('Simulated Framer API failure'); }

  const cmsItemId = item.id ?? `framer-item-${itemCounter++}`;
  const liveUrl   = `https://cre8testudio.com/blog/${item.slug}`;

  publishedItems.push({ ...item, cms_item_id: cmsItemId, live_url: liveUrl });
  console.log(`  [MockFramer] Published "${item.title}" → ${liveUrl}${item.is_paywalled ? ' 🔒' : ''}`);

  return {
    cms_item_id:   cmsItemId,
    live_url:      liveUrl,
    deployment_id: `deploy-${Date.now()}`,
    published_at:  new Date().toISOString(),
  };
}

export async function listBlogPosts(): Promise<Array<{ id: string; slug: string; title: string }>> {
  return publishedItems.map(p => ({ id: p.cms_item_id, slug: p.slug, title: p.title }));
}
