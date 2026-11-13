# Sponti – Stripe Connect Provisions- und Auszahlungsintegration

Stand 13. November 2026. **Nicht produktiv freigegeben.**

## Implementiert
- PostgreSQL-Trigger `private.sponti_record_paid_booking`: erzeugt nach bestätigter, bezahlter Stripe-Buchung einmalig einen privaten Ledger-Eintrag.
- Berechnung in Rappen: Provision = `floor((Brutto-Rappen * 13 + 50) / 100)`; Anbieteranteil = Brutto − Provision. Stripe-Gebühren werden hier **nicht** vom Anbieteranteil abgezogen; Plattform trägt sie bis zu einer expliziten anderen Vereinbarung.
- Kursende: `courses.ends_at`, sonst vorsichtige Annahme `starts_at + 2 Stunden`. Auszahlungen erst nach diesem Zeitpunkt.
- `private.sponti_transfer_ledger` speichert Brutto, Provision, Anbieteranteil, Fälligkeit, Status und Stripe-Referenzen. Eindeutiger Schlüssel auf `booking_id` verhindert doppelte Ledger-Einträge.
- Edge Function `sponti-transfer-worker` vorbereitet: nur POST mit geheimem Worker-Token, zusätzlichem Feature-Flag und **ausschliesslich Stripe-Testschlüssel**. Prüft vor Transfers Buchungsstatus, Kursende, Connect-Konto, Stripe-Zahlung und Rückerstattungen. Nutzt Stripe-Idempotency-Key pro Buchung und `source_transaction`.
- Keine API-Secrets im Frontend oder Repository.

## Noch erforderlich
1. Supabase-Secret `SPONTI_TRANSFER_WORKER_TOKEN` (zufällig, mindestens 32 Zeichen) sicher hinterlegen; niemals in GitHub oder Browsercode. `SPONTI_TRANSFER_WORKER_ENABLED` vorerst **nicht** auf `true` setzen.
2. Stripe-Test-Connect-Konten und vollständigen Testdurchlauf durchführen: Zahlung, Webhook, Ledger, Kursende, Transfer, Rückerstattung und wiederholter Worker-Aufruf.
3. Geschützten Scheduler für den Worker einrichten (z. B. Supabase Cron + Vault/Net), ohne Token in SQL oder öffentlichen Dateien zu speichern.
4. CRM-Ansicht für Ledger/Transferstatus und manuelle Nachbearbeitung bei Fehlern bauen. Fehlgeschlagene Transfers werden bewusst **nicht** automatisch erneut ausgeführt: nach unklarem Stripe-Ergebnis erst anhand der Stripe-Idempotency-Key-Referenz abgleichen.
5. Bei Rückerstattung oder Dispute nach einem Transfer Transfer-Reversal und Erstattungsworkflow implementieren.
6. Stripe-Gebühren, MWST und vertragliche Gebührenverteilung festlegen; Gebühren aus Stripe-Balance-Transactions abgleichen.
7. Für Livebetrieb gesonderte Live-Connect-Prüfung, Live-Webhook, Freigabeschalter, Monitoring und ausdrückliche Betreiberfreigabe implementieren. Der aktuelle Worker verweigert Live-Schlüssel.
8. Öffentlicher Checkout benötigt weiterhin Cloudflare-Turnstile-Konfiguration und Testfreigabe.

**Wichtig:** Der Worker ist technisch bereitgestellt, aber nicht zeitgesteuert und nicht aktiviert. Es werden derzeit **keine automatischen Anbieterzahlungen** ausgeführt.
