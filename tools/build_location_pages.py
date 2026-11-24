#!/usr/bin/env python3
"""Erzeugt schlanke Ortsseiten (z. B. /kurse-zug, /yoga-zug).

Inhalt pro Seite: kurzer Titel, Kurse des Orts (gleiche Karten wie /kurse)
und darunter die Kursanbieter der Region. Vorlage ist kurse.html.
Aufruf im Repo-Hauptordner:  python3 tools/build_location_pages.py
"""
import html, json, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = "https://sponti-switzerland.ch"
TEMPLATE = (ROOT / "kurse.html").read_text(encoding="utf-8")

# slug, Vorgaben für die Kursliste, Region für Anbieter, Titel, Beschreibung, Überschrift, Unterzeile, Label, Anbieter-Titel
PAGES = [
  ("kurse-zug", "ort=zug", "zug", "Kurse in Zug – freie Plätze spontan buchen | Sponti",
   "Kurse in Zug spontan buchen: Yoga, Pilates, Tanz, Töpfern und mehr in Zug, Baar, Cham und Umgebung. Freie Plätze für heute und diese Woche.",
   "Kurse in Zug.", "Freie Plätze in Zug, Baar, Cham und Umgebung.", "Kurse in Zug", "Kursanbieter in Zug."),
  ("yoga-zug", "ort=zug&filter=yoga-wellness", "zug", "Yoga in Zug – Yogakurs spontan buchen | Sponti",
   "Yoga in Zug: freie Plätze in Yogakursen in Zug, Baar und Cham spontan buchen – einzeln, ohne Abo.",
   "Yoga in Zug.", "Freie Plätze in Yogakursen in Zug und Umgebung.", "Yoga in Zug", "Kursanbieter in Zug."),
  ("pilates-zug", "ort=zug&suche=pilates", "zug", "Pilates in Zug – freie Plätze spontan buchen | Sponti",
   "Pilates in Zug: freie Plätze in Pilates- und Reformer-Pilates-Kursen in Zug und Umgebung spontan buchen.",
   "Pilates in Zug.", "Freie Plätze in Pilateskursen in Zug und Umgebung.", "Pilates in Zug", "Kursanbieter in Zug."),
  ("tanzkurs-zug", "ort=zug&filter=tanz-bewegung", "zug", "Tanzkurs in Zug – spontan buchen | Sponti",
   "Tanzkurs in Zug: freie Plätze in Salsa-, Zumba- und Tanzkursen in Zug und Umgebung spontan buchen.",
   "Tanzen in Zug.", "Freie Plätze in Tanzkursen in Zug und Umgebung.", "Tanzkurs in Zug", "Kursanbieter in Zug."),
  ("toepferkurs-zug", "ort=zug&filter=kunst-handwerk", "zug", "Töpferkurs in Zug – spontan buchen | Sponti",
   "Töpferkurs in Zug: freie Plätze in Töpfer- und Keramikkursen in Zug und Umgebung spontan buchen.",
   "Töpfern in Zug.", "Freie Plätze in Töpfer- und Kreativkursen in Zug und Umgebung.", "Töpferkurs in Zug", "Kursanbieter in Zug."),
  ("kurse-luzern", "ort=luzern", "luzern", "Kurse in Luzern – freie Plätze spontan buchen | Sponti",
   "Kurse in Luzern spontan buchen: freie Plätze für Yoga, Pilates, Tanz, Töpfern und mehr in Luzern und Umgebung.",
   "Kurse in Luzern.", "Freie Plätze in Luzern und Umgebung.", "Kurse in Luzern", "Kursanbieter in Luzern."),
  ("kurse-zuerich", "ort=zuerich", "zuerich", "Kurse in Zürich – freie Plätze spontan buchen | Sponti",
   "Kurse in Zürich spontan buchen: freie Plätze für Yoga, Pilates, Tanz, Töpfern und mehr in Zürich.",
   "Kurse in Zürich.", "Freie Plätze in Zürich und Umgebung.", "Kurse in Zürich", "Kursanbieter in Zürich."),
  ("kurse-aargau", "ort=aargau", "aargau", "Kurse im Aargau – freie Plätze spontan buchen | Sponti",
   "Kurse im Aargau spontan buchen: freie Plätze für Yoga, Pilates, Tanz, Töpfern und mehr im Kanton Aargau.",
   "Kurse im Aargau.", "Freie Plätze im Kanton Aargau.", "Kurse im Aargau", "Kursanbieter im Aargau."),
]
e = lambda s: html.escape(s, quote=True)

