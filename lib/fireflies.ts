/**
 * Fireflies API client — used by Agent 02 (Transcriber)
 */
import 'dotenv/config';
import { sleep } from './coda.js';

const FF_KEY = process.env.FIREFLIES_API_KEY!;
const FF_URL = process.env.FIREFLIES_GRAPHQL_ENDPOINT ?? 'https://api.fireflies.ai/graphql';

const headers = {
  'Authorization': `Bearer ${FF_KEY}`,
  'Content-Type':  'application/json',
};

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(FF_URL, {
    method:  'POST',
    headers,
    body:    JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Fireflies HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json() as { data: T; errors?: Array<{ message: string }> };
  if (data.errors?.length) throw new Error(`Fireflies GQL: ${data.errors[0].message}`);
  return data.data;
}

export interface FirefliesSentence {
  speaker_name: string;
  text:         string;
  start_time:   number;
  end_time:     number;
}

export interface FirefliesTranscript {
  id:       string;
  title:    string;
  date:     number;
  summary?: { keywords: string[]; overview: string; action_items: string[] };
  sentences: FirefliesSentence[];
}

/** Submit a file URL to Fireflies for transcription */
export async function uploadAudio(
  fileUrl: string,
  title:   string
): Promise<{ success: boolean; message: string }> {
  const mutation = `
    mutation UploadAudio($input: AudioUploadInput) {
      uploadAudio(input: $input) { success message }
    }`;
  const data = await gql<{ uploadAudio: { success: boolean; message: string } }>(
    mutation, { input: { url: fileUrl, title } }
  );
  return data.uploadAudio;
}

/** Poll Fireflies until a transcript with the given title is ready */
export async function pollTranscript(
  title:      string,
  maxWaitMs   = 30 * 60 * 1000,
  intervalMs  = 60_000
): Promise<FirefliesTranscript> {
  const query = `
    query GetTranscripts($title: String) {
      transcripts(title: $title, limit: 5) {
        id title date
        summary { keywords overview action_items }
        sentences { speaker_name text start_time end_time }
      }
    }`;

  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const data = await gql<{ transcripts: FirefliesTranscript[] }>(query, { title });
    if (data.transcripts.length > 0) return data.transcripts[0];
    console.log(`  Waiting for Fireflies... (${Math.round((Date.now() - start) / 1000)}s)`);
    await sleep(intervalMs);
  }
  throw new Error(`Fireflies timeout after ${maxWaitMs / 60000} min for: ${title}`);
}

/** Format sentence array into readable transcript with speaker labels */
export function formatTranscript(sentences: FirefliesSentence[]): string {
  let currentSpeaker = '';
  const lines: string[] = [];
  for (const s of sentences) {
    if (s.speaker_name !== currentSpeaker) {
      lines.push(`\n[${s.speaker_name}]`);
      currentSpeaker = s.speaker_name;
    }
    lines.push(s.text);
  }
  return lines.join(' ').trim();
}
