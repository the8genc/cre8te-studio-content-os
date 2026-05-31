/**
 * Agent 02 — The Transcriber
 * Processes pending Source Assets via Fireflies API and writes transcripts back to Coda.
 */
import 'dotenv/config';
import { getRows, updateRow, sleep, type CodaRow } from '../../lib/coda.js';
import { uploadAudio, pollTranscript, formatTranscript } from '../../lib/fireflies.js';
import schema from '../../config/coda-schema.json' assert { type: 'json' };

const SA    = schema.tables.source_assets;
const TABLE = SA.table_id;
const C     = SA.columns;

async function processAsset(row: CodaRow): Promise<void> {
  const vals      = row.values;
  const assetName = String(vals[C.asset_name]?.value   ?? `Asset-${row.id}`);
  const fileUrl   = String(vals[C.raw_file_url]?.value ?? '');

  if (!fileUrl) {
    console.log(`  SKIP ${assetName}: no file URL`);
    await updateRow(TABLE, row.id, [{ column: C.transcription_status, value: 'Error — No URL' }]);
    return;
  }

  console.log(`  Processing: ${assetName}`);
  await updateRow(TABLE, row.id, [{ column: C.transcription_status, value: 'In Progress' }]);

  const uploadResult = await uploadAudio(fileUrl, assetName);
  if (!uploadResult.success) {
    throw new Error(`Upload rejected: ${uploadResult.message}`);
  }

  const transcript   = await pollTranscript(assetName);
  const transcriptTx = formatTranscript(transcript.sentences);
  const keywords     = transcript.summary?.keywords?.join(', ') ?? '';
  const overview     = transcript.summary?.overview ?? '';
  const keyThemes    = overview ? `${keywords}\n\nOverview: ${overview}` : keywords;

  await updateRow(TABLE, row.id, [
    { column: C.transcript,            value: transcriptTx },
    { column: C.key_themes,            value: keyThemes },
    { column: C.transcription_status,  value: 'Complete' },
    { column: C.processed,             value: true },
  ]);

  console.log(`  ✓ Complete: ${assetName} (${transcriptTx.length} chars)`);
}

async function main(): Promise<void> {
  console.log(`\n[Transcriber] Starting at ${new Date().toISOString()}`);

  const pending = await getRows(TABLE, `"${C.transcription_status}":"Pending"`);
  console.log(`[Transcriber] ${pending.length} pending assets`);

  let success = 0, errors = 0;

  for (const row of pending) {
    try {
      await processAsset(row);
      success++;
    } catch (err) {
      errors++;
      const name = String(row.values[C.asset_name]?.value ?? row.id);
      console.error(`  ERROR ${name}:`, err);
      try {
        const msg = err instanceof Error ? err.message.slice(0, 100) : String(err);
        await updateRow(TABLE, row.id, [
          { column: C.transcription_status, value: `Error — ${msg}` },
        ]);
      } catch { /* log failure is non-fatal */ }
    }
    await sleep(500);
  }

  console.log(`[Transcriber] Done — ${success} transcribed, ${errors} errors\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
