# Secret Management Guide

API keys and credentials are NEVER committed to this repository.
Three options depending on your context:

---

## Option 1: Local Development (.env file)

The simplest approach for running agents on your own machine.

```bash
cp .env.example .env
# Edit .env and fill in all values
```

The `.env` file is in `.gitignore` — git will never track it.
Double-check with `git status` — `.env` should never appear.

**Verify your setup:**
```bash
git status           # .env should not appear
git diff --cached    # .env should not appear
grep -r "CODA_API_KEY=" .git/  # should return nothing
```

---

## Option 2: GitHub Actions Secrets (CI/Automated runs)

For automated pipeline runs triggered by GitHub Actions cron jobs.

1. Go to your repo: **Settings → Secrets and variables → Actions**
2. Click **New repository secret** for each variable in `.env.example`
3. Use the exact same variable name (e.g. `CODA_API_KEY`)

Keys are encrypted at rest, never visible after entry, and injected
as environment variables at runtime — they never touch the filesystem.

The workflow file at `.github/workflows/daily-pipeline.yml` handles
injection automatically. You can also trigger any agent manually from
the **Actions** tab → **Daily Content Pipeline** → **Run workflow**.

---

## Option 3: Doppler (Team use, most secure)

When you add team members, use Doppler to centralize secrets.

```bash
# Install Doppler CLI
brew install dopplerhq/cli/doppler   # macOS
curl -Ls https://cli.doppler.com/install.sh | sh  # Linux

# Authenticate
doppler login

# Create project and config
doppler setup

# Run any agent with secrets auto-injected
doppler run -- npm run scout
doppler run -- npm run transcriber
```

Doppler syncs automatically to GitHub Actions via its GitHub integration —
no manual secret entry needed when you add new keys.

---

## Key Rotation

When rotating a key:
1. Generate new key in the source service
2. Update `.env` locally (Option 1) or GitHub Secrets (Option 2) or Doppler (Option 3)
3. Verify the new key works: `npm run scout` (dry run)
4. Revoke the old key in the source service
5. Never commit the old or new key to git

---

## Emergency: Key Accidentally Committed

If a key ever appears in a commit:
1. **Immediately revoke the key** in the source service — assume it is compromised
2. Generate a new key
3. Remove the key from git history: `git filter-branch` or BFG Repo Cleaner
4. Force-push the cleaned history
5. Add the value pattern to `.gitignore` and `.git/hooks/pre-commit`

GitHub will also automatically alert you if it detects secret patterns in commits.