def build(slug, preset, region, title, desc, h1, lead, label, providers_title):
    url = f"{BASE}/{slug}"
    h = TEMPLATE
    head, rest = h[:h.find("<body")], h[h.find("<body"):]
    head = re.sub(r"<title>.*?</title>", f"<title>{e(title)}</title>", head, flags=re.S)
    for pat, val in [(r'<meta name="description" content="[^"]*"', f'<meta name="description" content="{e(desc)}"'),
                     (r'<link rel="canonical" href="[^"]*"', f'<link rel="canonical" href="{url}"'),
                     (r'<meta property="og:title" content="[^"]*"', f'<meta property="og:title" content="{e(title)}"'),
                     (r'<meta property="og:description" content="[^"]*"', f'<meta property="og:description" content="{e(desc)}"'),
                     (r'<meta property="og:url" content="[^"]*"', f'<meta property="og:url" content="{url}"'),
                     (r'<meta name="twitter:title" content="[^"]*"', f'<meta name="twitter:title" content="{e(title)}"'),
                     (r'<meta name="twitter:description" content="[^"]*"', f'<meta name="twitter:description" content="{e(desc)}"')]:
        head = re.sub(pat, val, head)
    head = re.sub(r'<script type="application/ld\+json">.*?</script>\s*', "", head, flags=re.S)
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url + "#webpage", "url": url, "name": title, "description": desc,
         "inLanguage": "de-CH", "isPartOf": {"@id": BASE + "/#website"}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Sponti", "item": BASE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Kurse", "item": BASE + "/kurse"},
            {"@type": "ListItem", "position": 3, "name": label, "item": url}]}]}
    head = head.replace("</head>", '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>\n</head>")

    # Vorgaben für courses.js am <body>
    rest = re.sub(r"<body([^>]*)>", lambda m: f'<body{m.group(1)} data-preset-params="{e(preset)}">', rest, count=1)

    # Unsichtbare Filterknöpfe aus /kurse übernehmen (courses.js braucht sie zum Filtern)
    i = TEMPLATE.find('<div class="sponti-advanced-filters"'); j = TEMPLATE.find('<div id="sponti-applied-date"')
    filters = TEMPLATE[i:j]
    filters = filters[:filters.rfind("</section>")].rstrip()

    main = f"""<main class="sponti-location-page">
      <section class="courses-heading">
        <div class="eyebrow"><span class="eyebrow-dot"></span> Sponti</div>
        <h1>{e(h1)}</h1>
        <p>{e(lead)}</p>
        {filters}
      </section>
      <div id="sponti-applied-date" class="sponti-applied-date" hidden></div>
      <p id="course-status" role="status" aria-live="polite" style="margin: 0 auto 24px; max-width: 1200px; padding: 0 24px">Kurse werden geladen …</p>
      <section class="course-grid" aria-label="{e(label)}" aria-busy="true"></section>

      <section class="provider-directory" aria-labelledby="provider-directory-title">
        <div class="provider-directory-heading"><h2 id="provider-directory-title">{e(providers_title)}</h2></div>
        <p data-provider-directory-status role="status">Anbieter werden geladen …</p>
        <div class="provider-directory-grid" data-provider-directory-list data-region="{e(region)}"></div>
      </section>
    </main>"""
    ms, me = rest.find("<main"), rest.find("</main>") + len("</main>")
    rest = rest[:ms] + main + rest[me:]
    # Such-/Kategorie-UI von /kurse wird hier nicht gebraucht
    rest = re.sub(r'\s*<script src="/sponti-course-discovery\.js[^"]*"[^>]*></script>', "", rest)
    return head + rest

for p in PAGES:
    (ROOT / f"{p[0]}.html").write_text(build(*p), encoding="utf-8")
    print("geschrieben:", p[0] + ".html")
