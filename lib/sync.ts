/**
 * Coda write-sync — mirrors every Coda table write to:
 *   1. docs/coda-doc-snapshot.md  (🔄 Sync Log section + last-write-sync stamp)
 *   2. ZeroDB agent memory        (session: cre8te-coda-sync)
 *
 * Called automatically from lib/coda.ts after every successful addRows/updateRow.
 * Failures are logged with [sync], never thrown — sync must not break the pipeline.
 * Kill switch: set CODA_SYNC_DISABLED=1 to skip both mirrors.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storeMemory } from './zerodb.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = path.join(ROOT, 'docs', 'coda-doc-snapshot.md');
const SYNC_HEADER = '## 🔄 Sync Log (auto-generated — newest first)';
const MAX_LOG_ROWS = 100;
const SESSION_ID = 'cre8te-coda-sync';

// table_id → friendly key, column_id → friendly key (from config/coda-schema.json)
const tableNames: Record<string, string> = {};
const columnNames: Record<string, string> = {};
try {
  const schema = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'config', 'coda-schema.json'), 'utf8')
  ) as { tables: Record<string, { table_id: string; columns?: Record<string, string> }> };
  for (const [key, t] of Object.entries(schema.tables)) {
    tableNames[t.table_id] = key;
    for (const [colKey, colId] of Object.entries(t.columns ?? {})) columnNames[colId] = colKey;
  }
} catch {
  /* mapping is best-effort; raw IDs are still logged */
}

export interface CodaWriteEvent {
  action: 'add' | 'update';
  tableId: string;
  rowId?: string;
  rowCount?: number;
  columns?: string[];
}

const agentName = () =>
  process.env.AGENT_NAME ??
  path.basename(process.argv[1] ?? 'unknown').replace(/\.(ts|js)$/, '');

/** Mirror one Coda write to the snapshot markdown and ZeroDB. Never throws. */
export async function recordCodaWrite(event: CodaWriteEvent): Promise<void> {
  if (process.env.CODA_SYNC_DISABLED === '1') return;
  const ts = new Date().toISOString();
  const agent = agentName();
  const table = tableNames[event.tableId] ?? event.tableId;
  const cols = (event.columns ?? []).map(c => columnNames[c] ?? c);
  const details =
    event.action === 'add'
      ? `+${event.rowCount ?? 1} row(s) — ${cols.join(', ')}`
      : `row ${event.rowId} — ${cols.join(', ')}`;

  try {
    appendToSnapshot(ts, agent, table, event.action, details);
  } catch (err) {
    console.warn(`[sync] snapshot update failed: ${(err as Error).message}`);
  }

  try {
    await storeMemory(`Coda ${event.action} on "${table}" by agent ${agent}: ${details}`, {
      sessionId: SESSION_ID,
      tags: ['coda-sync', table, event.action, agent],
      metadata: {
        ...event,
        table,
        agent,
        timestamp: ts,
        docId: process.env.CODA_DOC_ID ?? 'ktMUNdlobR',
      },
    });
  } catch (err) {
    console.warn(`[sync] ZeroDB write failed: ${(err as Error).message}`);
  }
}

function appendToSnapshot(
  ts: string,
  agent: string,
  table: string,
  action: string,
  details: string
): void {
  const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  let md = fs.existsSync(SNAPSHOT)
    ? fs.readFileSync(SNAPSHOT, 'utf8')
    : `# Coda Doc Snapshot — "Cre8te Studio OS"\n\n> **Doc ID:** \`${process.env.CODA_DOC_ID ?? 'ktMUNdlobR'}\`\n`;

  // Maintain a last-write-sync stamp directly under the Doc ID header line
  const stamp = `> **Last write-sync:** ${ts}`;
  md = md.includes('> **Last write-sync:**')
    ? md.replace(/^> \*\*Last write-sync:\*\* .*$/m, stamp)
    : md.replace(/^(> \*\*Doc ID:\*\*.*)$/m, `$1\n${stamp}`);

  const row = `| ${ts} | ${esc(agent)} | ${esc(table)} | ${action} | ${esc(details)} |`;
  if (md.includes(SYNC_HEADER)) {
    const lines = md.split('\n');
    const head = lines.indexOf(SYNC_HEADER);
    const sep = head + 3; // header, blank line, table header, separator row
    lines.splice(sep + 1, 0, row);
    // Cap the log so the file never grows unbounded
    const start = sep + 1;
    let end = start;
    while (end < lines.length && lines[end].startsWith('|')) end++;
    if (end - start > MAX_LOG_ROWS) {
      lines.splice(start + MAX_LOG_ROWS, end - start - MAX_LOG_ROWS);
    }
    md = lines.join('\n');
  } else {
    md =
      md.trimEnd() +
      `\n\n---\n\n${SYNC_HEADER}\n\n| Timestamp (UTC) | Agent | Table | Action | Details |\n|---|---|---|---|---|\n${row}\n`;
  }
  fs.writeFileSync(SNAPSHOT, md);
}
