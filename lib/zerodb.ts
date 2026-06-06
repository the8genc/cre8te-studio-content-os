/**
 * ZeroDB (AINative Studio) memory client — shared across all agents.
 * Talks to the zerodb-memory MCP server over stateless JSON-RPC HTTP.
 */
import 'dotenv/config';

const ZERODB_MCP_URL =
  process.env.ZERODB_MCP_URL ??
  'https://api.ainative.studio/v1/mcp/zerodb-memory-mcp/messages';
const ZERODB_API_KEY = process.env.ZERODB_API_KEY ?? '';

let warnedMissingKey = false;

interface JsonRpcResponse {
  result?: { content?: { type: string; text?: string }[]; isError?: boolean };
  error?: { code: number; message: string };
}

/** Call any zerodb-memory MCP tool. Returns the tool's text output, or null if ZeroDB is not configured. */
export async function zerodbCall(
  tool: string,
  args: Record<string, unknown>
): Promise<string | null> {
  if (!ZERODB_API_KEY) {
    if (!warnedMissingKey) {
      console.warn('[zerodb] ZERODB_API_KEY not set — skipping ZeroDB writes');
      warnedMissingKey = true;
    }
    return null;
  }
  const res = await fetch(ZERODB_MCP_URL, {
    method: 'POST',
    headers: {
      'x-api-key': ZERODB_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: tool, arguments: args },
    }),
  });
  if (!res.ok) throw new Error(`ZeroDB ${tool}: ${res.status} ${await res.text()}`);
  const raw = await res.text();
  // Endpoint may answer as plain JSON or as a single SSE `data:` frame
  const json = raw.startsWith('data:')
    ? raw.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('')
    : raw;
  const parsed = JSON.parse(json) as JsonRpcResponse;
  if (parsed.error) throw new Error(`ZeroDB ${tool}: ${parsed.error.message}`);
  if (parsed.result?.isError) {
    throw new Error(`ZeroDB ${tool}: ${parsed.result.content?.[0]?.text ?? 'tool error'}`);
  }
  return parsed.result?.content?.find(c => c.type === 'text')?.text ?? null;
}

/** Store a context entry in ZeroDB agent memory (zerodb_store_memory) */
export async function storeMemory(
  content: string,
  opts: {
    sessionId: string;
    role?: 'system' | 'user' | 'assistant';
    tags?: string[];
    metadata?: Record<string, unknown>;
  }
): Promise<string | null> {
  return zerodbCall('zerodb_store_memory', {
    content,
    session_id: opts.sessionId,
    role: opts.role ?? 'assistant',
    tags: opts.tags ?? [],
    metadata: opts.metadata ?? {},
  });
}

/** Semantic search over stored memory (zerodb_search_memory) */
export async function searchMemory(
  query: string,
  opts: { sessionId?: string; tags?: string[]; limit?: number } = {}
): Promise<string | null> {
  return zerodbCall('zerodb_search_memory', {
    query,
    ...(opts.sessionId ? { session_id: opts.sessionId } : {}),
    ...(opts.tags ? { tags: opts.tags } : {}),
    limit: opts.limit ?? 10,
  });
}
