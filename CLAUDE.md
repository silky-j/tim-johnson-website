# Dr. Tim Johnson Website

Academic website for **Dr. Timothy P. Johnson** — survey methodologist, Professor Emeritus at UIC, Senior Research Fellow at NORC.

## Live site
**URL:** https://silky-j.github.io/tim-johnson-website/
**Repo:** `silky-j/tim-johnson-website` (GitHub Pages, main branch / root, `.nojekyll`)
**Deploy:** `git push origin main` — Pages rebuilds automatically.

## Stack
Vanilla HTML/CSS/JS, multi-page, no build step. Fonts: Outfit + Inter. Colors: violet `#7c3aed`, teal `#0d9488`.

Pages: Home, About, Publications (interactive visualizer), Books.

## Publications visualizer
- Data lives in `graph_data.json` (keys: `stats`, `publications`, `coauthors`, `network`)
- Sourced from `silky-j/dad-publication-visualizer`
- Requires HTTP server (uses `fetch()` — won't work over `file://`)
- Curation scripts in `curation/`: `rebuild_graph_data.py` re-generates `graph_data.json` from curated JSON sources

## Publication data sources
- **Authoritative:** ResearchGate (`/profile/Timothy-Johnson-9`) + Google Scholar (`user=DGHsTEgAAAAJ`) — used as human-curated allow list
- **Not trustworthy alone:** OpenAlex merged in another "Timothy Johnson" (astrophysicist)
- ~308 curated publications (down from 428 raw)

## Still TODO
- Real profile photo (placeholder at `assets/img/tim-johnson.jpg`)
- Exact testimonial text + attribution on Home page (marked `TODO`)
- Real LinkedIn URL (currently `#`)
- Custom domain (optional)

## Caution
The site repo (`tim-johnson-website/`) lives **inside** the home-directory repo. Make sure you're committing in the right git context.
