"""Scrape and compile recent news, press releases, publications, and awards for Dr. Timothy P. Johnson.

Outputs: assets/js/news-data.js
"""
import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

# Try importing googlenewsdecoder
try:
    from googlenewsdecoder import gnewsdecoder
except ImportError:
    gnewsdecoder = None

ROOT = Path(__file__).resolve().parent.parent
GRAPH_PATH = ROOT / "assets" / "data" / "graph_data.json"
OUT_PATH = ROOT / "assets" / "js" / "news-data.js"

# Curated/Handpicked items that are essential highlights
CURATED_ITEMS = [
    {
        "title": "Self-censorship, more stress, tougher recruiting: We asked U.S. researchers how the Trump administration’s science policies have affected them",
        "url": "https://www.washingtonpost.com/ripple/2026/05/19/self-censorship-more-stress-tougher-recruiting-we-asked-us-researchers-how-the-trump-administrations-science-policies-have-affected-them/?itid=hp_brand_promo_1",
        "date": "2026-05-19",
        "source": "The Washington Post",
        "category": "news",
        "snippet": "Co-authored with Eric Welch, this SciOPS survey details the increase in self-censorship and career anxiety among U.S. academic scientists in response to recent science policies."
    },
    {
        "title": "Timothy Johnson Named 2023 AAPOR Award Winner",
        "url": "https://aapor.org/announcements/timothy-johnson-named-2023-aapor-award-winner/",
        "date": "2023-05-17",
        "source": "AAPOR",
        "category": "award",
        "snippet": "Timothy P. Johnson was awarded the AAPOR Award for Exceptionally Distinguished Achievement, the association's highest honor, recognizing outstanding career contributions."
    }
]

RELEVANT_KEYWORDS = [
    "survey", "poll", "opinion", "methodology", "UIC", "NORC", "AAPOR", 
    "WAPOR", "CSTEPS", "SciOPS", "response style", "cross-cultural", 
    "data science", "politicization", "science policy", "self-censorship",
    "stressors", "academic scientists", "pet attachment", "LAPS", "midlife"
]

def clean_news_title(title):
    # Remove source suffix like " - The Conversation" or " - The Washington Post"
    title = re.sub(r"\s+-\s+[^-]+$", "", title)
    # Remove HTML entities
    title = html_unescape(title)
    return title.strip()

def html_unescape(text):
    import html
    return html.unescape(text)

def is_relevant(title, description=""):
    text = (title + " " + description).lower()
    # Exclude candidates/politicians
    if "house of representatives" in text or "election primary" in text or "candidate for" in text or "district 38" in text:
        return False
    return any(kw.lower() in text for kw in RELEVANT_KEYWORDS)

def resolve_news_url(google_url):
    if gnewsdecoder:
        try:
            res = gnewsdecoder(google_url)
            if res.get("status"):
                return res["decoded_url"]
        except Exception as e:
            print(f"Error resolving via googlenewsdecoder: {e}")
    # Fallback to following redirects if library isn't loaded or fails
    try:
        req = urllib.request.Request(
            google_url, 
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.geturl()
    except Exception as e:
        print(f"Error resolving URL redirect: {e}")
    return google_url

def get_google_news():
    print("Fetching Google News RSS Feed...", flush=True)
    query = urllib.parse.quote('Timothy P. Johnson OR Timothy Johnson survey OR AAPOR OR UIC OR NORC SciOPS')
    url = f"https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"
    
    items = []
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)
            
            for item in root.findall(".//item"):
                title_raw = item.find("title").text
                link = item.find("link").text
                pub_date_str = item.find("pubDate").text
                description = item.find("description").text or ""
                
                # Parse date
                try:
                    dt = datetime.strptime(pub_date_str, "%a, %d %b %Y %H:%M:%S %Z")
                    date_str = dt.strftime("%Y-%m-%d")
                except ValueError:
                    date_str = pub_date_str
                
                # Determine source
                source_el = item.find("source")
                source_name = source_el.text if source_el is not None else "Google News"
                
                title = clean_news_title(title_raw)
                
                if is_relevant(title, description):
                    print(f"  Found news: {title} ({source_name})")
                    decoded_url = resolve_news_url(link)
                    
                    # Deduplicate with curated list
                    if any(c["url"].split("?")[0] == decoded_url.split("?")[0] for c in CURATED_ITEMS):
                        continue
                        
                    items.append({
                        "title": title,
                        "url": decoded_url,
                        "date": date_str,
                        "source": source_name,
                        "category": "news",
                        "snippet": html_unescape(re.sub("<[^<]+?>", "", description)[:200]) + "..."
                    })
    except Exception as e:
        print(f"Error fetching Google News: {e}")
    
    return items

def get_openalex_pub_details(doi):
    # Fetch details from OpenAlex to get exact publication date
    clean_doi = doi.replace("https://doi.org/", "").strip()
    url = f"https://api.openalex.org/works/https://doi.org/{clean_doi}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "mailto:timj@uic.edu"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read())
            return data.get("publication_date")
    except Exception as e:
        print(f"  Could not get exact date from OpenAlex for {clean_doi}: {e}")
    return None

def get_recent_publications():
    print("Loading publications from graph_data.json...", flush=True)
    items = []
    if not GRAPH_PATH.exists():
        print(f"Warning: {GRAPH_PATH} not found.")
        return items
        
    try:
        graph = json.loads(GRAPH_PATH.read_text(encoding="utf-8"))
        pubs = graph.get("publications", [])
        
        # Filter for 2025/2026
        recent_pubs = [p for p in pubs if p.get("year") in (2025, 2026)]
        
        for p in recent_pubs:
            title = p.get("title")
            doi = p.get("doi")
            journal = p.get("journal") or p.get("publisher") or "Academic Journal"
            abstract = p.get("abstract") or ""
            year = p.get("year")
            
            if not doi:
                continue
                
            print(f"  Processing publication: {title}")
            
            # Fetch exact publication date
            pub_date = get_openalex_pub_details(doi)
            if not pub_date:
                pub_date = f"{year}-01-01" # Fallback
                
            snippet = abstract[:180] + "..." if len(abstract) > 180 else abstract
            if not snippet or snippet == "...":
                snippet = f"Research paper published in {journal} addressing survey research themes."
                
            items.append({
                "title": title,
                "url": doi,
                "date": pub_date,
                "source": journal,
                "category": "publication",
                "snippet": snippet
            })
    except Exception as e:
        print(f"Error loading publications: {e}")
        
    return items

def main():
    print("Starting news curation pipeline...")
    
    # 1. Fetch Google News items
    news_items = get_google_news()
    
    # 2. Fetch publications from last year
    pub_items = get_recent_publications()
    
    # 3. Combine with curated list
    all_items = CURATED_ITEMS.copy()
    
    # Deduplicate and merge
    urls_seen = {c["url"].split("?")[0].lower() for c in all_items}
    
    for item in news_items + pub_items:
        clean_url = item["url"].split("?")[0].lower()
        if clean_url not in urls_seen:
            urls_seen.add(clean_url)
            all_items.append(item)
            
    # Sort items by date (newest first)
    all_items.sort(key=lambda x: x["date"], reverse=True)
    
    # Write output to news-data.js
    js_content = f"// Compiled News & Publications for Timothy P. Johnson\n"
    js_content += f"// Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
    js_content += f"window.NEWS_DATA = {json.dumps(all_items, indent=2, ensure_ascii=False)};\n"
    
    OUT_PATH.write_text(js_content, encoding="utf-8")
    print(f"\nSuccessfully wrote {len(all_items)} items to {OUT_PATH}")

if __name__ == "__main__":
    main()
