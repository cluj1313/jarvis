#!/usr/bin/env python3
"""Fetch AI RSS/Atom feeds and write trimmed news.json for JARVIS (same-origin, no CORS)."""
from __future__ import annotations
import html, json, re, sys, urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from xml.etree import ElementTree as ET

UA = "JARVIS-news-bot/1.0 (+https://cluj1313.github.io/jarvis/; AI news aggregator)"
FEEDS = [
    {"id": "verge", "name": "The Verge AI", "url": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml"},
    {"id": "techcrunch", "name": "TechCrunch AI", "url": "https://techcrunch.com/category/artificial-intelligence/feed/"},
    {"id": "mit", "name": "MIT Technology Review", "url": "https://www.technologyreview.com/topic/artificial-intelligence/feed"},
    {"id": "google", "name": "Google AI Blog", "url": "https://blog.google/technology/ai/rss/"},
]
PER_SOURCE = 5
OUT = Path(__file__).resolve().parents[1] / "news.json"

NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "content": "http://purl.org/rss/1.0/modules/content/",
    "dc": "http://purl.org/dc/elements/1.1/",
    "media": "http://search.yahoo.com/mrss/",
}

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def strip_html(s: str) -> str:
    s = html.unescape(s or "")
    s = TAG_RE.sub(" ", s)
    return WS_RE.sub(" ", s).strip()


def trunc(s: str, n: int = 180) -> str:
    s = strip_html(s)
    if len(s) <= n:
        return s
    cut = s[: n - 1].rsplit(" ", 1)[0]
    return (cut or s[: n - 1]).rstrip(".,;:") + "…"


def text(el) -> str:
    if el is None:
        return ""
    return "".join(el.itertext()).strip()


def local(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag


def find_child(parent, names):
    names = set(names)
    for c in list(parent):
        if local(c.tag) in names:
            return c
    return None


def parse_date(s: str):
    if not s:
        return None
    s = s.strip()
    try:
        return parsedate_to_datetime(s).astimezone(timezone.utc)
    except Exception:
        pass
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        return datetime.fromisoformat(s).astimezone(timezone.utc)
    except Exception:
        return None


def entry_link(el) -> str:
    # RSS <link>text</link> or Atom <link href= rel=alternate>
    for c in list(el):
        if local(c.tag) != "link":
            continue
        href = c.attrib.get("href")
        if href:
            rel = c.attrib.get("rel", "alternate")
            if rel in ("alternate", ""):
                return href.strip()
        t = (c.text or "").strip()
        if t.startswith("http"):
            return t
    # prefer first href link
    for c in list(el):
        if local(c.tag) == "link" and c.attrib.get("href"):
            return c.attrib["href"].strip()
    return ""


def parse_items(root) -> list[dict]:
    items = []
    tag = local(root.tag)
    entries = []
    if tag == "rss":
        ch = find_child(root, {"channel"})
        if ch is not None:
            entries = [c for c in list(ch) if local(c.tag) == "item"]
    elif tag == "feed":
        entries = [c for c in list(root) if local(c.tag) == "entry"]
    else:
        # maybe channel root
        entries = [c for c in list(root) if local(c.tag) in ("item", "entry")]

    for el in entries:
        title = strip_html(text(find_child(el, {"title"})))
        link = entry_link(el)
        summary_el = find_child(el, {"description", "summary", "content"})
        snippet = trunc(text(summary_el), 180)
        pub = find_child(el, {"pubDate", "published", "updated", "date"})
        dt = parse_date(text(pub))
        if not title or not link:
            continue
        items.append({
            "title": title,
            "url": link,
            "snippet": snippet,
            "published": dt.isoformat().replace("+00:00", "Z") if dt else None,
        })
    # newest first when dates exist
    items.sort(key=lambda x: x["published"] or "", reverse=True)
    return items


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read()


def main() -> int:
    sources = []
    errors = []
    for f in FEEDS:
        try:
            raw = fetch(f["url"])
            # strip XML declaration quirks / BOM
            if raw.startswith(b"\xef\xbb\xbf"):
                raw = raw[3:]
            root = ET.fromstring(raw)
            items = parse_items(root)[:PER_SOURCE]
            if not items:
                errors.append({"id": f["id"], "error": "no items"})
                continue
            sources.append({"id": f["id"], "name": f["name"], "items": items})
            print(f"OK {f['id']}: {len(items)} items", file=sys.stderr)
        except Exception as e:
            errors.append({"id": f["id"], "error": str(e)})
            print(f"FAIL {f['id']}: {e}", file=sys.stderr)

    if not sources:
        print("No sources succeeded", file=sys.stderr)
        return 1

    payload = {
        "updated": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "sources": sources,
        "errors": errors,
    }
    text_out = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    old = OUT.read_text(encoding="utf-8") if OUT.exists() else None
    # compare without updated timestamp for change detection when called from Actions
    def canon(s: str | None):
        if not s:
            return None
        try:
            d = json.loads(s)
            d.pop("updated", None)
            return json.dumps(d, ensure_ascii=False, sort_keys=True)
        except Exception:
            return s
    changed = canon(old) != canon(text_out)
    OUT.write_text(text_out, encoding="utf-8")
    print("CHANGED" if changed else "UNCHANGED")
    print(str(OUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
