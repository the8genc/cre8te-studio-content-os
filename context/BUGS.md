# Known Issues & Bugs

**Last reviewed**: 2026-05-31
**Open bugs**: 0 blocking | 2 non-blocking | 3 known limitations

---

## 🔴 Blocking (fix before Phase 3 go-live)

None currently.

---

## 🟡 Non-Blocking (fix before Phase 4)

### BUG-001: Stale Python files in repo
**Files**: `agents/02-transcriber/transcriber.py`, `agents/08-research-scout/scout.py`
**Status**: Non-blocking — TypeScript versions are canonical, Python files are legacy
**Fix**: Delete both files in next cleanup commit
```bash
git rm agents/02-transcriber/transcriber.py agents/08-research-scout/scout.py
git commit -m "chore: remove stale Python agent files — TypeScript is canonical"
```

### BUG-002: GitHub Actions `.github/README.md` scaffold file
**File**: `.github/README.md`
**Status**: Non-blocking — created as scaffold artifact when pushing workflow file
**Fix**: Delete in same cleanup commit as BUG-001
```bash
git rm .github/README.md
```

---

## 🔵 Known Limitations (by design or acceptable for now)

### LIM-001: Analytics stubs — Agent 07 is not yet live
**What**: `agents/07-analyst/analyst.ts` has stub functions for all 5 platform analytics APIs. All return `null` until OAuth credentials are configured.
**Impact**: Analytics Log table will be empty, Knowledge Base won't auto-update
**Resolution**: Phase 4 work — see `context/PENDING.md` Phase 4 section

### LIM-002: Fireflies speaker labels on non-Zoom sources
**What**: For files uploaded via Drive URL (not Zoom), Fireflies returns generic labels ("Speaker 1", "Speaker 2") instead of real names
**Impact**: Content Strategist and Writer agents receive unlabeled speaker turns
**Workaround**: Include speaker name in filename: `YYYY-MM-DD_SpeakerName_TopicSlug.mp4`
**Longer fix**: Pass attendee metadata in Fireflies `uploadAudio` mutation (see `lib/fireflies.ts`)

### LIM-003: Newsletter `[LINK]` placeholders
**What**: Newsletter Editor generates `[HERO_LINK]`, `[LINK_1]` etc. as placeholders — real URLs are only known after Publisher runs
**Impact**: Newsletter must be reviewed in Coda before send; links need manual filling until Publisher write-back is complete
**Resolution**: Phase 3 — once Publisher writes `published_links` back to Coda, Newsletter Editor can be updated to resolve these from the database before assembly

---

## 🟢 Resolved

| ID | Description | Fixed in |
|---|---|---|
| FIX-001 | Mock Anthropic routing: package prompt matched angles check first, returning wrong fixture | `840b01d` — routing order rewritten |
| FIX-002 | Publisher test 3 failure injection consumed by wrong call | `708ec2c` — deterministic failure injection |
| FIX-003 | Approval loop: revision step crashed when <6 angles generated | `708ec2c` — guarded with `if (revision.length > 0)` |
| FIX-004 | Full pipeline test used stale `scheduled` variable after `updateRow` | `708ec2c` — switched to fresh `dumpTable()` read |
| FIX-005 | Dedup math divided by string length not word count | `708ec2c` — fixed to `hits / wordCount` |
| FIX-006 | GitHub Actions workflow file blocked by insufficient PAT scope | resolved — PAT updated with `workflow` scope |

---

## Reporting New Issues

When you find a bug:
1. Add it to this file with: ID, description, file + line number if known, steps to reproduce, impact, proposed fix
2. If blocking: file a GitHub Issue and link it here
3. If fixed: move to the Resolved section with the commit SHA

Format:
```markdown
### BUG-XXX: Short description
**File/Location**: `path/to/file.ts:line`
**Steps to reproduce**: [numbered steps]
**Expected**: [what should happen]
**Actual**: [what happens instead]
**Impact**: [blocking / non-blocking, which phase]
**Proposed fix**: [or "unknown"]
```
