# Kundenprofile

profil.html bietet Anmelden, Profil erstellen, Passwort zurücksetzen, Profil bearbeiten und Abmelden. Der Header aller sechs öffentlichen Seiten zeigt Anmelden und nach erfolgreicher Anmeldung Mein Profil.

## Build

npm ci && npm run build:account && npm run check

SDK-Versionen sind in package.json und package-lock.json festgelegt. customer-account.source.js ist die Implementierung; customer-account.js die lokal gebündelte veröffentlichte Datei. Kein externer JavaScript-CDN wird benötigt.

## Supabase-Konfiguration vor Freigabe für alle Kunden

- Authentication → URL Configuration: https://sponti-switzerland.ch/profil.html als erlaubte Redirect URL hinzufügen. Site URL auf die echte Sponti-Domain setzen; bestehende CRM-Redirects behalten.
- Authentication → Emails → SMTP Settings: eigenen E-Mail-Versand konfigurieren. Der Standardversand ist für Teamadressen beschränkt. Bestätigungs- und Recovery-Mails mit einer echten Kundenadresse testen.
- E-Mail-Bestätigung eingeschaltet lassen. Unbestätigte Benutzer können kein vorhandenes Kundenprofil übernehmen.
- Kundensitzungen verwenden sponti-customer-auth, Mitarbeitersitzungen sponti-employee-auth.
- ContactChannel=NULL bedeutet keine Kursinfos/keine Einwilligung und muss bei Kampagnen berücksichtigt werden.

## Zugriff

Die Invoker-RPC public.customer_profile ruft eine eng begrenzte private Definer-Funktion auf. Diese prüft auth.uid(), verwirft anonyme Benutzer und verlangt eine serverseitig bestätigte E-Mail aus auth.users. Nur eigene Profilfelder werden zurückgegeben. ID, E-Mail, Rollen oder CRM-Notizen sind keine zulässigen Updatefelder. Bestehende Einträge werden nach bestätigter E-Mail verknüpft. Ohne vorhandenen Eintrag wird bei erster Speicherung ein Profil angelegt. Archivierte verknüpfte Profile können nicht durch Kunden aktiviert werden.

Sponti beitreten führt auf allen öffentlichen Seiten direkt zur Kontoerstellung (profil.html?mode=register). Anmelden öffnet den Login für bestehende Konten. Die alten separaten Kursinfo-Formulare wurden entfernt. Die bestehenden Kursanbieter-Formulare bleiben erhalten. Name, Telefon, Interessen und Kontaktkanäle werden erst nach bestätigter Registrierung im eigenen CRM-Profil gespeichert. Bestehende frühere Kursinfo-Einträge werden per bestätigter E-Mail übernommen.

Tests liegen im Mitarbeiterrepository unter supabase/tests/customer_profiles.sql. Eigentums-, Legacy-, Opt-out- und Datenschutzprüfungen laufen in einer Transaktion mit Rollback.

