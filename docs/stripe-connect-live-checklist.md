# Sponti – Freigabecheckliste Stripe Checkout + Connect (6.11.2026)

Status: **NICHT LIVE FREIGEBEN**. Diese Datei dokumentiert die Vorbereitung; sie aktiviert keine Zahlungen.

## Bestehender Stand
- Die öffentliche Buchungsseite `buchung.html` nutzt `course-booking.js` und nimmt bei kostenpflichtigen Kursen noch keine Zahlung an.
- Die Frontend-Checkout-Anbindung befindet sich im Branch `feature/stripe-checkout-test` (Pull Request #8).
- Der Supabase-Endpunkt `sponti-create-checkout` akzeptiert nur Stripe-Testschlüssel und erfordert ein aktives CRM-Mitarbeiterkonto.
- Der Stripe-Testwebhook bestätigt Testbuchungen nach signiertem Stripe-Event.
- Neue bezahlte Buchungen erfassen 13 % Sponti-Provision; Anbietertransfers sind noch nicht umgesetzt.

## Erforderlich vor Produktionsfreigabe
1. Stripe Connect-Kontomodell samt Verantwortlichkeit für Gebühren, Rückerstattungen, negative Salden und Anbieter-Onboarding definieren; Schweizer rechtliche/steuerliche Prüfung abschliessen.
2. Serverseitig Anbieteridentität mit einem Connect-Account verknüpfen; nur autorisierte Anbieter dürfen ihre Verknüpfung einsehen/ändern.
3. Account-Onboarding und Statusabfrage mit Stripe implementieren. Aktivierung nur bei geeigneten Capabilities und erfüllten Anforderungen.
4. Checkout serverseitig anhand echter Kursdaten preislich prüfen; Kursanbieter- und Buchungs-ID in Stripe Checkout **und PaymentIntent** als Metadaten speichern; keine vertraulichen Kundendaten als Metadaten.
5. Zahlungs- und Auszahlungskonten/Transfer-Logik implementieren; Doppeltransfers verhindern und Kursausfall, Storno sowie Rückerstattungen berücksichtigen.
6. Auszahlungen erst nach Kursdurchführung unter Berücksichtigung von Stripe-Verfügbarkeits- und Aufbewahrungsfristen prüfen.
7. Kundenseite auf bestehendem Formular aufbauen: Vorname, Nachname, E-Mail, Telefon, Platzanzahl, Zustimmung zu AGB; Gastbuchung möglich.
8. Stripe Checkout auf 15-Minuten-Reservierung abstimmen. Stripe Checkout hat eigene minimale Ablaufzeiten; Reservierungsablauf und Checkout-Verfall müssen synchron sein.
9. Signierte Webhooks, idempotente Buchungs- und Transferverarbeitung, Abgleich ausgebliebener Events sowie Parallelbuchungen testen.
10. Stripe-Reporting für Zahlungen, Gebühren, Anbieter und Provisionen gegen Supabase-Buchungen abstimmen; Kursspezialberichte im Sponti-CRM führen.
11. Erfolgsseite zeigt erst nach serverseitig bestätigtem Zahlungsstatus eine definitive Buchung an.
12. Sandbox-Test mit mindestens zwei Anbietern und mehreren Kursen sowie Storno, Checkout-Ablauf, Kursausfall und Rückzahlung bestehen.
13. Nur nach abgeschlossener Prüfung Live-Keys und produktiven Stripe-Webhook sicher als Supabase-Secrets konfigurieren; Test/Live-Events und -Daten trennen.
14. Erst anschliessend mit geprüftem GitHub-PR veröffentlichen. Kein direkter Test-Branch-Merge in die öffentliche Seite ohne Review.

Keine Stripe-API-Schlüssel, Connect-Kontonummern oder Kundendaten in diesem Repository speichern.
