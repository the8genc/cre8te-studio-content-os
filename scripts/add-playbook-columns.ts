/**
 * One-time setup: adds Content Bucket, LinkedIn Framework, Recommended CTA
 * to the Content Ideas table in Coda.
 * Run once after credentials are provisioned: npm run add-playbook-columns
 */
import 'dotenv/config';

const CODA_KEY = process.env.CODA_API_KEY!;
const DOC_ID   = process.env.CODA_DOC_ID ?? 'ktMUNdlobR';
const TABLE_ID = 'grid-dL_d_C7-B_';
const BASE     = `https://coda.io/apis/v1/docs/${DOC_ID}/tables/${TABLE_ID}`;
const HEADERS  = { 'Authorization': `Bearer ${CODA_KEY}`, 'Content-Type': 'application/json' };

const COLUMNS = [
  { name: 'Content Bucket',      schemaKey: 'content_bucket',
    format: { type: 'sl', selectOptions: [
      { name: 'Growth', color: 'Green' }, { name: 'Authority', color: 'Blue' }, { name: 'Conversion', color: 'Orange' }
    ]}},
  { name: 'LinkedIn Framework',  schemaKey: 'linkedin_framework',
    format: { type: 'sl', selectOptions: [
      { name: 'AIDA', color: 'Purple' }, { name: 'PAS', color: 'Blue' }, { name: 'StoryArc', color: 'Green' }
    ]}},
  { name: 'Recommended CTA',     schemaKey: 'recommended_cta',
    format: { type: 'none' }},
];

async function main(): Promise<void> {
  console.log('\n[setup] Adding LinkedIn playbook columns to Content Ideas table...');
  const updates: Record<string, string> = {};

  for (const col of COLUMNS) {
    const res  = await fetch(`${BASE}/columns`, {
      method: 'POST', headers: HEADERS,
      body: JSON.stringify({ name: col.name, format: col.format }),
    });
    const data = await res.json() as { id?: string; name?: string; message?: string };
    if (!res.ok) { console.error(`  ✗ ${col.name}: ${data.message}`); continue; }
    console.log(`  ✓ "${data.name}" → ${data.id}`);
    updates[col.schemaKey] = data.id!;
  }

  // Auto-update coda-schema.json
  const fs = await import('fs');
  const schema = JSON.parse(fs.readFileSync('config/coda-schema.json', 'utf8'));
  for (const [key, id] of Object.entries(updates)) {
    schema.tables.content_ideas.columns[key] = id;
  }
  delete schema.tables.content_ideas._new_columns_note;
  fs.writeFileSync('config/coda-schema.json', JSON.stringify(schema, null, 2));
  console.log('\n✓ config/coda-schema.json auto-updated with real column IDs');
  console.log('Commit: git add config/coda-schema.json && git commit -m "chore: update Coda column IDs after playbook column setup"\n');
}

main().catch(err => { console.error(err); process.exit(1); });
