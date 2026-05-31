/**
 * Agent 01 — The Ingester
 * Scans Google Drive folders for new source files and registers them in Coda.
 */
import 'dotenv/config';
import { google } from 'googleapis';
import { addRows, getRows, sleep } from '../../lib/coda.js';
import schema from '../../config/coda-schema.json' assert { type: 'json' };

const SA    = schema.tables.source_assets;
const TABLE = SA.table_id;
const C     = SA.columns;

const SUPPORTED_EXTENSIONS = ['.mp4', '.mov', '.mp3', '.wav', '.m4a', '.webm'];

const FOLDER_MAP: Array<{ envKey: string; sourceType: string }> = [
  { envKey: 'GOOGLE_DRIVE_SUMMIT_FOLDER_ID',      sourceType: 'Summit Recording' },
  { envKey: 'GOOGLE_DRIVE_MINIPOD_FOLDER_ID',     sourceType: 'Mini Pod'         },
  { envKey: 'GOOGLE_DRIVE_TESTIMONIAL_FOLDER_ID', sourceType: 'Testimonial'      },
  { envKey: 'GOOGLE_DRIVE_ITL_FOLDER_ID',         sourceType: 'ITL Engagement'   },
];

/** Parse speaker name from filename convention: YYYY-MM-DD_SpeakerName_TopicSlug.ext */
function parseSpeakerFromFilename(name: string): string {
  const parts = name.replace(/\.[^.]+$/, '').split('_');
  if (parts.length >= 3 && /^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
    return parts[1].replace(/-/g, ' ');
  }
  return '';
}

/** Convert Drive file ID to direct download URL for Fireflies */
function toDirectDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

async function getExistingUrls(): Promise<Set<string>> {
  const rows = await getRows(TABLE, undefined, 500);
  return new Set(
    rows
      .map(r => String(r.values[C.raw_file_url]?.value ?? ''))
      .filter(Boolean)
  );
}

async function scanFolder(
  drive:      ReturnType<typeof google.drive>,
  folderId:   string,
  sourceType: string,
  existingUrls: Set<string>
): Promise<number> {
  const res = await drive.files.list({
    q:      `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, createdTime, mimeType)',
    pageSize: 100,
  });

  const files = res.data.files ?? [];
  let registered = 0;

  for (const file of files) {
    if (!file.name || !file.id) continue;
    const ext = '.' + file.name.split('.').pop()!.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;

    const downloadUrl = toDirectDownloadUrl(file.id);
    if (existingUrls.has(downloadUrl)) continue;

    const speaker  = parseSpeakerFromFilename(file.name);
    const datePart = file.name.split('_')[0];
    const dateStr  = /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : new Date().toISOString().split('T')[0];

    await addRows(TABLE, [[
      { column: C.asset_name,           value: file.name.replace(/\.[^.]+$/, '') },
      { column: C.source_type,          value: sourceType },
      { column: C.speaker_guest,        value: speaker },
      { column: C.raw_file_url,         value: downloadUrl },
      { column: C.date_captured,        value: dateStr },
      { column: C.transcription_status, value: 'Pending' },
      { column: C.processed,            value: false },
    ]]);

    existingUrls.add(downloadUrl);
    console.log(`  ✓ Registered [${sourceType}]: ${file.name}`);
    registered++;
    await sleep(300);
  }

  return registered;
}

async function main(): Promise<void> {
  console.log(`\n[Ingester] Starting at ${new Date().toISOString()}`);

  const credPath = process.env.GOOGLE_DRIVE_CREDENTIALS_JSON;
  if (!credPath) throw new Error('GOOGLE_DRIVE_CREDENTIALS_JSON not set');

  const auth  = new google.auth.GoogleAuth({ keyFile: credPath, scopes: ['https://www.googleapis.com/auth/drive.readonly'] });
  const drive = google.drive({ version: 'v3', auth });

  const existingUrls = await getExistingUrls();
  console.log(`[Ingester] ${existingUrls.size} assets already registered`);

  let total = 0;
  for (const { envKey, sourceType } of FOLDER_MAP) {
    const folderId = process.env[envKey];
    if (!folderId) { console.warn(`  SKIP ${sourceType}: ${envKey} not set`); continue; }
    console.log(`  Scanning ${sourceType}...`);
    try {
      const n = await scanFolder(drive, folderId, sourceType, existingUrls);
      console.log(`  → ${n} new assets registered`);
      total += n;
    } catch (err) {
      console.error(`  ERROR scanning ${sourceType}:`, err);
    }
  }

  console.log(`[Ingester] Done — ${total} new assets registered\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
