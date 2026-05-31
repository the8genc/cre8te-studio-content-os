# Pending Actions

**Ordered by priority. Start from the top.**

Anyone picking up this project — human or AI — should read this file first,
then read `context/STATUS.md` for full build context.

---

## 🔴 IMMEDIATE — Credentials (owner action, blocks everything)

Add these to GitHub Secrets:
`github.com/the8genc/cre8te-studio-content-os → Settings → Secrets → Actions`

```
□ CODA_API_KEY
  Where: coda.io/account → API → Generate token
  Unlocks: All agents that read/write Coda

□ CODA_DOC_ID
  Value: ktMUNdlobR
  Unlocks: All Coda operations

□ ANTHROPIC_API_KEY
  Where: console.anthropic.com → API Keys
  Unlocks: Agents 03 (Strategist), 04 (Writer), 05 (Newsletter), 08 (Scout scoring)

□ FIREFLIES_API_KEY
  Where: app.fireflies.ai → Integrations → API
  Unlocks: Agent 02 (Transcriber)

□ APIFY_API_KEY
  Where: console.apify.com → Settings → Integrations
  Unlocks: Agent 08 (Research Scout — LinkedIn, Instagram, TikTok scrapers)

□ PERPLEXITY_API_KEY
  Where: perplexity.ai/api-platform
  Unlocks: Agent 08 (Research Scout — web/news intelligence)

□ POSTIZ_API_KEY
  Where: postiz.com → Settings → API
  Unlocks: Agent 06 (Publisher — social posts)
  Note: Also connect all 5 social accounts inside Postiz dashboard

□ KIT_API_KEY
  Where: app.kit.com → Settings → Developer → API Secret
  Unlocks: Agent 06 (Publisher — newsletter send), Agent 09 (Testing Agent email)
  Note: Also create a subscriber list and note the list ID

□ REPORT_EMAIL
  Value: PM's email address for test result reports
  Unlocks: Agent 09 (Testing Agent) daily and weekly emails

□ AGENT_EMAIL
  Value: agents@cre8testudio.com (provision this mailbox first)
  Unlocks: Agent 09 outbound email identity

□ SENDGRID_API_KEY  [optional — Kit covers this if KIT_API_KEY is set]
  Where: sendgrid.com
  Unlocks: Testing Agent fallback email sender
```

**Google Drive (for Agent 01 Ingester)**:
```
□ GOOGLE_DRIVE_CREDENTIALS_JSON
  Where: console.cloud.google.com → IAM → Service Accounts → Create → Download JSON
  Note: Share each source folder with the service account email

□ GOOGLE_DRIVE_SUMMIT_FOLDER_ID
□ GOOGLE_DRIVE_MINIPOD_FOLDER_ID
□ GOOGLE_DRIVE_TESTIMONIAL_FOLDER_ID
□ GOOGLE_DRIVE_ITL_FOLDER_ID
  How: Create folders in Drive, share with service account, copy folder ID from URL
```

---

## 🟡 PHASE 3 — Publishing Go-Live

Complete in order after credentials are provisioned.

### Step 1: Validate Coda connectivity
```bash
npm run ingester   # Should write rows to Source Assets table in Coda
                   # Check: coda.io/d/_dktMUNdlobR → Content OS Tables
```

### Step 2: First live transcription
1. Upload one Summit recording to the Google Drive Summit folder
2. Run `npm run ingester` — verify new row appears in Coda Source Assets
3. Run `npm run transcriber` — verify transcript appears in the row

### Step 3: Validate content generation
1. Run `npm run strategist` — verify content ideas appear in Coda (status = Pending)
2. Review ideas in Coda "🟡 Pending Approval" view, approve 2–3
3. Run `npm run writer` — verify content packages created for approved ideas

### Step 4: Validate publishing
1. Set one content package to Publish Status = Scheduled, Publish Date = today
2. Run `npm run publisher` — verify post appears on each platform
3. Verify published URLs written back to Content Packages in Coda

### Step 5: Validate newsletter
1. Run `npm run newsletter` (or wait for Thursday cron)
2. Review newsletter draft in Coda "📰 Newsletter Review" view, approve it
3. Run `npm run publisher` — verify email received

### Step 6: Validate Testing Agent email
1. Ensure REPORT_EMAIL and AGENT_EMAIL are set in GitHub Secrets
2. Trigger manually: GitHub Actions → Daily Content Pipeline → Run workflow → agent: test
3. Verify email received at REPORT_EMAIL

