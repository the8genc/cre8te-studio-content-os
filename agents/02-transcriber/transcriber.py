"""
Agent 02 — The Transcriber
Processes pending Source Assets via Fireflies API and writes transcripts back to Coda.
"""

import os, sys, json, time, requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

CODA_API_KEY    = os.getenv("CODA_API_KEY")
CODA_DOC_ID     = os.getenv("CODA_DOC_ID", "ktMUNdlobR")
FIREFLIES_KEY   = os.getenv("FIREFLIES_API_KEY")
FIREFLIES_URL   = os.getenv("FIREFLIES_GRAPHQL_ENDPOINT", "https://api.fireflies.ai/graphql")

with open(os.path.join(os.path.dirname(__file__), "../../config/coda-schema.json")) as f:
    SCHEMA = json.load(f)

SA = SCHEMA["tables"]["source_assets"]
TABLE_ID = SA["table_id"]
COLS = SA["columns"]

CODA_BASE = f"https://coda.io/apis/v1/docs/{CODA_DOC_ID}/tables/{TABLE_ID}"
CODA_HEADERS = {"Authorization": f"Bearer {CODA_API_KEY}", "Content-Type": "application/json"}
FF_HEADERS   = {"Authorization": f"Bearer {FIREFLIES_KEY}", "Content-Type": "application/json"}


def coda_get_pending():
    """Fetch Source Assets with Transcription Status = Pending."""
    r = requests.get(
        f"{CODA_BASE}/rows",
        headers=CODA_HEADERS,
        params={"query": f'{COLS["transcription_status"]}:"Pending"', "limit": 50}
    )
    r.raise_for_status()
    return r.json().get("items", [])


def coda_update_row(row_id, cells):
    """Update specific cells on a Coda row."""
    payload = {"row": {"cells": [{"column": k, "value": v} for k, v in cells.items()]}}
    r = requests.put(f"{CODA_BASE}/rows/{row_id}", headers=CODA_HEADERS, json=payload)
    r.raise_for_status()
    return r.json()


def fireflies_upload(file_url, title):
    """Submit a file URL to Fireflies for transcription."""
    mutation = """
    mutation UploadAudio($input: AudioUploadInput) {
      uploadAudio(input: $input) { success message }
    }
    """
    variables = {"input": {"url": file_url, "title": title}}
    r = requests.post(FIREFLIES_URL, headers=FF_HEADERS, json={"query": mutation, "variables": variables})
    r.raise_for_status()
    data = r.json()
    if "errors" in data:
        raise ValueError(f"Fireflies error: {data['errors']}")
    return data["data"]["uploadAudio"]


def fireflies_get_transcript(title, max_wait=1800, interval=60):
    """Poll Fireflies for a completed transcript matching the title."""
    query = """
    query GetTranscripts($title: String) {
      transcripts(title: $title, limit: 5) {
        id title date summary { keywords overview action_items }
        sentences { speaker_name text start_time end_time }
      }
    }
    """
    start = time.time()
    while time.time() - start < max_wait:
        r = requests.post(FIREFLIES_URL, headers=FF_HEADERS, json={"query": query, "variables": {"title": title}})
        r.raise_for_status()
        transcripts = r.json().get("data", {}).get("transcripts", [])
        if transcripts:
            return transcripts[0]
        print(f"  Waiting for Fireflies... ({int(time.time()-start)}s elapsed)")
        time.sleep(interval)
    raise TimeoutError(f"Fireflies did not return transcript within {max_wait}s for: {title}")


def format_transcript(sentences):
    """Convert sentence list to readable transcript with speaker labels."""
    lines = []
    current_speaker = None
    for s in sentences:
        speaker = s.get("speaker_name", "Speaker")
        if speaker != current_speaker:
            lines.append(f"\n[{speaker}]")
            current_speaker = speaker
        lines.append(s.get("text", ""))
    return " ".join(lines).strip()


def process_asset(row):
    """Full transcription pipeline for a single asset row."""
    row_id = row["id"]
    values = row.get("values", {})
    asset_name = values.get(COLS["asset_name"], {}).get("value", f"Asset-{row_id}")
    file_url   = values.get(COLS["raw_file_url"], {}).get("value", "")

    if not file_url:
        print(f"  SKIP {asset_name}: no file URL")
        coda_update_row(row_id, {COLS["transcription_status"]: "Error — No URL"})
        return

    print(f"  Processing: {asset_name}")

    # Mark as In Progress
    coda_update_row(row_id, {COLS["transcription_status"]: "In Progress"})

    # Submit to Fireflies
    result = fireflies_upload(file_url, asset_name)
    if not result.get("success"):
        raise ValueError(f"Upload rejected: {result.get('message')}")

    # Poll for completion
    transcript_data = fireflies_get_transcript(asset_name)

    # Format outputs
    transcript_text = format_transcript(transcript_data.get("sentences", []))
    summary         = transcript_data.get("summary", {})
    keywords        = ", ".join(summary.get("keywords", []))
    overview        = summary.get("overview", "")
    key_themes      = f"{keywords}\n\nOverview: {overview}" if overview else keywords

    # Write back to Coda
    coda_update_row(row_id, {
        COLS["transcript"]:            transcript_text,
        COLS["key_themes"]:            key_themes,
        COLS["transcription_status"]:  "Complete",
        COLS["processed"]:             True,
    })
    print(f"  ✓ Complete: {asset_name} ({len(transcript_text)} chars)")


def main():
    print(f"\n[Transcriber] Starting at {datetime.now(timezone.utc).isoformat()}")
    pending = coda_get_pending()
    print(f"[Transcriber] Found {len(pending)} pending assets")

    success, errors = 0, 0
    for row in pending:
        try:
            process_asset(row)
            success += 1
        except Exception as e:
            errors += 1
            row_id = row["id"]
            name   = row.get("values", {}).get(COLS["asset_name"], {}).get("value", row_id)
            print(f"  ERROR {name}: {e}")
            try:
                coda_update_row(row_id, {COLS["transcription_status"]: f"Error — {str(e)[:100]}"})
            except Exception:
                pass

    print(f"[Transcriber] Done — {success} transcribed, {errors} errors\n")


if __name__ == "__main__":
    main()
