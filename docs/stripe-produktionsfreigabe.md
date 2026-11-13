# Sponti – Stripe Produktionsfreigabe (Stand 13.11.2026)

**Status: NICHT FÜR ECHTE ZAHLUNGEN FREIGEGEBEN.** Keine Stripe-Live-Schlüssel in GitHub, HTML oder Browser-JavaScript ablegen.

## Verifizierter Ist-Zustand
- `stripe-test.html` ruft `sponti-create-checkout` auf.
- `sponti-create-checkout` akzeptiert derzeit nur Testschlüssel und aktive CRM-Mitarbeitende.
- `sponti-stripe-webhook` prüft Stripe-Signaturen und verarbeitet `checkout.session.completed` (paid) sowie `checkout.session.expired`.
- `sponti_reserve_paid_checkout` sperrt den Kursdatensatz vor der Platzreservierung und reduziert freie Plätze atomar.
- `sponti_resolve_paid_checkout_verified` prüft Währung, Betrag und Session-Referenz.
- `sponti-connect-onboarding-live` und `sponti-connect-webhook-live` existieren, sind aber durch einen Live-Feature-Schalter geschützt.
- `buchung.html` / `course-booking.js` bieten für kostenpflichtige Kurse noch keinen öffentlichen Stripe-Checkout.
- Eine automatische Auszahlung nach Kursdurchführung ist im geprüften Checkout nicht implementiert; `transfer_group` und Metadaten allein lösen keine Stripe-Transfers aus.

## Zwingende Aufgaben vor Freigabe
1. **Verbindliches Zahlungsmodell:** Separate Charges and Transfers oder Destination Charges mit Stripe-Connect-Kontotypen, Plattformverantwortung, Rückerstattungen und Chargebacks festlegen. Mit Stripe-Dokumentation und rechtlicher Beratung abgleichen.
2. **Öffentlicher Checkout:** Gesicherten Checkout-Endpunkt für Kunden und Gäste einrichten; kein Mitarbeiter-JWT erforderlich, aber Missbrauchsschutz (Rate-Limit, CAPTCHA falls nötig), serverseitige Preis- und Kapazitätsprüfung, akzeptierte AGB dokumentieren. Keine clientseitig übermittelten Preise vertrauen.
3. **Buchungsoberfläche:** `buchung.html` und `course-booking.js` an den neuen Endpunkt anschliessen. Kurs, Anzahl, Preis, Stornobedingungen und AGB vor Zahlung anzeigen. Gratisbuchungen unverändert lassen.
4. **Webhooks:** Stripe-Signatur verifizieren; `checkout.session.completed`, asynchrone Erfolge/Fehler und Session-Ablauf behandeln. Idempotenz und Ereignisreihenfolge absichern. Nicht auf die Erfolgs-URL als Zahlungsnachweis vertrauen.
5. **Reservierungen:** Abgelaufene und abgebrochene Sessions zuverlässig auflösen; Stripe-Webhook-Ausfälle durch periodischen Abgleich auffangen. Keine Überbuchungen bei parallelen Checkouts.
6. **Connect:** Anbieter nur nach CRM-Freigabe und Stripe-Verifizierung für zahlungspflichtige Kurse zulassen; Connect-Status serverseitig prüfen.
7. **Abrechnung:** 13 % Sponti-Provision exakt in Rappen berechnen; Stripe-Gebühren und MWST-Behandlung definieren; nach Kursdurchführung Transfers einmalig ausführen. Auszahlung/Transferstatus, Fehler und Rückabwicklungen protokollieren.
8. **Storno/Refunds:** Kunden- und Anbieterabsagen, Fristen, Teilrückerstattungen, Gebühren und Rückbuchungen mit Stripe und Datenbank synchronisieren.
9. **Kommunikation:** Bestätigung erst nach signiertem Zahlungsnachweis; Rechnungs-/Belegangaben, Bestätigungsmail, Anbieter-Teilnehmerliste und CRM-Status prüfen.
10. **Recht/Datenschutz:** AGB, Datenschutz, Vermittlerrolle, Anbietervereinbarung, Zahlungseinzug, Auszahlungsfristen, Gebühren, Aufbewahrung und Stripe-Vertragsrollen durch Schweizer Rechtsberatung prüfen.

## Abnahmetests (Testmodus)
- Erfolgreiche Kartenzahlung; 3-D-Secure; abgelehnte Karte; Abbruch; Ablauf.
- Zwei Kunden konkurrieren um den letzten Platz: maximal einer erhält bestätigte Buchung.
- Zwei Webhooks desselben Events: genau eine Buchungsbestätigung.
- Webhook vor Session-Zuordnung und verspäteter Webhook: keine Doppelbuchung/Verlust von Plätzen.
- Rückerstattung und Storno: korrekte Platzfreigabe und Abrechnung.
- Connect-Konto noch nicht verifiziert: kein bezahlter Kurs freigeschaltet.
- Auszahlung erst nach Kurs, keine doppelte Auszahlung bei Wiederholung.
- E-Mails und CRM-Status stimmen mit Stripe-Zahlungsstatus überein.

## Freigaberegel
Erst nach dokumentiert erfolgreichen Tests, Prüfung der Stripe-Live-Konfiguration und ausdrücklicher Freigabe des Betreibers echte Zahlungen aktivieren.
