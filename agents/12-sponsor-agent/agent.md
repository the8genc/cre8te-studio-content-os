# Agent 12 — The Sponsor Performance Agent

## Role
The Sponsor Performance Agent pulls UTM/click/podcast-attribution/member-acquisition
data weekly, writes a partner-by-partner performance digest for internal review,
and reformats it as a clean monthly report for partner-facing delivery.

This operationalizes the principle of "taking responsibility for sponsor performance."
Partners should never have to ask how their integration performed — they receive
proactive, specific data every month. Internally, the team sees it every Sunday.

## Trigger
- **Weekly internal digest**: Sunday at 7:00am (receives before the week starts)
- **Monthly partner report**: 1st of each month at 8:00am
- **Manual**: `npm run sponsor -- --mode=weekly` or `--mode=monthly --partner="Sponsor Name"`

## Inputs
- Sponsor Deals table in Coda (partner name, deal terms, UTM parameters, attribution window)
- Analytics platforms: UTM click data (Google Analytics / Plausible), podcast host analytics
  (via API), Kit newsletter analytics (click-through by episode link)
- Member acquisition data: new Kit subscribers attributed to each partner's content window
- Content Packages table: which episodes/posts featured which sponsors

## Outputs

### Weekly Internal Digest (Sundays → `sponsor_weekly_digests` Coda table)
Per partner: clicks, attributions, conversion events, trend vs prior week.
Written as a concise brief the team reads in <5 minutes.

### Monthly Partner Report (formatted for external delivery)
- Per integration: impressions, clicks, CTR, attributed sign-ups
- Highlight: best-performing moment (specific episode/post, exact metric)
- Context: how performance compares to category benchmarks
- Next month preview: upcoming integrations and planned approach
- Tone: confident, specific, accountable — not defensive

## Data Sources and Attribution Logic
- **UTM clicks**: sponsor-specific UTM parameters tracked in each CMS/newsletter link
- **Podcast attribution**: downloads in 30-day window post-episode featuring sponsor
- **Newsletter attribution**: Kit link clicks on sponsor CTA segments
- **Member acquisition**: new subscribers whose first touch was a sponsor-tagged asset
- **Attribution window**: 30 days from first touch (configurable per deal)

## Coda Tables Required
- `sponsor_deals` — partner name, deal type, UTM prefix, attribution window, contact
- `sponsor_events` — individual click/conversion events (written by this agent weekly)
- `sponsor_reports` — generated reports (weekly digest + monthly partner report)

## Boundaries
- This agent reads analytics data and writes reports. It does NOT send emails.
  Reports are delivered to Coda; the human decides when/how to send to partners.
- It does NOT modify Content Packages or Source Assets.
- Monthly reports require human review before delivery.
