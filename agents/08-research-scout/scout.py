"""
Agent 08 — The Research Scout
Surfaces creator economy intelligence from web, LinkedIn, Instagram, and TikTok.
Writes scored, synthesized signals to the Coda Research Intelligence table.
"""

import os, sys, json, time, re, hashlib
import urllib.request, urllib.error
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
CODA_API_KEY        = os.getenv("CODA_API_KEY")
CODA_DOC_ID         = os.getenv("CODA_DOC_ID", "ktMUNdlobR")
PERPLEXITY_API_KEY  = os.getenv("PERPLEXITY_API_KEY")
APIFY_API_KEY       = os.getenv("APIFY_API_KEY")

RESEARCH_TABLE_ID   = os.getenv("CODA_RESEARCH_INTEL_TABLE_ID", "")  # set after table creation
ANTHROPIC_API_KEY   = os.getenv("ANTHROPIC_API_KEY")

PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions"
APIFY_BASE     = "https://api.apify.com/v2"

DAILY_LIMIT_PER_PLATFORM = 50
WEEKLY_LIMIT_PER_PLATFORM = 150
PERPLEXITY_QUERY_LIMIT = 20

# Load research config
with open(os.path.join(os.path.dirname(__file__), "../../config/research-topics.json")) as f:
    RESEARCH_CONFIG = json.load(f)

with open(os.path.join(os.path.dirname(__file__), "../../config/coda-schema.json")) as f:
    SCHEMA = json.load(f)


# ── HTTP helpers ───────────────────────────────────────────────────────────────
def http_post(url, headers, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise ValueError(f"HTTP {e.code}: {e.read().decode()[:300]}")


def http_get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise ValueError(f"HTTP {e.code}: {e.read().decode()[:300]}")


# ── Coda helpers ───────────────────────────────────────────────────────────────
CODA_HEADERS = {
    "Authorization": f"Bearer {CODA_API_KEY}",
    "Content-Type": "application/json"
}

def coda_get_recent_urls(days=14):
    """Fetch URLs already in Research Intelligence table (last N days)."""
    if not RESEARCH_TABLE_ID:
        return set()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    url = f"https://coda.io/apis/v1/docs/{CODA_DOC_ID}/tables/{RESEARCH_TABLE_ID}/rows?limit=500"
    req = urllib.request.Request(url, headers=CODA_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read())
        return {row.get("values", {}).get("c-ri-source-url", {}).get("value", "")
                for row in data.get("items", [])}
    except Exception:
        return set()


def coda_write_item(item):
    """Write a single research intelligence item to Coda."""
    if not RESEARCH_TABLE_ID:
        print(f"  [no table ID] Would write: {item['title'][:60]}")
        return
    payload = {"rows": [{"cells": [
        {"column": "c-ri-title",          "value": item["title"]},
        {"column": "c-ri-source-url",     "value": item["url"]},
        {"column": "c-ri-source-type",    "value": item["source_type"]},
        {"column": "c-ri-platform",       "value": item["platform"]},
        {"column": "c-ri-summary",        "value": item["summary"]},
        {"column": "c-ri-raw-excerpt",    "value": item.get("raw_excerpt", "")[:500]},
        {"column": "c-ri-relevance",      "value": item["scores"]["relevance"]},
        {"column": "c-ri-novelty",        "value": item["scores"]["novelty"]},
        {"column": "c-ri-actionability",  "value": item["scores"]["actionability"]},
        {"column": "c-ri-final-score",    "value": item["scores"]["final"]},
        {"column": "c-ri-use-case-tags",  "value": ", ".join(item.get("use_case_tags", []))},
        {"column": "c-ri-priority",       "value": item["scores"]["final"] >= 8.5},
        {"column": "c-ri-date-scouted",   "value": datetime.now(timezone.utc).date().isoformat()},
    ]}]}
    http_post(
        f"https://coda.io/apis/v1/docs/{CODA_DOC_ID}/tables/{RESEARCH_TABLE_ID}/rows",
        CODA_HEADERS, payload
    )


# ── Perplexity web search ──────────────────────────────────────────────────────
def perplexity_search(query, recency="week"):
    """Query Perplexity Sonar for web/news results with citations."""
    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "sonar",
        "messages": [
            {"role": "system", "content": (
                "You are a research assistant for Cre8te Studio, a community platform "
                "for creators and creative entrepreneurs. Return factual, cited summaries "
                "of recent developments. Focus on specifics: company names, dates, numbers, "
                "direct quotes from announcements. Do not editorialize."
            )},
            {"role": "user", "content": query}
        ],
        "search_recency_filter": recency,
        "return_citations": True,
        "max_tokens": 800
    }
    result = http_post(PERPLEXITY_URL, headers, data)
    content = result["choices"][0]["message"]["content"]
    citations = result.get("citations", [])
    return content, citations


