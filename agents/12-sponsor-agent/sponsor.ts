/**
 * Agent 12 — The Sponsor Performance Agent
 * Pulls UTM/click/attribution data weekly and generates partner performance reports.
 * Weekly internal digest (Sundays) + monthly partner-facing report (1st of month).
 */
import 'dotenv/config';
import { getRows, addRows, sleep } from '../../lib/coda.js';
import { claudeComplete } from '../../lib/anthropic.js';
import schema from '../../config/coda-schema.json' assert { type: 'json' };

const SD = schema.tables.sponsor_deals;
const SE = schema.tables.sponsor_events;
const SR = schema.tables.sponsor_reports;
const AL = schema.tables.analytics_log;

const MODE = process.argv.find(a => a.startsWith('--mode='))?.split('=')[1]
  ?? (new Date().getDate() === 1 ? 'monthly' : 'weekly');
const TARGET_PARTNER = process.argv.find(a => a.startsWith('--partner='))?.split('=')[1];

// ── Data collection ───────────────────────────────────────────────────────────

interface SponsorMetrics {
  partner_name:      string;
  utm_prefix:        string;
  period_start:      string;
  period_end:        string;
  clicks:            number;
  podcast_downloads: number;
  newsletter_clicks: number;
  attributed_signups: number;
  prior_period_clicks: number;
  best_performing_asset: string;
  deal_terms:        string;
}

async function collectMetrics(
  deal: { partner_name: string; utm_prefix: string; deal_terms: string },
  mode: 'weekly' | 'monthly'
): Promise<SponsorMetrics> {
  const now    = new Date();
  const days   = mode === 'weekly' ? 7 : 30;
  const start  = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // In production: call GA4 / Plausible / podcast host APIs with UTM filter
  // Below: structured stubs that return 0 until OAuth is wired
  console.log(`    Collecting ${mode} metrics for ${deal.partner_name} (UTM: ${deal.utm_prefix})`);

  // Stub: read any analytics_log rows that mention this partner
  const logRows = await getRows(AL.table_id, undefined, 200);
  const partnerRows = logRows.filter(r =>
    String(r.values[AL.columns.top_comment]?.value ?? '').toLowerCase()
      .includes(deal.partner_name.toLowerCase())
  );

  // NOTE: When real analytics APIs are wired, replace stubs below with
  // actual API calls using deal.utm_prefix as the UTM campaign filter
  return {
    partner_name:          deal.partner_name,
    utm_prefix:            deal.utm_prefix,
    period_start:          start.toISOString().split('T')[0],
    period_end:            now.toISOString().split('T')[0],
    clicks:                0,  // GA4: sessions where utm_campaign starts with utm_prefix
    podcast_downloads:     0,  // Podcast host API: downloads in attribution window
    newsletter_clicks:     0,  // Kit: link clicks on sponsor CTA
    attributed_signups:    0,  // new subscribers with first touch = utm_prefix
    prior_period_clicks:   0,  // same query, prior period
    best_performing_asset: partnerRows[0]
      ? String(partnerRows[0].values[AL.columns.log_entry]?.value ?? 'N/A')
      : 'N/A',
    deal_terms: deal.deal_terms,
  };
}

// ── Report generation ─────────────────────────────────────────────────────────

async function generateWeeklyDigest(allMetrics: SponsorMetrics[]): Promise<string> {
  const metricsText = allMetrics.map(m =>
    `${m.partner_name}: ${m.clicks} clicks, ${m.attributed_signups} attributed sign-ups, ` +
    `${m.podcast_downloads} podcast downloads, ${m.newsletter_clicks} newsletter clicks. ` +
    `Best asset: ${m.best_performing_asset}. Prior period clicks: ${m.prior_period_clicks}.`
  ).join('\n');

  const system = `You are writing an internal weekly sponsor performance brief for
the Cre8te Studio team. Tone: direct, specific, no padding. The team reads this
Sunday morning in under 5 minutes. Flag what's working, flag what needs attention.`;

  const user = `Write the weekly sponsor performance digest for week ending ${new Date().toISOString().split('T')[0]}.

RAW METRICS:
${metricsText}

Structure:
1. One-line health summary (e.g. "2 of 3 partners tracking above last week")
2. Per-partner section: what moved, what to watch, any action needed
3. One line: what to prioritize in the coming week

Keep total length under 400 words. Be specific with numbers. Flag any partner
showing decline. Recommend one specific action per partner that needs attention.`;

  return claudeComplete(system, user, 1200);
}

