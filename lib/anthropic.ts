/**
 * Anthropic Claude API client — shared across all agents
 */
import 'dotenv/config';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL         = 'claude-sonnet-4-20250514';

const headers = {
  'x-api-key':         ANTHROPIC_KEY,
  'anthropic-version': '2023-06-01',
  'content-type':      'application/json',
};

export async function claudeComplete(
  systemPrompt: string,
  userPrompt:   string,
  maxTokens = 2000
): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: maxTokens,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API: ${res.status} ${await res.text()}`);
  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  const textBlock = data.content.find(b => b.type === 'text');
  if (!textBlock) throw new Error('Anthropic returned no text block');
  return textBlock.text.trim();
}

/** Parse JSON from Claude response, stripping markdown fences if present */
export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
  return JSON.parse(cleaned) as T;
}
