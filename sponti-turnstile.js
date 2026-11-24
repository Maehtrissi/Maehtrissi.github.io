/*
 * Sponti – Bot-Schutz mit Cloudflare Turnstile
 *
 * Fügt bei Registrierung, Anmeldung und "Passwort vergessen" automatisch ein
 * Turnstile-Token zu den Supabase-Auth-Anfragen hinzu. Für echte Besucher läuft
 * die Prüfung meist unsichtbar; nur bei Verdacht erscheint ein kurzes Kästchen
 * direkt über dem Absende-Knopf des Formulars.
 *
 * Funktionsweise: Supabase JS ruft das globale fetch() erst beim Absenden auf.
 * Dieses Script ergänzt bei den geschützten Auth-Endpunkten das Feld
 * gotrue_meta_security.captcha_token – genau das, was Supabase für die
 * CAPTCHA-Prüfung erwartet. Die bestehenden Account-Scripts bleiben unverändert.
 *
 * Einrichtung:
 *   1. In Cloudflare unter "Turnstile" ein Widget anlegen (Modus "Managed")
 *      und die Domains sponti-switzerland.ch sowie maehtrissi.github.io eintragen.
 *   2. Den öffentlichen Site Key unten bei SITE_KEY einsetzen.
 *   3. Erst danach in Supabase unter Authentication → Attack Protection
 *      "Enable Captcha protection" mit Anbieter Turnstile und dem Secret Key aktivieren.
 * Solange SITE_KEY leer ist, macht dieses Script nichts.
 */
(function () {
  'use strict';

  var SITE_KEY = '0x4AAAAAAGQou9Mp-MPUs4eR'; // öffentlicher Turnstile Site Key, z. B. '0x4AAAAAAA…'
  var AUTH_HOST = 'ehifskiigrfpxeiruyxr.supabase.co';
  var PROTECTED = /\/auth\/v1\/(?:signup|recover|otp)(?:\?|$)|\/auth\/v1\/token\?(?:.*&)?grant_type=password(?:&|$)/;
  var MSG_FAILED = 'Die Sicherheitsprüfung hat nicht geklappt. Bitte lade die Seite neu und versuche es nochmals.';
  var MSG_TIMEOUT = 'Die Sicherheitsprüfung wurde nicht abgeschlossen. Bitte versuche es nochmals.';

  if (!SITE_KEY || typeof window.fetch !== 'function') return;

  var lastForm = null;
  document.addEventListener('submit', function (event) { lastForm = event.target; }, true);

  var apiPromise = null;
  function loadApi() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = function () {
        if (window.turnstile) resolve(window.turnstile);
        else { apiPromise = null; reject(new Error(MSG_FAILED)); }
      };
      script.onerror = function () { apiPromise = null; reject(new Error(MSG_FAILED)); };
      document.head.appendChild(script);
    });
    return apiPromise;
  }

  // Script schon beim Laden der Seite holen, damit das Absenden nicht wartet.
  function preload() { loadApi().catch(function () {}); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preload);
  else preload();

  function activeForm() {
    if (lastForm && lastForm.isConnected) return lastForm;
    var el = document.activeElement;
    return el && el.closest ? el.closest('form') : null;
  }

  function placeBox(box) {
    var form = activeForm();
    if (!form) { document.body.appendChild(box); return; }
    var button = form.querySelector('[type="submit"], button:not([type="button"])');
    if (button && button.parentNode) button.parentNode.insertBefore(box, button);
    else form.appendChild(box);
  }

  function requestToken() {
    return loadApi().then(function (ts) {
      return new Promise(function (resolve, reject) {
        var box = document.createElement('div');
        box.className = 'sponti-turnstile';
        box.style.margin = '12px 0';
        placeBox(box);
        var widgetId = null, done = false;
        var timer = setTimeout(function () { finish(null, new Error(MSG_TIMEOUT)); }, 120000);
        function finish(token, error) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          setTimeout(function () {
            try { if (widgetId !== null) ts.remove(widgetId); } catch (e) { /* bereits entfernt */ }
            box.remove();
          }, 0);
          if (error) reject(error); else resolve(token);
        }
        try {
          widgetId = ts.render(box, {
            sitekey: SITE_KEY,
            action: 'auth',
            appearance: 'interaction-only',
            language: 'de',
            callback: function (token) { finish(token); },
            'error-callback': function () { finish(null, new Error(MSG_FAILED)); return true; },
            'expired-callback': function () { finish(null, new Error(MSG_TIMEOUT)); },
            'timeout-callback': function () { finish(null, new Error(MSG_TIMEOUT)); }
          });
        } catch (e) {
          finish(null, new Error(MSG_FAILED));
        }
      });
    });
  }

  // Nur eine Prüfung gleichzeitig.
  var queue = Promise.resolve();
  function nextToken() {
    var result = queue.then(requestToken);
    queue = result.catch(function () {});
    return result;
  }

  function requestUrl(input) {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    return input && input.url ? input.url : '';
  }

  var originalFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = requestUrl(input);
    if (url.indexOf(AUTH_HOST) !== -1 && PROTECTED.test(url) && init && typeof init.body === 'string' &&
        String(init.method || 'GET').toUpperCase() === 'POST') {
      var body;
      try { body = JSON.parse(init.body); } catch (e) { body = null; }
      var meta = body && body.gotrue_meta_security;
      if (body && !(meta && meta.captcha_token)) {
        return nextToken().then(function (token) {
          body.gotrue_meta_security = Object.assign({}, meta, { captcha_token: token });
          return originalFetch.call(window, input, Object.assign({}, init, { body: JSON.stringify(body) }));
        });
      }
    }
    return originalFetch.apply(window, arguments);
  };
})();
