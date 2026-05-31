/**
 * Apify actor runner — used by Agent 08 (Research Scout)
 */
import 'dotenv/config';
import { sleep } from './coda.js';

const APIFY_KEY  = process.env.APIFY_API_KEY!;
const APIFY_BASE = 'https://api.apify.com/v2';

const headers = {
  'Authorization': `Bearer ${APIFY_KEY}`,
  'Content-Type':  'application/json',
};

export interface ApifyItem {
  [key: string]: unknown;
}

/** Run an Apify actor and return its dataset results */
export async function runActor<T extends ApifyItem>(
  actorId:     string,
  inputData:   Record<string, unknown>,
  timeoutSecs  = 180
): Promise<T[]> {
  // Start the run
  const startRes = await fetch(
    `${APIFY_BASE}/acts/${actorId}/runs?timeout=${timeoutSecs}`,
    { method: 'POST', headers, body: JSON.stringify(inputData) }
  );
  if (!startRes.ok) throw new Error(`Apify start [${actorId}]: ${startRes.status}`);
  const startData = await startRes.json() as { data: { id: string; defaultDatasetId: string } };
  const runId = startData.data.id;

  // Poll for completion
  const deadline = Date.now() + (timeoutSecs + 30) * 1000;
  while (Date.now() < deadline) {
    await sleep(5000);
    const statusRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}`, { headers });
    const statusData = await statusRes.json() as { data: { status: string; defaultDatasetId: string } };
    const { status } = statusData.data;
    if (status === 'SUCCEEDED') {
      const dsId = statusData.data.defaultDatasetId;
      const itemsRes = await fetch(`${APIFY_BASE}/datasets/${dsId}/items?limit=200`, { headers });
      const items = await itemsRes.json() as { data?: { items: T[] }; items?: T[] };
      return (items.data?.items ?? items.items ?? []) as T[];
    }
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      throw new Error(`Apify run ${runId} ended with: ${status}`);
    }
  }
  throw new Error(`Apify run ${runId} timed out`);
}