# ── Apify social scrapers ──────────────────────────────────────────────────────
def apify_run_actor(actor_id, input_data, timeout_secs=120):
    """Run an Apify actor and return results."""
    headers = {
        "Authorization": f"Bearer {APIFY_API_KEY}",
        "Content-Type": "application/json"
    }
    # Start run
    run = http_post(
        f"{APIFY_BASE}/acts/{actor_id}/runs?timeout={timeout_secs}",
        headers, {"input": input_data}
    )
    run_id = run.get("data", {}).get("id")
    if not run_id:
        raise ValueError(f"Apify actor {actor_id} failed to start: {run}")

    # Poll for completion
    start = time.time()
    while time.time() - start < timeout_secs + 30:
        status_data = http_get(f"{APIFY_BASE}/actor-runs/{run_id}", headers)
        status = status_data.get("data", {}).get("status", "")
        if status == "SUCCEEDED":
            break
        elif status in ("FAILED", "ABORTED", "TIMED-OUT"):
            raise ValueError(f"Apify run {run_id} ended with status: {status}")
        time.sleep(5)

    # Fetch results
    dataset_id = status_data["data"]["defaultDatasetId"]
    results = http_get(f"{APIFY_BASE}/datasets/{dataset_id}/items?limit=200", headers)
    return results.get("data", {}).get("items", [])


