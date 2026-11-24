#!/usr/bin/env python3
"""Erzeugt SEO-Landingpages pro Ort/Kategorie (z. B. /kurse-zug, /yoga-zug).

Aufruf im Repo-Hauptordner:  python3 tools/build_location_pages.py
Vorlage für Kopf, Navigation und Fusszeile ist buchen.html. Die Kursliste
wird live von sponti-location-courses.js aus Supabase geladen.
"""
import html, json, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = "https://sponti-switzerland.ch"
TEMPLATE = (ROOT / "buchen.html").read_text(encoding="utf-8")

PAGES = [
  dict(slug="kurse-zug", region="zug", category="", keyword="",
    title="Kurse in Zug – freie Plätze spontan buchen | Sponti",
    desc="Kurse in Zug spontan buchen: Yoga, Pilates, Tanz, Töpfern und mehr in Zug, Baar, Cham und Umgebung. Freie Plätze für heute und diese Woche auf Sponti.",
    eyebrow="Kanton Zug", h1="Kurse in Zug.", h1em="Spontan dabei.",
    lead="Du suchst einen Kurs in Zug – am liebsten heute oder diese Woche? Auf Sponti findest du kurzfristig freie Plätze bei Kursanbietern aus Zug, Baar, Cham, Steinhausen, Rotkreuz und Umgebung.",
    body=[
      ("Freizeitkurse in Zug ohne lange Planung", "Viele Kurse in Zug sind Wochen im Voraus ausgebucht, und trotzdem bleiben kurzfristig Plätze frei, weil jemand absagt. Genau diese Plätze zeigt dir Sponti. Du siehst auf einen Blick, wann, wo und zu welchem Preis ein Kurs stattfindet, und buchst deinen Platz direkt online."),
      ("Yoga, Pilates, Tanz und Kreatives", "Das Angebot reicht von Yoga und Pilates über Barre, Spinning und Box-Fitness bis zu Tanz, Salsa, Zumba, Töpfern, Breathwork und Meditation. Ob nach der Arbeit in der Stadt Zug oder am Wochenende in Baar oder Cham: Filtere nach Tag und Uhrzeit und finde, was zu dir passt."),
      ("So funktioniert's", "Kurs auswählen, Anzahl Plätze wählen, bezahlen – fertig. Du erhältst sofort eine Bestätigung per E-Mail und rechtzeitig vor dem Kurs eine Erinnerung. Bis 24 Stunden vor Kursbeginn kannst du kostenlos stornieren."),
    ],
    faq=[
      ("Wo finde ich kurzfristig einen Kurs in Zug?", "Auf Sponti siehst du freie Kursplätze in Zug und Umgebung, oft noch für den gleichen oder nächsten Tag. Die Liste oben zeigt dir alle aktuell buchbaren Termine."),
      ("Welche Kurse gibt es in Zug?", "Unter anderem Yoga, Pilates, Reformer Pilates, Barre, Spinning, Box-Fitness, Zumba, Tanz, Salsa, Töpfern, Breathwork und Meditation – je nachdem, welche Kursanbieter gerade freie Plätze anbieten."),
      ("Kann ich einen Kurs in Zug wieder stornieren?", "Ja, bis 24 Stunden vor Kursbeginn ist die Stornierung kostenlos. Die Einzelheiten stehen in unseren AGB."),
      ("Ich biete selbst Kurse in Zug an. Kann ich mitmachen?", "Sehr gerne. Als Kursanbieter machst du freie Plätze auf Sponti sichtbar und erreichst Menschen in Zug, die spontan etwas erleben möchten."),
    ],
    related=["yoga-zug","pilates-zug","tanzkurs-zug","toepferkurs-zug","kurse-luzern"]),
  dict(slug="yoga-zug", region="zug", category="yoga-wellness", keyword="",
    title="Yoga in Zug – Yogakurs spontan buchen | Sponti",
    desc="Yoga in Zug: Finde freie Plätze in Yogakursen in Zug, Baar und Cham. Hatha, Vinyasa, Yin und mehr – heute oder diese Woche spontan buchen.",
    eyebrow="Yoga · Zug", h1="Yoga in Zug.", h1em="Freie Matte gefällig?",
    lead="Lust auf eine Yogastunde in Zug, ohne dich für ein Abo festzulegen? Sponti zeigt dir freie Plätze in Yogakursen in Zug und Umgebung – auch kurzfristig für heute Abend.",
    body=[
      ("Yogakurse in Zug, Baar und Cham", "Ob Hatha, Vinyasa, Yin oder ruhiges Yoga zum Feierabend: Auf Sponti stellen Yogalehrerinnen, Yogalehrer und Studios aus der Region Zug freie Plätze ein. Du buchst eine einzelne Stunde, ganz ohne Mitgliedschaft."),
      ("Ideal zum Ausprobieren", "Du möchtest einen neuen Stil oder ein neues Studio kennenlernen? Mit einem spontan gebuchten Platz testest du unverbindlich, ob es passt. Bring einfach bequeme Kleidung mit – Matten gibt es in vielen Studios vor Ort; die Details stehen beim jeweiligen Kurs."),
    ],
    faq=[
      ("Brauche ich ein Abo für Yoga in Zug?", "Nein. Über Sponti buchst du einzelne freie Plätze, ganz ohne Abo oder Mitgliedschaft."),
      ("Gibt es Yoga für Anfänger in Zug?", "Ja, viele Kurse sind für alle Niveaus geeignet. In der Kursbeschreibung siehst du, für wen der Kurs gedacht ist."),
      ("Wie kurzfristig kann ich buchen?", "Freie Plätze kannst du bis kurz vor Kursbeginn buchen, solange noch Plätze verfügbar sind."),
    ],
    related=["kurse-zug","pilates-zug","tanzkurs-zug"]),
  dict(slug="pilates-zug", region="zug", category="", keyword="pilates",
    title="Pilates in Zug – freie Plätze spontan buchen | Sponti",
    desc="Pilates in Zug: Freie Plätze in Pilates- und Reformer-Pilates-Kursen in Zug, Baar und Cham finden und spontan buchen – ohne Abo.",
    eyebrow="Pilates · Zug", h1="Pilates in Zug.", h1em="Kraft aus der Mitte.",
    lead="Matten-Pilates oder Reformer Pilates in Zug, ohne lange Wartelisten? Auf Sponti findest du kurzfristig freie Plätze in Pilateskursen in Zug und Umgebung.",
    body=[
      ("Matten- und Reformer-Pilates", "Pilates stärkt die Körpermitte, verbessert die Haltung und ist für Einsteiger wie Fortgeschrittene geeignet. Gerade Reformer-Kurse in Zug sind oft voll – über Sponti bekommst du die Plätze, die kurzfristig frei werden."),
      ("Einzelne Stunde statt Abo", "Du buchst genau die Stunde, die in deinen Tag passt. Preis, Ort und Uhrzeit siehst du direkt beim Kurs."),
    ],
    faq=[
      ("Gibt es Reformer Pilates in Zug?", "Wenn Anbieter freie Plätze in Reformer-Kursen haben, erscheinen sie in der Liste oben. Schau regelmässig vorbei oder tritt unserer WhatsApp-Community bei."),
      ("Ist Pilates für Anfänger geeignet?", "Ja, viele Kurse sind für alle Niveaus. Die Kursbeschreibung zeigt dir, ob Vorkenntnisse nötig sind."),
    ],
    related=["kurse-zug","yoga-zug","tanzkurs-zug"]),
  dict(slug="tanzkurs-zug", region="zug", category="tanz-bewegung", keyword="",
    title="Tanzkurs in Zug – Salsa, Zumba & mehr spontan | Sponti",
    desc="Tanzkurs in Zug gesucht? Freie Plätze in Salsa-, Zumba- und Tanzkursen in Zug und Umgebung spontan buchen – einzeln, ohne Abo.",
    eyebrow="Tanz · Zug", h1="Tanzen in Zug.", h1em="Einfach mitmachen.",
    lead="Salsa, Zumba oder ein Tanz-Workout nach der Arbeit? Auf Sponti findest du freie Plätze in Tanzkursen in Zug und Umgebung – auch kurzfristig.",
    body=[
      ("Tanzkurse zum Reinschnuppern", "Viele Tanzkurse laufen als Serie, und trotzdem werden einzelne Plätze frei. Über Sponti kannst du eine Stunde besuchen und ausprobieren, ob Stil und Gruppe passen."),
      ("Allein oder zu zweit", "Bei vielen Kursen kannst du auch ohne Tanzpartnerin oder Tanzpartner mitmachen. Hinweise dazu findest du in der Kursbeschreibung."),
    ],
    faq=[
      ("Brauche ich einen Tanzpartner?", "Das hängt vom Kurs ab. Bei Zumba und Tanz-Workouts tanzt du allein, bei Paartänzen steht in der Beschreibung, ob du allein kommen kannst."),
      ("Kann ich mehrere Plätze buchen?", "Ja, du kannst bei der Buchung die Anzahl Plätze wählen – ideal, wenn du mit Freunden kommst."),
    ],
    related=["kurse-zug","yoga-zug","pilates-zug"]),
  dict(slug="toepferkurs-zug", region="zug", category="kunst-handwerk", keyword="",
    title="Töpferkurs in Zug – freie Plätze spontan buchen | Sponti",
    desc="Töpferkurs in Zug: Freie Plätze in Töpfer- und Keramikkursen in Zug und Umgebung finden und spontan buchen. Perfekt zum Ausprobieren oder als Geschenk.",
    eyebrow="Töpfern · Zug", h1="Töpfern in Zug.", h1em="Hände in den Ton.",
    lead="Einmal selbst an der Drehscheibe sitzen oder eine eigene Schale formen? Auf Sponti findest du freie Plätze in Töpfer- und Keramikkursen in Zug und Umgebung.",
    body=[
      ("Kreativ werden ohne Vorkenntnisse", "Viele Töpferkurse sind für Anfängerinnen und Anfänger gedacht. Material und Werkzeug sind oft inbegriffen – die Details stehen beim jeweiligen Kurs."),
      ("Schöne Idee zu zweit", "Ein Töpferabend ist auch ein tolles Erlebnis mit Freunden oder als Date. Wähle bei der Buchung einfach die gewünschte Anzahl Plätze."),
    ],
    faq=[
      ("Brauche ich Vorkenntnisse zum Töpfern?", "Nein, viele Kurse richten sich an Einsteiger. Die Kursbeschreibung zeigt dir das Niveau."),
      ("Kann ich meine Werkstücke mitnehmen?", "Das regelt der jeweilige Kursanbieter. Oft werden Stücke gebrannt und später abgeholt – Infos dazu stehen beim Kurs."),
    ],
    related=["kurse-zug","yoga-zug","tanzkurs-zug"]),
  dict(slug="kurse-luzern", region="luzern", category="", keyword="",
    title="Kurse in Luzern – freie Plätze spontan buchen | Sponti",
    desc="Kurse in Luzern spontan buchen: Freie Plätze für Yoga, Pilates, Tanz, Töpfern und mehr in Luzern und Umgebung finden – für heute und diese Woche.",
    eyebrow="Luzern", h1="Kurse in Luzern.", h1em="Heute noch dabei.",
    lead="Auf Sponti findest du kurzfristig freie Plätze bei Kursanbietern in Luzern und Umgebung – von Yoga und Pilates über Tanz bis zu kreativen Workshops.",
    body=[
      ("Freie Kursplätze in Luzern", "Sponti macht Plätze sichtbar, die kurzfristig frei werden. So kommst du spontan in Kurse, die sonst ausgebucht wären, und die Anbieter füllen ihre Gruppen."),
      ("Sponti wächst in Luzern", "Wir bauen das Angebot in Luzern laufend aus. Falls gerade nichts dabei ist: Tritt unserer WhatsApp-Community bei, dann erfährst du als Erstes von neuen freien Plätzen."),
    ],
    faq=[
      ("Welche Kurse gibt es in Luzern?", "Je nach Anbieter Yoga, Pilates, Fitness, Tanz, Töpfern und weitere Freizeitkurse. Die Liste oben zeigt alle aktuell buchbaren Termine."),
      ("Ich biete Kurse in Luzern an. Wie werde ich Partner?", "Registriere dich als Kursanbieter auf Sponti – die Anmeldung ist einfach und du stellst freie Plätze in wenigen Minuten online."),
    ],
    related=["kurse-zug","kurse-aargau","kurse-zuerich"]),
  dict(slug="kurse-aargau", region="aargau", category="", keyword="",
    title="Kurse im Aargau – freie Plätze spontan buchen | Sponti",
    desc="Kurse im Aargau spontan buchen: Freie Plätze für Yoga, Pilates, Tanz, Töpfern und mehr im Kanton Aargau finden – kurzfristig und ohne Abo.",
    eyebrow="Aargau", h1="Kurse im Aargau.", h1em="Spontan erleben.",
    lead="Ob in Aarau, Baden, Wohlen oder Muri: Auf Sponti findest du kurzfristig freie Plätze bei Kursanbietern im Kanton Aargau.",
    body=[
      ("Freizeitkurse im Aargau entdecken", "Von Yoga und Pilates über Tanz bis zu kreativen Workshops: Sponti zeigt dir freie Plätze, die du einzeln und ohne Abo buchen kannst."),
      ("Sponti wächst im Aargau", "Wir bauen das Angebot laufend aus. Tritt unserer WhatsApp-Community bei, um neue freie Plätze als Erstes zu sehen."),
    ],
    faq=[
      ("Wo im Aargau gibt es Kurse auf Sponti?", "Die Liste oben zeigt alle aktuell buchbaren Kurse im Aargau. Das Angebot wächst laufend."),
      ("Ich biete Kurse im Aargau an. Kann ich mitmachen?", "Ja, registriere dich als Kursanbieter und mach deine freien Plätze sichtbar."),
    ],
    related=["kurse-zug","kurse-luzern","kurse-zuerich"]),
  dict(slug="kurse-zuerich", region="zuerich", category="", keyword="",
    title="Kurse in Zürich – freie Plätze spontan buchen | Sponti",
    desc="Kurse in Zürich spontan buchen: Freie Plätze für Yoga, Pilates, Tanz, Töpfern und mehr in Zürich finden – kurzfristig, einzeln und ohne Abo.",
    eyebrow="Zürich", h1="Kurse in Zürich.", h1em="Freie Plätze, jetzt.",
    lead="Auf Sponti findest du kurzfristig freie Plätze bei Kursanbietern in Zürich – von Yoga und Pilates über Tanz bis zu kreativen Workshops.",
    body=[
      ("Spontan statt ausgebucht", "In Zürich sind beliebte Kurse oft lange im Voraus voll. Sponti zeigt dir die Plätze, die kurzfristig wieder frei werden, und du buchst direkt online."),
      ("Sponti wächst in Zürich", "Wir bauen das Angebot laufend aus. Tritt unserer WhatsApp-Community bei, um neue freie Plätze als Erstes zu sehen."),
    ],
    faq=[
      ("Welche Kurse gibt es in Zürich?", "Je nach Anbieter Yoga, Pilates, Fitness, Tanz, Töpfern und weitere Freizeitkurse. Die Liste oben zeigt alle aktuell buchbaren Termine."),
      ("Wie kurzfristig kann ich buchen?", "Freie Plätze kannst du bis kurz vor Kursbeginn buchen, solange noch Plätze verfügbar sind."),
    ],
    related=["kurse-zug","kurse-luzern","kurse-aargau"]),
]