### Step 7: Phase 3 sign-off
```
□ Live post published to all 5 platforms with URLs in Coda
□ Newsletter sent to Kit subscribers and logged in Coda
□ Testing Agent email received at REPORT_EMAIL
□ All Coda status fields updating correctly through pipeline
□ Commit: "feat: Phase 3 live — first production run complete"
□ Update context/STATUS.md — Phase 3 complete
```

---

## 🟡 PHASE 4 — Intelligence Loop

Start after Phase 3 is live and stable.

### Analytics OAuth setup (one per platform)
- **Instagram**: Meta Developer Console → create app → Instagram Graph API → request `instagram_basic` and `instagram_manage_insights` permissions
- **LinkedIn**: LinkedIn Developer Portal → create app → Marketing Analytics → request `r_organization_social` scope  
- **YouTube**: GCP Console → enable YouTube Data API v3 → create OAuth credentials
- **TikTok**: TikTok Developer Portal → create app → request Display API access
- **Facebook**: same Meta app as Instagram → request `page_insights` permission

### Wire real analytics into Agent 07
- File: `agents/07-analyst/analyst.ts`
- Stub functions are already in place for all 5 platforms
- Replace each `console.log(...)` stub with real API call using the OAuth tokens above
- Add platform credentials to GitHub Secrets

### Validate Knowledge Base update loop
- After first week live: run `npm run analyst`
- Verify top-performing hooks (engagement > 2× median) appear in Brand Voice KB in Coda
- If no data yet: create synthetic test data in Analytics Log table

### Research Scout live testing
- After APIFY_API_KEY and PERPLEXITY_API_KEY are set
- Run: `npm run scout`
- Verify items appear in Research Intelligence table in Coda
- Check 🔴 Priority Items view — should contain items scoring ≥ 8.5
- Review 📊 Workshop Signals view — surface creator skill gaps

---

## 🟢 PHASE 4 — DaVinci Resolve Integration

When the editor is ready to use Resolve with Summit footage.

### Step 1: Fork AutoSubs
```bash
# Fork: github.com/tmoroney/auto-subs into the8genc org
# Clone your fork, then add Coda write-back hook

# See docs/davinci-integration.md for the exact TypeScript code to add
# Key change: at end of transcription job, POST transcript to Coda Source Assets
```
Note: Use v3.5.3+ — fixes DaVinci Resolve 20.x connection issues.
Note: Does NOT work with Mac App Store version of Resolve — install from blackmagicdesign.com.

### Step 2: Fork davinci-resolve-mcp
```bash
# Fork: github.com/samuelgursky/davinci-resolve-mcp
# Requires: DaVinci Resolve Studio license ($295)
# Enable: Resolve Preferences → System → General → External scripting: Local
```
If no Studio license: use `github.com/hiteshK03/davinci-resolve-mcp` instead (free, 155 tools).

### Step 3: Test editor workflow
1. Open Summit recording in Resolve timeline
2. Run AutoSubs → "Transcribe & Push to Coda"
3. Verify transcript + speaker labels appear in Coda Source Assets table
4. Verify Ingester doesn't double-register the asset (dedup check on file URL)

---

## 🔵 PHASE 5 — Skill Packaging + Retrospective

After Phase 4 is live.

```
□ Document all 9 agent .md files as standalone reusable skills
□ Add PRD Generator Skill to ai-8gent-skills repo
□ Write retrospective: what worked, what to tune, what to add next
□ Version 1.0 sign-off commit
□ Update context/STATUS.md — all phases complete
```

---

## 📋 BACKLOG (future, no timeline)

These are validated ideas but not yet scheduled:

- [ ] Testimonial collection automation (form → Coda → pipeline)
- [ ] Community engagement automation (Facebook Group / Discord auto-posts)
- [ ] Event/workshop promotion tied to Research Scout workshop signals
- [ ] Analytics dashboard in Coda (formula views of Analytics Log data)
- [ ] A/B hook testing: test two versions, Analyst picks winner after 48h
- [ ] Semantic archive search via StoryToolkitAI (as Summit library grows)
- [ ] Multi-approver workflow (team review mode in Coda)
- [ ] Slack/email notification when new content ideas are ready for approval