def scrape_linkedin_posts(keywords, limit=50):
    """Pull LinkedIn posts matching keywords via Apify."""
    items = []
    for keyword in keywords[:3]:  # max 3 keywords per run
        try:
            results = apify_run_actor(
                "curious_coder/linkedin-post-search-scraper",
                {"searchQuery": keyword, "maxPosts": min(limit // 3, 20)}
            )
            for r in results:
                items.append({
                    "title": r.get("title", r.get("text", "")[:100]),
                    "url": r.get("postUrl", r.get("url", "")),
                    "platform": "LinkedIn",
                    "source_type": "Social",
                    "raw_excerpt": r.get("text", "")[:500],
                    "engagement": r.get("totalReactionCount", 0) + r.get("commentsCount", 0)
                })
        except Exception as e:
            print(f"  LinkedIn scrape error for '{keyword}': {e}")
    return items[:limit]


def scrape_instagram_hashtags(hashtags, limit=50):
    """Pull Instagram posts from tracked hashtags via Apify."""
    items = []
    for tag in hashtags[:3]:
        try:
            results = apify_run_actor(
                "apify/instagram-hashtag-scraper",
                {"hashtags": [tag], "resultsLimit": min(limit // 3, 20)}
            )
            for r in results:
                caption = r.get("caption", "")
                items.append({
                    "title": caption[:100] if caption else f"#{tag} post",
                    "url": r.get("url", r.get("shortCode", "")),
                    "platform": "Instagram",
                    "source_type": "Social",
                    "raw_excerpt": caption[:500],
                    "engagement": r.get("likesCount", 0) + r.get("commentsCount", 0)
                })
        except Exception as e:
            print(f"  Instagram scrape error for '#{tag}': {e}")
    return items[:limit]


def scrape_tiktok_hashtags(hashtags, limit=50):
    """Pull TikTok posts from tracked hashtags via Apify."""
    items = []
    for tag in hashtags[:3]:
        try:
            results = apify_run_actor(
                "clockworks/tiktok-scraper",
                {"hashtags": [tag], "resultsPerPage": min(limit // 3, 20)}
            )
            for r in results:
                desc = r.get("text", r.get("description", ""))
                items.append({
                    "title": desc[:100] if desc else f"#{tag} video",
                    "url": r.get("webVideoUrl", r.get("videoUrl", "")),
                    "platform": "TikTok",
                    "source_type": "Social",
                    "raw_excerpt": desc[:500],
                    "engagement": r.get("diggCount", 0) + r.get("commentCount", 0) + r.get("shareCount", 0)
                })
        except Exception as e:
            print(f"  TikTok scrape error for '#{tag}': {e}")
    return items[:limit]


# ── Claude synthesis and scoring ──────────────────────────────────────────────
def synthesize_and_score(items, existing_urls):
    """Run Claude scoring pass on raw items. Returns only items above threshold."""
    if not items:
        return []

    # Dedup by URL first
    seen_urls = set(existing_urls)
    deduped = []
    for item in items:
        url = item.get("url", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            deduped.append(item)

    if not deduped:
        return []

    # Build scoring prompt
    items_text = "\n\n".join([
        f"ITEM {i+1}:\nTitle: {item['title']}\nPlatform: {item['platform']}\n"
        f"Excerpt: {item.get('raw_excerpt','')[:300]}"
        for i, item in enumerate(deduped[:20])  # max 20 per Claude call
    ])

    prompt = f"""You are scoring research items for Cre8te Studio — a community platform 
for creative entrepreneurs, content creators, and personal brand builders.

Score each item 1-10 on three dimensions:
- Relevance: How directly does this relate to creators, creative entrepreneurs, content creation, AI tools for creators, or platform changes affecting creators?
- Novelty: Is this genuinely new information (high) or well-known background (low)?
- Actionability: Does this suggest a specific content angle, workshop topic, newsletter story, or platform update worth covering?

Also assign use case tags from: [Content Idea, Newsletter Story, Workshop Signal, Platform Update, AI Tool, Industry News]
And write a 2-sentence summary from Cre8te Studio's community-first perspective.

Return JSON array only, no other text:
[{{"item_number": 1, "relevance": 8, "novelty": 7, "actionability": 9, "use_case_tags": ["Content Idea", "Newsletter Story"], "summary": "..."}}]

ITEMS TO SCORE:
{items_text}"""

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    data = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 2000,
        "messages": [{"role": "user", "content": prompt}]
    }

    try:
        result = http_post("https://api.anthropic.com/v1/messages", headers, data)
        raw = result["content"][0]["text"].strip()
        # Strip markdown fences if present
        raw = re.sub(r"^```json\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        scores_list = json.loads(raw)
    except Exception as e:
        print(f"  Claude scoring error: {e}")
        return []

    scored = []
    for score_data in scores_list:
        idx = score_data.get("item_number", 1) - 1
        if idx >= len(deduped):
            continue
        item = deduped[idx].copy()
        r = score_data.get("relevance", 5)
        n = score_data.get("novelty", 5)
        a = score_data.get("actionability", 5)
        final = round(r * 0.4 + n * 0.3 + a * 0.3, 1)
        item["scores"] = {"relevance": r, "novelty": n, "actionability": a, "final": final}
        item["summary"] = score_data.get("summary", "")
        item["use_case_tags"] = score_data.get("use_case_tags", [])
        if final >= 7.0:
            scored.append(item)

    return sorted(scored, key=lambda x: x["scores"]["final"], reverse=True)


# ── Web search pass ────────────────────────────────────────────────────────────
def run_web_research(query_limit=10):
    """Run Perplexity queries and return formatted items."""
    queries = RESEARCH_CONFIG.get("perplexity_queries", [])[:query_limit]
    items = []
    for query in queries:
        try:
            content, citations = perplexity_search(query)
            for cite_url in citations[:2]:  # top 2 citations per query
                items.append({
                    "title": query,
                    "url": cite_url,
                    "platform": "Web/News",
                    "source_type": "Web",
                    "raw_excerpt": content[:500],
                    "engagement": 0
                })
            time.sleep(1)  # rate limit
        except Exception as e:
            print(f"  Perplexity error for '{query[:50]}': {e}")
    return items


# ── Main ───────────────────────────────────────────────────────────────────────
def main(mode="daily"):
    print(f"\n[Research Scout] Starting {mode} run at {datetime.now(timezone.utc).isoformat()}")

    limit = WEEKLY_LIMIT_PER_PLATFORM if mode == "deep" else DAILY_LIMIT_PER_PLATFORM
    query_limit = PERPLEXITY_QUERY_LIMIT if mode == "deep" else 10

    # Load tracked topics
    li_keywords  = RESEARCH_CONFIG.get("linkedin_keywords", [])
    ig_hashtags  = RESEARCH_CONFIG.get("instagram_hashtags", [])
    tt_hashtags  = RESEARCH_CONFIG.get("tiktok_hashtags", [])

    # Get existing URLs for dedup
    existing_urls = coda_get_recent_urls(days=14)
    print(f"[Research Scout] {len(existing_urls)} items already in Coda (14-day window)")

    # Collect raw items from all sources
    all_items = []

    print("[Research Scout] Running web research (Perplexity)...")
    all_items += run_web_research(query_limit)

    print("[Research Scout] Scraping LinkedIn...")
    all_items += scrape_linkedin_posts(li_keywords, limit)

    print("[Research Scout] Scraping Instagram...")
    all_items += scrape_instagram_hashtags(ig_hashtags, limit)

    print("[Research Scout] Scraping TikTok...")
    all_items += scrape_tiktok_hashtags(tt_hashtags, limit)

    print(f"[Research Scout] {len(all_items)} raw items collected, running Claude scoring...")

    # Score and filter
    scored_items = synthesize_and_score(all_items, existing_urls)
    print(f"[Research Scout] {len(scored_items)} items passed scoring threshold (≥7.0)")

    # Write to Coda
    written, errors = 0, 0
    for item in scored_items:
        try:
            coda_write_item(item)
            priority = "🔴 PRIORITY" if item["scores"]["final"] >= 8.5 else ""
            print(f"  ✓ [{item['scores']['final']}] {item['title'][:60]} {priority}")
            written += 1
            time.sleep(0.3)  # gentle Coda rate limiting
        except Exception as e:
            errors += 1
            print(f"  ERROR writing item: {e}")

    print(f"\n[Research Scout] Done — {written} items written, {errors} errors")

    # Priority alert
    priority_items = [i for i in scored_items if i["scores"]["final"] >= 8.5]
    if priority_items:
        print(f"\n🔴 {len(priority_items)} PRIORITY ITEMS flagged:")
        for item in priority_items:
            print(f"   [{item['scores']['final']}] {item['title'][:80]}")
            print(f"   Tags: {', '.join(item.get('use_case_tags', []))}")
            print(f"   {item.get('summary', '')[:120]}")


if __name__ == "__main__":
    mode = "deep" if "--mode=deep" in sys.argv or "--deep" in sys.argv else "daily"
    main(mode=mode)
