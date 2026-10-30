#!/usr/bin/env python3
"""Regenerate the JSON-LD block in index.html and en.html.

Run after changing the FAQ, prices or social links:
    python3 tools/build-schema.py

The FAQ answers are read from each page's own <details class="faq-item">
markup, so the structured data always matches the visible text. Prices and
links live in PAGES below; keep them in step with the pricing cards.
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://uxuikit.com/"
SAME_AS = [
    "https://www.instagram.com/ophirkit",
    "https://il.linkedin.com/in/ofirkitlaru",
    "https://www.youtube.com/@uxuikit",
    "https://www.youtube.com/@ophircreates",
]

PAGES = {
    "index.html": {
        "url": SITE,
        "lang": "he",
        "person": "אופיר",
        "job": "מעצב ומפתח אתרים",
        "currency": "ILS",
        "offers": [("דף נחיתה", 7000), ("אתר שיווקי מלא", 17000), ("מ-Figma לאתר חי", 3500)],
    },
    "en.html": {
        "url": SITE + "en.html",
        "lang": "en",
        "person": "Ophir",
        "job": "Website designer and developer",
        "currency": "USD",
        "offers": [("Landing page", 2200), ("Full marketing site", 5400), ("Figma to live site", 1100)],
    },
}

START, END = "<!-- schema:start -->", "<!-- schema:end -->"


def text(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", fragment))).strip()


def meta(page: str, attr: str, name: str) -> str:
    m = re.search(rf'<meta {attr}="{name}" content="([^"]*)"', page)
    return html.unescape(m.group(1)) if m else ""


def build(page: str, cfg: dict) -> str:
    faq = re.findall(r'<details class="faq-item[^"]*">\s*<summary>(.*?)</summary>(.*?)</details>', page, re.S)
    if not faq:
        raise SystemExit("No FAQ items found")
    org_id, person_id = SITE + "#business", SITE + "#ophir"
    graph = [
        {
            "@type": "WebSite",
            "@id": SITE + "#website",
            "url": SITE,
            "name": "UXUIKIT",
            "inLanguage": ["he", "en"],
            "publisher": {"@id": org_id},
        },
        {
            "@type": "ProfessionalService",
            "@id": org_id,
            "name": "UXUIKIT",
            "url": cfg["url"],
            "logo": SITE + "assets/favicon.svg",
            "image": SITE + "assets/og-image.jpg",
            "description": meta(page, "name", "description"),
            "founder": {"@id": person_id},
            "sameAs": SAME_AS,
            "knowsAbout": ["Website design", "Web development", "Figma", "Framer", "Webflow"],
            "makesOffer": [
                {
                    "@type": "Offer",
                    "name": name,
                    "priceSpecification": {
                        "@type": "PriceSpecification",
                        "minPrice": price,
                        "priceCurrency": cfg["currency"],
                    },
                }
                for name, price in cfg["offers"]
            ],
        },
        {
            "@type": "Person",
            "@id": person_id,
            "name": cfg["person"],
            "jobTitle": cfg["job"],
            "image": SITE + "assets/ofir-portrait.webp",
            "worksFor": {"@id": org_id},
            "sameAs": SAME_AS,
        },
        {
            "@type": "WebPage",
            "@id": cfg["url"] + "#webpage",
            "url": cfg["url"],
            "name": text(re.search(r"<title>(.*?)</title>", page, re.S).group(1)),
            "inLanguage": cfg["lang"],
            "isPartOf": {"@id": SITE + "#website"},
            "about": {"@id": org_id},
        },
        {
            "@type": "FAQPage",
            "@id": cfg["url"] + "#faq",
            "inLanguage": cfg["lang"],
            "mainEntity": [
                {"@type": "Question", "name": text(q), "acceptedAnswer": {"@type": "Answer", "text": text(a)}}
                for q, a in faq
            ],
        },
    ]
    data = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=2)
    data = data.replace("</", "<\\/")
    return f'{START}\n  <script type="application/ld+json">\n{data}\n  </script>\n  {END}'


for file, cfg in PAGES.items():
    path = ROOT / file
    page = path.read_text(encoding="utf-8")
    block = build(page, cfg)
    if START in page:
        page = re.sub(re.escape(START) + ".*?" + re.escape(END), lambda _: block, page, flags=re.S)
    else:
        page = page.replace("</head>", f"  {block}\n</head>", 1)
    path.write_text(page, encoding="utf-8")
    print(f"{file}: schema updated")
