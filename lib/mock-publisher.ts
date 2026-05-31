/**
 * Mock publisher clients for Phase 3 testing.
 * Simulates Postiz and Kit API responses without live credentials.
 */

export interface PostizResult {
  id:       string;
  url:      string;
  platform: string;
  status:   'published' | 'scheduled' | 'failed';
}

export interface KitResult {
  broadcast_id: number;
  subject:      string;
  status:       'sent' | 'scheduled' | 'failed';
  recipient_count: number;
}

// Track what was "published" for test assertions
const publishedPosts:    PostizResult[] = [];
const sentNewsletters:   KitResult[]    = [];

export function resetPublisherStore(): void {
  publishedPosts.length    = 0;
  sentNewsletters.length   = 0;
}

export function getPublishedPosts():  PostizResult[] { return [...publishedPosts]; }
export function getSentNewsletters(): KitResult[]    { return [...sentNewsletters]; }

// Simulate occasional failures for resilience testing
let failNextCall = false;
export function injectFailure(): void { failNextCall = true; }

export async function mockPostizPublish(
  platform: string,
  content:  string,
  scheduleDate?: string
): Promise<PostizResult> {
  await new Promise(r => setTimeout(r, 50)); // simulate latency

  if (failNextCall) {
    failNextCall = false;
    throw new Error(`Simulated Postiz failure for ${platform}`);
  }

  const result: PostizResult = {
    id:       `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url:      `https://${platform.toLowerCase()}.com/cre8testudio/post/${Date.now()}`,
    platform,
    status:   scheduleDate ? 'scheduled' : 'published',
  };

  publishedPosts.push(result);
  console.log(`  [MockPostiz] ${platform}: ${result.status} → ${result.url}`);
  return result;
}

export async function mockKitSend(
  subject:  string,
  content:  string,
  sendAt?:  string
): Promise<KitResult> {
  await new Promise(r => setTimeout(r, 50));

  if (failNextCall) {
    failNextCall = false;
    throw new Error('Simulated Kit API failure');
  }

  const result: KitResult = {
    broadcast_id:    Math.floor(Math.random() * 100000),
    subject,
    status:          sendAt ? 'scheduled' : 'sent',
    recipient_count: 847, // mock subscriber count
  };

  sentNewsletters.push(result);
  console.log(`  [MockKit] Newsletter "${subject}": ${result.status} → broadcast #${result.broadcast_id}`);
  return result;
}
