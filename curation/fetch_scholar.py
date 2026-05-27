"""Fetch Dr. Timothy P. Johnson's Google Scholar publications via `scholarly`.

Output: curation/scholar_publications.json
Schema: [{title, year, authors, venue, source: 'scholar', scholar_id, citations}]
"""
import json
import sys
import time
from pathlib import Path

from scholarly import scholarly

AUTHOR_ID = "DGHsTEgAAAAJ"
OUT_PATH = Path(__file__).parent / "scholar_publications.json"


def main() -> int:
    print(f"Looking up author {AUTHOR_ID}...", flush=True)
    try:
        author = scholarly.search_author_id(AUTHOR_ID)
        author = scholarly.fill(author, sections=["publications"])
    except Exception as e:
        print(f"ERROR: author lookup/fill failed: {e}", file=sys.stderr)
        return 1

    pubs = author.get("publications", [])
    print(f"Author returned {len(pubs)} publication stubs. Filling each...", flush=True)

    rows = []
    for i, pub in enumerate(pubs):
        bib = pub.get("bib", {})
        title = bib.get("title")
        year_raw = bib.get("pub_year")
        year = None
        if year_raw:
            try:
                year = int(str(year_raw)[:4])
            except ValueError:
                year = None
        rows.append({
            "title": title,
            "year": year,
            "authors": bib.get("author"),
            "venue": bib.get("citation") or bib.get("journal") or bib.get("venue"),
            "citations": pub.get("num_citations"),
            "scholar_id": pub.get("author_pub_id"),
            "source": "scholar",
        })
        if (i + 1) % 50 == 0:
            print(f"  processed {i + 1}/{len(pubs)}", flush=True)

    OUT_PATH.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(rows)} rows to {OUT_PATH}")
    print(f"  with year: {sum(1 for r in rows if r['year'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