LABELS = {p["slug"]: p["h1"].rstrip(".") for p in PAGES}
e = lambda s: html.escape(s, quote=True)

def head_for(p):
    head = TEMPLATE[:TEMPLATE.find("<body")]
    url = f"{BASE}/{p['slug']}"
    head = re.sub(r"<title>.*?</title>", f"<title>{e(p['title'])}</title>", head, flags=re.S)
    head = re.sub(r'<meta name="description" content="[^"]*"', f'<meta name="description" content="{e(p["desc"])}"', head)
    head = re.sub(r'<link rel="canonical" href="[^"]*"', f'<link rel="canonical" href="{url}"', head)
    head = re.sub(r'<meta property="og:title" content="[^"]*"', f'<meta property="og:title" content="{e(p["title"])}"', head)
    head = re.sub(r'<meta property="og:description" content="[^"]*"', f'<meta property="og:description" content="{e(p["desc"])}"', head)
    head = re.sub(r'<meta property="og:url" content="[^"]*"', f'<meta property="og:url" content="{url}"', head)
    head = re.sub(r'<meta name="twitter:title" content="[^"]*"', f'<meta name="twitter:title" content="{e(p["title"])}"', head)
    head = re.sub(r'<meta name="twitter:description" content="[^"]*"', f'<meta name="twitter:description" content="{e(p["desc"])}"', head)
    # Bestehende JSON-LD-Blöcke der Vorlage entfernen, eigene ergänzen
    head = re.sub(r'<script type="application/ld\+json">.*?</script>\s*', "", head, flags=re.S)
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url + "#webpage", "url": url, "name": p["title"], "description": p["desc"],
         "inLanguage": "de-CH", "isPartOf": {"@id": BASE + "/#website"}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Sponti", "item": BASE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Kurse", "item": BASE + "/kurse"},
            {"@type": "ListItem", "position": 3, "name": LABELS[p["slug"]], "item": url}]},
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in p["faq"]]},
    ]}
    extra = ('<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>\n"
             '<link rel="stylesheet" href="/sponti-location.css?v=20261124" />\n')
    return head.replace("</head>", extra + "</head>")

