/**
 * Mock Coda client for Phase 2 development and testing.
 * Replaces lib/coda.ts when CODA_API_KEY is not set.
 * Stores all data in memory — logs reads/writes to console.
 */

export interface CodaCell {
  column: string;
  value:  string | number | boolean;
}

export interface CodaRow {
  id:     string;
  values: Record<string, { value: string | number | boolean }>;
}

// In-memory store keyed by tableId
const store: Record<string, CodaRow[]> = {};
let   rowCounter = 1000;

function makeId(): string {
  return `mock-row-${rowCounter++}`;
}

export async function getRows(
  tableId: string,
  query?: string,
  limit = 50
): Promise<CodaRow[]> {
  const rows = (store[tableId] ?? []).slice(0, limit);
  console.log(`  [MockCoda] getRows(${tableId}) → ${rows.length} rows${query ? ` [query: ${query}]` : ''}`);
  return rows;
}

export async function addRows(
  tableId: string,
  rows: CodaCell[][]
): Promise<void> {
  if (!store[tableId]) store[tableId] = [];
  for (const cells of rows) {
    const id  = makeId();
    const row: CodaRow = { id, values: {} };
    for (const cell of cells) {
      row.values[cell.column] = { value: cell.value };
    }
    store[tableId].push(row);
    const preview = cells.slice(0, 2).map(c => `${c.column}=${String(c.value).slice(0,30)}`).join(', ');
    console.log(`  [MockCoda] addRow(${tableId}) id=${id} | ${preview}...`);
  }
}

export async function updateRow(
  tableId: string,
  rowId:   string,
  cells:   CodaCell[]
): Promise<void> {
  if (!store[tableId]) { console.warn(`  [MockCoda] updateRow: table ${tableId} not found`); return; }
  const row = store[tableId].find(r => r.id === rowId);
  if (!row) { console.warn(`  [MockCoda] updateRow: row ${rowId} not found`); return; }
  for (const cell of cells) row.values[cell.column] = { value: cell.value };
  console.log(`  [MockCoda] updateRow(${tableId}, ${rowId}) — ${cells.length} cells updated`);
}

/** Seed a table with fixture data */
export function seedTable(tableId: string, rows: CodaRow[]): void {
  store[tableId] = rows;
  console.log(`  [MockCoda] seeded table ${tableId} with ${rows.length} rows`);
}

/** Dump all table contents (for test assertions) */
export function dumpTable(tableId: string): CodaRow[] {
  return store[tableId] ?? [];
}

/** Clear all stored data */
export function resetStore(): void {
  Object.keys(store).forEach(k => delete store[k]);
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
