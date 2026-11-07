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

## Anbieter-Onboarding: verbindliche Freigabe (noch umzusetzen)
- Registrierung in Sponti → manuelle Prüfung und CRM-Freigabe → Stripe Connect Express Onboarding → Stripe-Kontostatus serverseitig prüfen → Kursanlage und Veröffentlichung erlauben.
- **Wichtig:** `details_submitted` allein reicht nicht. Capabilities für den gewählten Connect-Zahlungsfluss und Einschränkungen prüfen. Sandbox-Status ist keine Live-Freigabe.
- Kurs-INSERT und UPDATE in `provider_courses` über RLS/Serverfunktion gegen verifizierten Stripe-**Live**-Status und CRM-Freigabe absichern. Vorhandene RLS-Policies sind permissiv/ODER-verknüpft; besonders `Providers manage own courses` erlaubt aktuell auch aktive Kurse ohne Connect. Vor einer Änderung auf Produktionsdatenbank alle Policies konsolidieren und Tests für API-Umgehung durchführen.
- Beim Connect-Testendpunkt `private.provider_accounts.public_enabled` und den CRM-Status nicht mit `provider_accounts`-Existenz verwechseln: aktuell wird nur ein bestehender Anbieter-Account geprüft.
- Der UI-Test-Branch deaktiviert vorsorglich den Button `Neuen Kurs erstellen`; diese reine UI-Sperre ist **keine** Sicherheitskontrolle. Bis zur serverseitigen Durchsetzung keine Produktionsfreigabe.
- Für Stripe Connect: Zahlungsfluss (z.B. Separate Charges and Transfers), Transfergruppe, idempotente Transfers, Refund-/Kursausfall-Logik, Reconciliation, Haftung, Gebührenmodell und Schweizer Fristen prüfen.
- Stripe-Berichte und eigener Finanzabgleich: PaymentIntent, Charge, Balance Transaction, Refund, Transfer, Payout mit Kurs-, Buchungs- und Anbieter-ID verbinden. Keine vertraulichen Kundendaten in Metadaten.
- Tests mindestens: nicht angemeldeter Anbieter, unfreigegebener Anbieter, Connect abgebrochen, `requirements.currently_due`, Auszahlung gesperrt, zwei Anbieter mit drei Kursen, parallele Buchungen, Refund, Kursausfall, doppelte Webhooks und erneute Übertragung.
- Keine echten Keys oder Transfers aktivieren, bis Stripe-/Rechtsprüfung und vollständiger Sandbox-End-to-End-Test abgeschlossen sind.

## Technischer Zwischenstand – 6. November 2026 (aktualisiert)

**Weiterhin KEINE Live-Freigabe.**

Umgesetzt und in Supabase geprüft:
- `private.sponti_connect_live_accounts` mit aktivierter RLS und Zugriff nur für Server-Rolle, getrennt vom Testkonto-Mapping.
- Serverfunktionen `private.sponti_provider_live_ready` und `private.sponti_provider_can_create`. Voraussetzung: CRM-Status Partner, bestätigtes eigenes Konto, Stripe Live-Transfers und Payouts aktiv, keine offenen Stripe-Anforderungen, letzte Prüfung jünger als 24 Stunden.
- Serverseitige Sperre in `provider_courses`-RLS und in der sicherheitsprivilegierten Anbieter-Kurs-RPC. Vorhandene Kursdatensätze werden beibehalten.
- Anbieter-Onboarding-Checkliste, CRM-/Live-Stripe-Status und blockierte Kursanlage in `anbieter.html` **nur im GitHub-Test-Branch**, nicht auf der öffentlichen Website.
- Zwei neue Edge Functions: `sponti-connect-onboarding-live` und `sponti-connect-webhook-live`, beide fail-closed (nur mit `SPONTI_CONNECT_LIVE_ENABLED=true` und getrennten Stripe-Live-Secrets). Ohne diese Konfiguration keine echten Accounts oder Zahlungen.
- Stripe Checkout Testendpunkt aktualisiert: Sponti-Buchungs-ID, Kurs-ID und gegebenenfalls Anbieter-ID in Checkout-/PaymentIntent-Metadaten; weiterhin nur Mitarbeitende/Testschlüssel.
- Privates Journal `private.sponti_transfer_ledger` für Buchungsanteile und `public.crm_sponti_finance_summary` für berechtigte Mitarbeitende; kein Stripe-Transfer wird ausgelöst.
- Vier bestehende gespiegelte Anbieter-Kurse in `public.courses` dem richtigen CRM-Anbieter zugeordnet, ohne sie zu veröffentlichen. Mirror-Trigger kontrolliert Live-Stripe-Bereitschaft.

Noch nicht fertig:
- Stripe Live-Connect-Accountmodell mit Nutzer und Anwalt final wählen. Stripe empfiehlt für neue Plattformen neue Accounts-v2-Integration zu prüfen; der derzeit vorbereitete Express-Onboarding-Code darf ohne diese Entscheidung nicht aktiviert werden.
- In Stripe Dashboard Connect aktivieren, Unternehmensprüfung und benötigte Berechtigungen/Bankkonto abschliessen; getrennte Live-Secrets und signierten Webhook konfigurieren.
- Echten Anbieter-Test mit authentifiziertem Konto und Testdaten durchspielen; Webhook-Signatur, Verifizierung/Entzug, CRM-Sperre, Zahlungs- und Rückerstattungsfälle prüfen.
- Vollständige spätere Transferausführung mit Verhinderung doppelter Transfers und Abgleich von Charge/Balance-Transaction/Refund/Payout implementieren. Journal allein ist **keine** automatische Auszahlung.
- Auszahlungen nur nach dokumentierter Kursdurchführung und unter den Stripe-/Schweizer Regeln; Zahlungsfluss und Verantwortung bei Stornos/Kursausfall festlegen.
- CRM-Finanzübersicht sichtbar anbinden und Stripe-Zahlungsberichte mit Datenbank abgleichen; bisher nur gesicherte Berichtsfunktion.
- Einladungs-/Freigabemail nach öffentlicher Freigabe anpassen: Anbieter sollen den **stabilen Link zum Sponti-Anbieterboard** erhalten, nicht einen kurzlebigen Stripe Account Link per E-Mail. Der Einmallink wird erst nach authentifiziertem Klick erzeugt.
- Code-Review, vollständige E2E-Tests und Merge der Test-Branch-Oberfläche. Bis dahin keine Live-Transaktionen.

Docs: https://docs.stripe.com/connect/express-accounts ; https://docs.stripe.com/stripe-reports
