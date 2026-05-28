#!/usr/bin/env python3
"""
Reads current publication + book counts from data files and patches
the hardcoded numbers in index.html in-place.
"""
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).parent.parent
INDEX_HTML = REPO / "index.html"
GRAPH_DATA = REPO / "assets" / "data" / "graph_data.json"
BOOKS_DATA = REPO / "assets" / "js" / "books-data.js"


def get_pub_count():
    with open(GRAPH_DATA) as f:
        data = json.load(f)
    return data["stats"]["total_publications"]


def get_book_count():
    content = BOOKS_DATA.read_text()
    # Each book entry starts with "year:" — count those
    return len(re.findall(r"\{\s*year\s*:", content))


def patch_html(pub_count, book_count):
    html = INDEX_HTML.read_text()
    original = html

    # floaty-2 hero counter (the bubble floating near the hero image)
    html = re.sub(
        r'(class="floaty floaty-2">\s*<div class="num">)\d+',
        rf'\g<1>{pub_count}',
        html,
    )

    # stat-band Publications cell
    html = re.sub(
        r'(<div class="stat-num">)\d+(</div><div class="stat-lbl">Publications</div>)',
        rf'\g<1>{pub_count}\2',
        html,
    )

    # stat-band Books & Chapters cell
    html = re.sub(
        r'(<div class="stat-num">)\d+(</div><div class="stat-lbl">Books)',
        rf'\g<1>{book_count}\2',
        html,
    )

    if html == original:
        print("update_home_stats: no changes needed (counts already match)", flush=True)
        return False

    INDEX_HTML.write_text(html)
    return True


def main():
    pub_count = get_pub_count()
    book_count = get_book_count()

    changed = patch_html(pub_count, book_count)
    if changed:
        print(
            f"update_home_stats: patched index.html → {pub_count} publications, {book_count} books & chapters",
            flush=True,
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
