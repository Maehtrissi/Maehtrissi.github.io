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


## Course information settings and bookings

The member profile has separate cards for personal details, course information preferences, bookings and password changes. Course preferences include contact channel (WhatsApp, E-Mail, Beides or Keine), six course categories, optional further interests, region, starting locality/PLZ, radius, weekdays and times. Empty category or time selections mean flexible preferences.

customer_preferences is owned by auth.users.id. save_course_preferences saves these fields and the existing CRM contact channel/interest atomically under caller RLS. A radius requires a locality; it is a stored preference and does not implement automatic geographic filtering or message dispatch. CRM staff can read preferences; customers can only read/edit their own records.

The bookings card reads actual rows from public.bookings, grouped by upcoming/past date in Europe/Zurich, with status, venue, seats and total CHF price. Only registered active employees can create/update bookings in the database. Customers can read only their own bookings. No external provider import, payment or booking management UI is included. Empty and loading-error states are distinct.

Migrations: 20261005190530_customer_preferences_and_bookings.sql and 20261005191027_customer_course_info_settings.sql. Transactional ownership/validation/atomicity tests: supabase/tests/customer_preferences.sql in Sponti-Mitarbeiter.

The bookings card always shows separate upcoming and past sections after successful loading, each with its own empty state. Past means the scheduled start is in the past; it does not imply confirmed attendance. Cancellation/request status remains visible.

## Google- und Apple-Anmeldung für Teilnehmer

Auf profil.html erscheinen die Zusatzbuttons im Login und der Registrierung **erst, wenn Supabase Auth den jeweiligen Provider als aktiviert meldet** (GET /auth/v1/settings). Bestehende E-Mail/Passwort-Anmeldung bleibt unverändert. Der Browser startet `supabase.auth.signInWithOAuth({provider, options:{redirectTo:'https://sponti-switzerland.ch/profil.html'}})`; bestehende Kunden-Session-Speicherung wird wiederverwendet. Mitarbeiter-CRM bleibt durch eigene app_metadata-Prüfung und crm_is_employee gesperrt; Anbieter-Konto bleibt unverändert.

Neue OAuth-Konten müssen Name und Telefonnummer beim ersten Login ergänzen. Wenn kein Kontaktkanal vorliegt, wird ein Profil mit `Keine` gespeichert; es erfolgt **kein** Opt-in für Kursinfos. Nutzer können danach Kursinfos in den Präferenzen ausdrücklich aktivieren.

Vor Live-Schaltung Provider konfigurieren:
- Supabase Authentication → URL Configuration: https://sponti-switzerland.ch/profil.html unter Redirect URLs (bestehende URLs erhalten).
- Supabase Authentication → Providers → Google: Google OAuth Web Client ID und Client Secret; die Callback-URL im Google-Projekt lautet https://ehifskiigrfpxeiruyxr.supabase.co/auth/v1/callback, erlaubter JS-Origin ist https://sponti-switzerland.ch.
- Supabase Authentication → Providers → Apple: Services ID und Apple Developer Sign-In-Konfiguration samt Secret; dieselbe Supabase-Callback-URL in Apple Developer hinterlegen. Apple Client Secret nach Apple-Vorgaben regelmässig erneuern.
- Secrets ausschliesslich in den Provider-Konfigurationen eingeben, nicht in Website-Dateien, GitHub oder Chat einfügen.
- Testfälle: Google/Apple Neuanmeldung (Profil ergänzen), bestehende E-Mail-Anmeldung, bestehendes Teilnehmerkonto, Apple-Mail-Relay, Teilnehmer ohne CRM-Zugriff. Browser-Caches nach Deployment neu laden.
