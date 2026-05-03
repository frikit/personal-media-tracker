#!/usr/bin/env python3
"""fetch-assets.py — download poster images for all watchlist entries and the
Google Fonts used by index.html, so the page works fully offline.

- Posters go to ./posters/<id>.jpg, and each JSON entry gets a `poster` field.
- Fonts (CSS + woff2) go to ./fonts/, and index.html should link fonts/fonts.css.

Idempotent: existing files are reused. Safe to re-run after adding new entries.
"""
import json
import re
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent
POSTERS_DIR = ROOT / "posters"
FONTS_DIR = ROOT / "fonts"
JSON_FILES = ["to-watch.json", "watched.json", "skipped.json"]
OMDB_API_KEY = "4a3b711b"  # public key already shipped in index.html
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.0 Safari/605.1.15"
)


def http_get(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def http_get_text(url, timeout=30):
    return http_get(url, timeout).decode("utf-8")


def clean_title(t):
    t = re.sub(r"\s*\(S\d+\)|\s*\(.*?\)$", "", t)
    t = re.sub(r":.*", "", t)
    return t.strip()


def omdb_lookup(title, year, category):
    type_ = "series" if category in ("tv", "anime-tv", "animated-tv") else "movie"
    clean = clean_title(title)
    q = urllib.parse.quote(clean)
    base = f"https://www.omdbapi.com/?t={q}&type={type_}&apikey={OMDB_API_KEY}"
    for url in (f"{base}&y={year}", base):
        try:
            data = json.loads(http_get_text(url, timeout=15))
            poster = data.get("Poster")
            if poster and poster != "N/A":
                return poster
        except Exception as e:
            print(f"  omdb error for {title!r}: {e}", file=sys.stderr)
    return None


def fetch_one_poster(entry):
    out = POSTERS_DIR / f"{entry['id']}.jpg"
    if out.exists() and out.stat().st_size > 0:
        return entry["id"], "cached"
    poster_url = omdb_lookup(entry["title"], entry["year"], entry["category"])
    if not poster_url:
        return entry["id"], "miss"
    try:
        out.write_bytes(http_get(poster_url, timeout=30))
        return entry["id"], "ok"
    except Exception as e:
        return entry["id"], f"err: {e}"


def fetch_posters():
    POSTERS_DIR.mkdir(exist_ok=True)
    files = {}
    for fname in JSON_FILES:
        with open(ROOT / fname) as f:
            files[fname] = json.load(f)
    entries = [e for data in files.values() for e in data]
    print(f"posters: {len(entries)} entries")
    counts = {"ok": 0, "cached": 0, "miss": 0, "err": 0}
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = [ex.submit(fetch_one_poster, e) for e in entries]
        for i, fut in enumerate(as_completed(futures), 1):
            eid, status = fut.result()
            tag = status if status in counts else "err"
            counts[tag] += 1
            print(f"  [{i:>3}/{len(entries)}] [{tag.upper():<6}] {eid}")
    print(f"posters: {counts}")
    for fname, data in files.items():
        for e in data:
            p = POSTERS_DIR / f"{e['id']}.jpg"
            e["poster"] = f"posters/{e['id']}.jpg" if p.exists() else None
        with open(ROOT / fname, "w") as f:
            json.dump(data, f, indent=2)
    print("JSONs updated with poster paths.")


def fetch_fonts():
    FONTS_DIR.mkdir(exist_ok=True)
    css_url = (
        "https://fonts.googleapis.com/css2?"
        "family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@600;700"
        "&display=swap"
    )
    print("fonts: fetching CSS")
    css = http_get_text(css_url)
    urls = sorted(set(re.findall(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", css)))
    print(f"fonts: {len(urls)} woff2 files")
    rewritten = css
    for u in urls:
        fname = u.rsplit("/", 1)[-1].split("?")[0]
        out = FONTS_DIR / fname
        if not out.exists() or out.stat().st_size == 0:
            out.write_bytes(http_get(u))
            print(f"  [OK]     {fname}")
        else:
            print(f"  [CACHED] {fname}")
        rewritten = rewritten.replace(u, fname)
    (FONTS_DIR / "fonts.css").write_text(rewritten)
    print("fonts/fonts.css written.")


if __name__ == "__main__":
    fetch_fonts()
    fetch_posters()