def chrome():
    body_start = TEMPLATE.find("<body")
    main_start = TEMPLATE.find("<main")
    footer_start = TEMPLATE.find("<footer")
    footer_end = TEMPLATE.find("</footer>") + len("</footer>")
    top = TEMPLATE[body_start:main_start]
    footer = TEMPLATE[footer_start:footer_end]
    scripts = re.findall(r'<script src="script\.js[^"]*"></script>|<script type="module" src="customer-account\.js[^"]*"></script>', TEMPLATE[footer_end:])
    return top, footer, "\n".join(scripts)

def page(p):
    top, footer, scripts = chrome()
    params = ("ort=" + p["region"]) if p["region"] else ""
    body = "".join(f"<h2>{e(h)}</h2><p>{e(t)}</p>" for h, t in p["body"])
    faq = "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in p["faq"])
    related = "".join(f'<a href="/{s}">{e(LABELS[s])}</a>' for s in p["related"] if s in LABELS)
    main = f"""<main class="sponti-location">
      <nav class="sponti-breadcrumb" aria-label="Brotkrumen"><a href="/">Sponti</a> <span aria-hidden="true">›</span> <a href="/kurse">Kurse</a> <span aria-hidden="true">›</span> <span>{e(LABELS[p['slug']])}</span></nav>
      <section class="courses-heading">
        <div class="eyebrow"><span class="eyebrow-dot"></span> {e(p['eyebrow'])}</div>
        <h1>{e(p['h1'])}<br /><em>{e(p['h1em'])}</em></h1>
        <p>{e(p['lead'])}</p>
      </section>
      <section class="sponti-location-courses" aria-labelledby="loc-courses-title">
        <div class="sponti-location-head"><h2 id="loc-courses-title">Aktuell freie Plätze</h2><a class="text-link" href="/kurse{('?' + params) if params else ''}">Alle Kurse ansehen →</a></div>
        <div data-location-courses data-region="{e(p['region'])}" data-category="{e(p['category'])}" data-keyword="{e(p['keyword'])}"><p class="sponti-location-status">Freie Plätze werden geladen …</p></div>
      </section>
      <section class="sponti-location-text">{body}</section>
      <section class="sponti-location-faq" aria-labelledby="loc-faq-title"><h2 id="loc-faq-title">Häufige Fragen</h2>{faq}</section>
      <section class="sponti-location-related" aria-label="Weitere Orte und Kurse"><h2>Weitere Kurse entdecken</h2><div>{related}<a href="/kursanbieter">Für Kursanbieter</a></div></section>
    </main>"""
    return (head_for(p) + top + main + "\n\n        " + footer + "\n    " + scripts +
            '\n    <script src="/sponti-location-courses.js?v=20261124" defer></script>\n  </body>\n</html>\n')

for p in PAGES:
    (ROOT / f"{p['slug']}.html").write_text(page(p), encoding="utf-8")
    print("geschrieben:", p["slug"] + ".html")
