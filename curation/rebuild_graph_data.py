"""Rebuild assets/data/graph_data.json from the OpenAlex export, gated by the
ResearchGate + Google Scholar allow-list and a deny-list for known-bad clusters.

Inputs:
  - assets/data/graph_data.json (current OpenAlex-sourced dataset)
  - curation/researchgate_publications.json
  - curation/scholar_publications.json
  - curation/themes.json
  - curation/theme_overrides.json (optional, {doi_or_id: [theme_slug, ...]})
  - curation/deny.json (optional, {bad_authors: [...], bad_journals_substr: [...]})

Outputs:
  - assets/data/graph_data.json (overwritten, cleaned + re-themed)
  - curation/quarantined.json (rejected pubs with reasons)
  - curation/rebuild_report.txt (counts, year span, etc.)
"""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GRAPH_PATH = ROOT / "assets" / "data" / "graph_data.json"
CUR = ROOT / "curation"

DEFAULT_DENY = {
    "bad_authors": ["Randall L. McEntaffer"],
    "bad_journals_substr": [
        "proceedings of spie",
        "spie",
        "head",
        "aas",
    ],
    "physics_keywords": [
        "x-ray", "x ray", "starshade", "off-plane", "off plane",
        "grating spectrometer", "optical telescope", "interferomet",
    ],
}


