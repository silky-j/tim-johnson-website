#!/bin/bash
# Weekly full refresh for tim-johnson-website.
# Pipeline: Scholar refresh → rebuild publications → rebuild news →
#           update home stats → git commit+push → email notification.

REPO="/Users/elliottjohnson/Documents/GitHub/tim-johnson-website"
LOG="$REPO/curation/weekly_refresh.log"
VENV_PY="$REPO/curation/.venv/bin/python3"
PY="/usr/bin/python3"

cd "$REPO"

echo "=== Weekly refresh $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$LOG"

# ── Snapshot "before" counts ────────────────────────────────────────────────
PUB_BEFORE=$($PY -c "import json; print(json.load(open('assets/data/graph_data.json'))['stats']['total_publications'])" 2>/dev/null || echo 0)
NEWS_BEFORE=$(grep -c '"title"' assets/js/news-data.js 2>/dev/null || echo 0)
echo "Before: $PUB_BEFORE publications, $NEWS_BEFORE news items" >> "$LOG"

# ── Step 1: Refresh Google Scholar data ─────────────────────────────────────
echo "--- Step 1: fetch_scholar.py ---" >> "$LOG"
SCHOLAR_OK=1
if [ -x "$VENV_PY" ]; then
    if "$VENV_PY" curation/fetch_scholar.py >> "$LOG" 2>&1; then
        echo "Scholar refresh succeeded" >> "$LOG"
    else
        echo "Scholar refresh failed — continuing with existing scholar_publications.json" >> "$LOG"
        SCHOLAR_OK=0
    fi
else
    echo "Venv not found at $VENV_PY — skipping Scholar refresh" >> "$LOG"
    SCHOLAR_OK=0
fi

# ── Step 2: Rebuild publications graph ──────────────────────────────────────
echo "--- Step 2: rebuild_graph_data.py ---" >> "$LOG"
if ! $PY curation/rebuild_graph_data.py >> "$LOG" 2>&1; then
    echo "ERROR: rebuild_graph_data.py failed" >> "$LOG"
fi

# ── Step 3: Rebuild news feed ───────────────────────────────────────────────
echo "--- Step 3: scrape_news.py ---" >> "$LOG"
if ! $PY curation/scrape_news.py >> "$LOG" 2>&1; then
    echo "ERROR: scrape_news.py failed" >> "$LOG"
fi

# ── Step 4: Patch home page stats ───────────────────────────────────────────
echo "--- Step 4: update_home_stats.py ---" >> "$LOG"
if ! $PY curation/update_home_stats.py >> "$LOG" 2>&1; then
    echo "ERROR: update_home_stats.py failed" >> "$LOG"
fi

# ── Snapshot "after" counts ─────────────────────────────────────────────────
PUB_AFTER=$($PY -c "import json; print(json.load(open('assets/data/graph_data.json'))['stats']['total_publications'])" 2>/dev/null || echo 0)
NEWS_AFTER=$(grep -c '"title"' assets/js/news-data.js 2>/dev/null || echo 0)
echo "After: $PUB_AFTER publications, $NEWS_AFTER news items" >> "$LOG"

# ── Step 5: Commit and push all changes ─────────────────────────────────────
echo "--- Step 5: git commit ---" >> "$LOG"
# Stage any tracked file that changed (news-data.js, graph_data.json, index.html, etc.)
/usr/bin/git add \
    assets/js/news-data.js \
    assets/data/graph_data.json \
    index.html \
    curation/scholar_publications.json \
    curation/quarantined.json \
    curation/rebuild_report.txt \
    2>/dev/null

if ! /usr/bin/git diff --cached --quiet; then
    /usr/bin/git commit -m "weekly refresh $(date '+%Y-%m-%d')" >> "$LOG" 2>&1
    /usr/bin/git push origin main >> "$LOG" 2>&1
    echo "Pushed changes to origin/main" >> "$LOG"
else
    echo "No tracked changes — nothing to push" >> "$LOG"
fi

# ── Step 6: Send email notification ─────────────────────────────────────────
echo "--- Step 6: send_update_email.py ---" >> "$LOG"
$PY curation/send_update_email.py \
    --pub-before "$PUB_BEFORE" \
    --pub-after "$PUB_AFTER" \
    --news-before "$NEWS_BEFORE" \
    --news-after "$NEWS_AFTER" \
    >> "$LOG" 2>&1

echo "=== Done $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$LOG"
echo "" >> "$LOG"
