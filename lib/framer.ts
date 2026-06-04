/**
 * Framer Server API client
 * Wraps the framer-api npm package for use in the Blog Publisher agent.
 *
 * Authentication: generate an API key in Framer → Site Settings → General
 * Install: npm install framer-api (added to package.json separately)
 *
 * NOTE: The Server API uses a stateful WebSocket channel. Always call
 * framer.disconnect() after each operation — a dangling connection will
 * prevent the script from exiting.
 */
import 'dotenv/config';

export interface FramerCMSItem {
  id?:          string;  // set on update, omit on create
  slug:         string;
  title:        string;
  excerpt:      string;
  body:         string;  // rich text / HTML
  author:       string;
  category:     string;
  tags:         string[];
  published_date: string; // ISO date string
  is_paywalled: boolean;
  paywall_teaser?: string; // first N chars shown to non-subscribers
  seo_title?:   string;
  seo_description?: string;
  cover_image?: string;  // URL
}

export interface FramerPublishResult {
  cms_item_id:    string;
  live_url:       string;
  deployment_id:  string;
  published_at:   string;
}

/**
 * Connect to Framer, write/update a CMS blog post item, publish, deploy.
 * Returns the live URL and CMS item ID.
 */
export async function publishBlogPost(
  item: FramerCMSItem,
  collectionId: string
): Promise<FramerPublishResult> {
  const { connect } = await import('framer-api');

  const projectUrl = process.env.FRAMER_PROJECT_URL!;
  const apiKey     = process.env.FRAMER_API_KEY!;

  if (!projectUrl || !apiKey) {
    throw new Error('FRAMER_PROJECT_URL and FRAMER_API_KEY must be set in environment');
  }

  using framer = await connect(projectUrl, apiKey);

  // Get the blog collection
  const collections = await framer.getCollections();
  const blogCollection = collections.find(
    (c: { id: string; name: string }) => c.id === collectionId || c.name.toLowerCase().includes('blog')
  );
  if (!blogCollection) {
    throw new Error(`Blog collection not found. Available: ${collections.map((c: { name: string }) => c.name).join(', ')}`);
  }

  // Create or update the CMS item
  const fields = {
    title:          item.title,
    slug:           item.slug,
    excerpt:        item.excerpt,
    body:           item.body,
    author:         item.author,
    category:       item.category,
    tags:           item.tags.join(', '),
    publishedDate:  item.published_date,
    isPaywalled:    item.is_paywalled,
    paywallTeaser:  item.paywall_teaser ?? '',
    seoTitle:       item.seo_title ?? item.title,
    seoDescription: item.seo_description ?? item.excerpt,
    coverImage:     item.cover_image ?? '',
  };

  let cmsItemId: string;
  if (item.id) {
    // Update existing item
    await framer.setCollectionItemFields(blogCollection.id, item.id, fields);
    cmsItemId = item.id;
  } else {
    // Create new item
    const created = await framer.addCollectionItem(blogCollection.id, fields);
    cmsItemId = created.id;
  }

  // Publish to preview, then deploy to production
  const publishResult = await framer.publish();
  await framer.deploy(publishResult.deployment.id);

  // Construct the live URL from the site hostname + slug
  const projectInfo = await framer.getProjectInfo();
  const hostname    = projectInfo.hostname ?? process.env.FRAMER_SITE_HOSTNAME ?? '';
  const liveUrl     = hostname ? `https://${hostname}/blog/${item.slug}` : `[slug: ${item.slug}]`;

  return {
    cms_item_id:   cmsItemId,
    live_url:      liveUrl,
    deployment_id: publishResult.deployment.id,
    published_at:  new Date().toISOString(),
  };
}

/**
 * List all existing blog posts from Framer CMS.
 * Used by the Blog Publisher to check for existing slugs before creating.
 */
export async function listBlogPosts(collectionId?: string): Promise<Array<{
  id: string; slug: string; title: string;
}>> {
  const { connect } = await import('framer-api');
  using framer = await connect(process.env.FRAMER_PROJECT_URL!, process.env.FRAMER_API_KEY!);
  const collections = await framer.getCollections();
  const target = collections.find(
    (c: { id: string; name: string }) =>
      (collectionId && c.id === collectionId) || c.name.toLowerCase().includes('blog')
  );
  if (!target) return [];
  const items = await framer.getCollectionItems(target.id);
  return items.map((item: { id: string; fields: Record<string, string> }) => ({
    id:    item.id,
    slug:  item.fields.slug ?? '',
    title: item.fields.title ?? '',
  }));
}