def norm_title(s: str) -> str:
    if not s:
        return ""
    s = s.lower()
    s = re.sub(r"&\w+;", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def title_shingles(title: str, k: int = 3) -> set:
    toks = norm_title(title).split()
    if len(toks) < k:
        return {" ".join(toks)} if toks else set()
    return {" ".join(toks[i:i + k]) for i in range(len(toks) - k + 1)}


def jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def norm_doi(d):
    if not d:
        return None
    d = d.lower()
    d = re.sub(r"^https?://(dx\.)?doi\.org/", "", d)
    return d.strip()


def build_known_coauthors(rg_matched_pubs):
    """Collect coauthor names that appear in at least N matched-by-source pubs."""
    counts = Counter()
    for pub in rg_matched_pubs:
        for a in pub.get("authors", []):
            n = a.get("name")
            if n and n != "Timothy P. Johnson":
                counts[n] += 1
    return {n for n, c in counts.items() if c >= 2}


def load_inputs():
    graph = json.loads(GRAPH_PATH.read_text(encoding="utf-8"))
    rg = json.loads((CUR / "researchgate_publications.json").read_text(encoding="utf-8"))
    scholar = json.loads((CUR / "scholar_publications.json").read_text(encoding="utf-8"))
    themes_doc = json.loads((CUR / "themes.json").read_text(encoding="utf-8"))
    deny_path = CUR / "deny.json"
    deny = json.loads(deny_path.read_text(encoding="utf-8")) if deny_path.exists() else DEFAULT_DENY
    overrides_path = CUR / "theme_overrides.json"
    overrides = json.loads(overrides_path.read_text(encoding="utf-8")) if overrides_path.exists() else {}
    return graph, rg, scholar, themes_doc, deny, overrides


def build_allow_index(rg, scholar):
    """Returns (doi_set, shingle_pubs) where shingle_pubs is a list of (title_shingles, year)."""
    doi_set = set()
    shingle_pubs = []
    for src in (rg, scholar):
        for p in src:
            d = norm_doi(p.get("doi"))
            if d:
                doi_set.add(d)
            t = p.get("title")
            if t:
                shingle_pubs.append((title_shingles(t), p.get("year")))
    return doi_set, shingle_pubs


def matches_allow(pub, doi_set, shingle_pubs):
    d = norm_doi(pub.get("doi"))
    if d and d in doi_set:
        return "doi"
    sh = title_shingles(pub.get("title") or "")
    if not sh:
        return None
    py = pub.get("year")
    for other_sh, other_y in shingle_pubs:
        if jaccard(sh, other_sh) >= 0.85:
            if not py or not other_y or abs(py - other_y) <= 2:
                return "title"
    return None


def is_denied(pub, deny):
    bad_authors = {a.lower() for a in deny.get("bad_authors", [])}
    for a in pub.get("authors", []):
        if (a.get("name") or "").lower() in bad_authors:
            return f"deny:author:{a.get('name')}"
    journal = (pub.get("journal") or "").lower()
    for sub in deny.get("bad_journals_substr", []):
        if sub and sub in journal:
            return f"deny:journal:{pub.get('journal')}"
    title_l = (pub.get("title") or "").lower()
    has_physics = any(k in title_l for k in deny.get("physics_keywords", []))
    if has_physics:
        return f"deny:physics_title"
    return None


def assign_themes(pub, themes_doc, overrides):
    pub_id = pub.get("id")
    doi_key = norm_doi(pub.get("doi"))
    for key in (pub_id, doi_key):
        if key and key in overrides:
            slugs = overrides[key]
            if slugs:
                return list(slugs), slugs[0]
    hay = " ".join([
        pub.get("title") or "",
        pub.get("abstract") or "",
        pub.get("journal") or "",
    ]).lower()
    matched = []
    for t in themes_doc["themes"]:
        for kw in t["keywords"]:
            if kw and kw in hay:
                matched.append(t["slug"])
                break
    if not matched:
        matched = ["general"]
    return matched, matched[0]


def rebuild_stats_and_network(kept):
    coauthor_meta = {}
    coauthor_counts = Counter()
    for p in kept:
        for a in p.get("authors", []):
            if (a.get("name") or "") == "Timothy P. Johnson":
                continue
            uuid = a.get("uuid")
            if not uuid:
                continue
            coauthor_counts[uuid] += 1
            if uuid not in coauthor_meta:
                coauthor_meta[uuid] = {
                    "id": uuid,
                    "name": a.get("name"),
                }
    journal_counts = Counter(
        (p.get("journal") or "").strip() for p in kept if p.get("journal")
    )

    coauthors = []
    for uuid, count in coauthor_counts.most_common():
        rec = dict(coauthor_meta[uuid])
        rec["count"] = count
        coauthors.append(rec)

    top_coauthors = [
        {"id": c["id"], "name": c["name"], "count": c["count"]}
        for c in coauthors[:20]
    ]
    top_journals = [
        {"name": name, "count": count}
        for name, count in journal_counts.most_common(15)
    ]

    years = [p.get("year") for p in kept if p.get("year")]
    years_span = f"{min(years)} - {max(years)}" if years else "N/A"

    main_uuid = None
    for p in kept:
        for a in p.get("authors", []):
            if (a.get("name") or "") == "Timothy P. Johnson":
                main_uuid = a.get("uuid")
                break
        if main_uuid:
            break

    nodes = []
    edges = []
    if main_uuid:
        nodes.append({"data": {"id": main_uuid, "label": "Timothy P. Johnson", "count": len(kept), "type": "main"}})
        for c in coauthors[:80]:
            nodes.append({"data": {"id": c["id"], "label": c["name"], "count": c["count"], "type": "coauthor"}})
            edges.append({"data": {"id": f"edge_{c['id']}", "source": main_uuid, "target": c["id"], "weight": c["count"]}})

    stats = {
        "total_publications": len(kept),
        "years_span": years_span,
        "total_coauthors": len(coauthors),
        "top_journals": top_journals,
        "top_coauthors": top_coauthors,
    }
    return stats, coauthors, {"nodes": nodes, "edges": edges}


def main() -> int:
    graph, rg, scholar, themes_doc, deny, overrides = load_inputs()
    pubs = graph.get("publications", [])
    print(f"Loaded {len(pubs)} OpenAlex publications", flush=True)
    print(f"Allow sources: RG={len(rg)}, Scholar={len(scholar)}", flush=True)

    doi_set, shingle_pubs = build_allow_index(rg, scholar)

    # Two-pass: first pass classifies source-matched vs unmatched; second pass
    # decides which unmatched pubs to keep based on coauthor overlap with the
    # matched set (a stronger signal than "type is journal_article + has abstract").
    source_matched = []
    candidates_unmatched = []
    quarantined = []
    reason_counts = Counter()

    for pub in pubs:
        deny_reason = is_denied(pub, deny)
        if deny_reason:
            quarantined.append({"publication": pub, "reason": deny_reason})
            reason_counts[deny_reason.split(":")[0] + ":denied"] += 1
            continue
        allow_reason = matches_allow(pub, doi_set, shingle_pubs)
        if allow_reason:
            source_matched.append((pub, allow_reason))
        else:
            candidates_unmatched.append(pub)

    known_coauthors = build_known_coauthors([p for p, _ in source_matched])

    kept = []
    for pub, allow_reason in source_matched:
        themes, primary = assign_themes(pub, themes_doc, overrides)
        new = dict(pub)
        new["theme"] = primary
        new["themes"] = themes
        new["source_match"] = allow_reason
        kept.append(new)

    matched_count = len(kept)

    for pub in candidates_unmatched:
        has_known = any(
            (a.get("name") in known_coauthors)
            for a in pub.get("authors", [])
            if a.get("name") != "Timothy P. Johnson"
        )
        if has_known:
            themes, primary = assign_themes(pub, themes_doc, overrides)
            new = dict(pub)
            new["theme"] = primary
            new["themes"] = themes
            new["source_match"] = "coauthor_network"
            kept.append(new)
            reason_counts["kept:coauthor_network"] += 1
        else:
            quarantined.append({"publication": pub, "reason": "unverified:no_source_or_coauthor_match"})
            reason_counts["quarantined:unverified"] += 1

    stats, coauthors, network = rebuild_stats_and_network(kept)

    out_graph = {
        "stats": stats,
        "publications": kept,
        "coauthors": coauthors,
        "network": network,
    }
    GRAPH_PATH.write_text(json.dumps(out_graph, indent=2, ensure_ascii=False), encoding="utf-8")
    (CUR / "quarantined.json").write_text(
        json.dumps(quarantined, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    theme_dist = Counter()
    for p in kept:
        for t in p.get("themes", []):
            theme_dist[t] += 1

    report = []
    report.append(f"input OpenAlex pubs: {len(pubs)}")
    report.append(f"kept (RG/Scholar matched): {matched_count}")
    report.append(f"kept (heuristic, no source match): {reason_counts.get('kept:heuristic', 0)}")
    report.append(f"quarantined: {len(quarantined)}")
    for reason, n in sorted(reason_counts.items()):
        report.append(f"  {reason}: {n}")
    report.append("")
    report.append(f"final total_publications: {stats['total_publications']}")
    report.append(f"years_span: {stats['years_span']}")
    report.append(f"total_coauthors: {stats['total_coauthors']}")
    report.append("")
    report.append("theme distribution (multi-label):")
    for slug, n in theme_dist.most_common():
        report.append(f"  {slug}: {n}")
    (CUR / "rebuild_report.txt").write_text("\n".join(report) + "\n", encoding="utf-8")
    print("\n".join(report))
    return 0


if __name__ == "__main__":
    sys.exit(main())