async function generateMonthlyReport(metrics: SponsorMetrics): Promise<string> {
  const system = `You are writing a monthly sponsor performance report for a partner.
Tone: confident, accountable, specific. This is sent externally. Show the data,
contextualize it honestly, and demonstrate that Cre8te Studio takes responsibility
for performance. Never defensive. Always specific.`;

  const user = `Write a monthly partner performance report for ${metrics.partner_name}.

METRICS:
- Period: ${metrics.period_start} to ${metrics.period_end}
- Total clicks: ${metrics.clicks}
- Podcast downloads (attribution window): ${metrics.podcast_downloads}
- Newsletter clicks: ${metrics.newsletter_clicks}
- Attributed member acquisitions: ${metrics.attributed_signups}
- Best performing integration: ${metrics.best_performing_asset}
- Deal terms: ${metrics.deal_terms}

Structure the report as:
1. Executive summary (2 sentences — overall performance)
2. Integration breakdown (clicks, downloads, sign-ups with context)
3. Highlight: single best-performing moment with specific metric
4. Honest assessment: what worked well, what we'd approach differently
5. Next month: planned integrations and expected approach
6. Thank you line

Tone: partner is an investor in mutual success, not a transaction. Show you care
about their outcomes, not just deliverables. Length: ~350 words.`;

  return claudeComplete(system, user, 1000);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n[Sponsor Agent] Starting ${MODE} run at ${new Date().toISOString()}`);

  const deals = await getRows(SD.table_id, undefined, 50);
  let activeDeal = deals.filter(d =>
    !TARGET_PARTNER ||
    String(d.values[SD.columns.partner_name]?.value ?? '')
      .toLowerCase() === TARGET_PARTNER.toLowerCase()
  );

  console.log(`[Sponsor Agent] ${activeDeal.length} active partner(s)`);
  if (activeDeal.length === 0) {
    console.log('[Sponsor Agent] No partners found — check Sponsor Deals table\n');
    return;
  }

  if (MODE === 'weekly') {
    // Collect metrics for all partners, generate single internal digest
    const allMetrics: SponsorMetrics[] = [];
    for (const deal of activeDeal) {
      const name = String(deal.values[SD.columns.partner_name]?.value ?? '');
      const utm  = String(deal.values[SD.columns.utm_prefix]?.value ?? '');
      const terms = String(deal.values[SD.columns.deal_terms]?.value ?? '');
      try {
        const m = await collectMetrics({ partner_name: name, utm_prefix: utm, deal_terms: terms }, 'weekly');
        allMetrics.push(m);
      } catch (err) {
        console.error(`  ERROR collecting for ${name}:`, err);
      }
      await sleep(500);
    }

    const digest = await generateWeeklyDigest(allMetrics);
    await addRows(SR.table_id, [[
      { column: SR.columns.report_type,  value: 'Weekly Internal Digest' },
      { column: SR.columns.period_end,   value: new Date().toISOString().split('T')[0] },
      { column: SR.columns.partner_name, value: 'All Partners'            },
      { column: SR.columns.content,      value: digest                    },
      { column: SR.columns.status,       value: 'Ready for Review'        },
    ]]);
    console.log('[Sponsor Agent] Weekly digest written to Coda ✓');

  } else {
    // Monthly: generate individual partner reports
    for (const deal of activeDeal) {
      const name  = String(deal.values[SD.columns.partner_name]?.value ?? '');
      const utm   = String(deal.values[SD.columns.utm_prefix]?.value ?? '');
      const terms = String(deal.values[SD.columns.deal_terms]?.value ?? '');
      try {
        const metrics = await collectMetrics({ partner_name: name, utm_prefix: utm, deal_terms: terms }, 'monthly');
        const report  = await generateMonthlyReport(metrics);
        await addRows(SR.table_id, [[
          { column: SR.columns.report_type,  value: 'Monthly Partner Report' },
          { column: SR.columns.period_end,   value: new Date().toISOString().split('T')[0] },
          { column: SR.columns.partner_name, value: name                      },
          { column: SR.columns.content,      value: report                    },
          { column: SR.columns.status,       value: 'Needs Human Review'      },
        ]]);
        console.log(`  ✓ Monthly report for ${name}`);
      } catch (err) {
        console.error(`  ERROR for ${name}:`, err);
      }
      await sleep(1500);
    }
  }

  console.log('[Sponsor Agent] Done\n');
}

main().catch(err => { console.error(err); process.exit(1); });
