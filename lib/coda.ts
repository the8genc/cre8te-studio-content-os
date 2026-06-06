/**
 * Coda API client — shared across all agents
 * Every successful write is mirrored to docs/coda-doc-snapshot.md and ZeroDB
 * via lib/sync.ts (disable with CODA_SYNC_DISABLED=1).
 */
import 'dotenv/config';
import { recordCodaWrite } from './sync.js';

const CODA_API_KEY = process.env.CODA_API_KEY!;
const CODA_DOC_ID  = process.env.CODA_DOC_ID ?? 'ktMUNdlobR';
const BASE_URL     = `https://coda.io/apis/v1/docs/${CODA_DOC_ID}`;

const headers = {
  'Authorization': `Bearer ${CODA_API_KEY}`,
  'Content-Type':  'application/json',
};

export interface CodaCell {
  column: string;
  value:  string | number | boolean;
}

export interface CodaRow {
  id:     string;
  values: Record<string, { value: string | number | boolean }>;
}

/** Fetch rows from a table, optionally filtered by a query string */
export async function getRows(
  tableId: string,
  query?: string,
  limit = 50
): Promise<CodaRow[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query) params.set('query', query);
  const res = await fetch(`${BASE_URL}/tables/${tableId}/rows?${params}`, { headers });
  if (!res.ok) throw new Error(`Coda getRows [${tableId}]: ${res.status} ${await res.text()}`);
  const data = await res.json() as { items: CodaRow[] };
  return data.items;
}

/** Add one or more rows to a table */
export async function addRows(
  tableId: string,
  rows: CodaCell[][]
): Promise<void> {
  const payload = {
    rows: rows.map(cells => ({ cells: cells.map(c => ({ column: c.column, value: c.value })) })),
  };
  const res = await fetch(`${BASE_URL}/tables/${tableId}/rows`, {
    method: 'POST', headers, body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Coda addRows [${tableId}]: ${res.status} ${await res.text()}`);
  await recordCodaWrite({
    action: 'add',
    tableId,
    rowCount: rows.length,
    columns: [...new Set(rows.flat().map(c => c.column))],
  });
}

/** Update a single row by ID */
export async function updateRow(
  tableId: string,
  rowId:   string,
  cells:   CodaCell[]
): Promise<void> {
  const payload = { row: { cells: cells.map(c => ({ column: c.column, value: c.value })) } };
  const res = await fetch(`${BASE_URL}/tables/${tableId}/rows/${rowId}`, {
    method: 'PUT', headers, body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Coda updateRow [${rowId}]: ${res.status} ${await res.text()}`);
  await recordCodaWrite({
    action: 'update',
    tableId,
    rowId,
    columns: cells.map(c => c.column),
  });
}

/** Sleep helper */
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
