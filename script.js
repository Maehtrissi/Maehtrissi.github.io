const SUPABASE_URL = "https://ehifskiigrfpxeiruyxr.supabase.co";
const SUPABASE_KEY = "sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy";

const partnerModal = document.querySelector("#partner-modal");
let partnerOpener = null;
let partnerBackground = [];
let previousBodyOverflow = "";

function closePartnerModal() {
  if (!partnerModal || !partnerModal.classList.contains("is-open")) return;
  partnerModal.classList.remove("is-open");
  partnerModal.setAttribute("aria-hidden", "true");
  partnerBackground.forEach(({ element, wasInert }) => { element.inert = wasInert; });
  partnerBackground = [];
  document.body.style.overflow = previousBodyOverflow;
  partnerOpener?.focus();
}

if (partnerModal) {
  document.querySelectorAll("[data-open-partner]").forEach((button) => {
    button.addEventListener("click", () => {
      partnerOpener = button;
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      partnerBackground = [...document.body.children]
        .filter((element) => element !== partnerModal && element.tagName !== "SCRIPT")
        .map((element) => ({ element, wasInert: element.inert }));
      partnerBackground.forEach(({ element }) => { element.inert = true; });
      partnerModal.classList.add("is-open");
      partnerModal.setAttribute("aria-hidden", "false");
      const submittedMessage = partnerModal.querySelector("[data-partner-success]");
      const firstInput = partnerModal.querySelector("input");
      const focusTarget = submittedMessage && !submittedMessage.hidden ? submittedMessage : firstInput;
      (focusTarget || partnerModal.querySelector("[data-close-partner]")).focus();
    });
  });
  partnerModal.querySelector("[data-close-partner]").addEventListener("click", closePartnerModal);
  partnerModal.addEventListener("click", (event) => {
    if (event.target === partnerModal) closePartnerModal();
  });
  document.addEventListener("keydown", (event) => {
    if (!partnerModal.classList.contains("is-open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closePartnerModal();
    }
    if (event.key !== "Tab") return;
    const focusables = [...partnerModal.querySelectorAll("button, input, select, textarea, a[href]")]
      .filter((element) => !element.disabled && !element.closest("[hidden]"));
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

document.querySelectorAll("[data-partner-form]").forEach((partnerForm) => {
  const partnerSuccess = partnerForm.querySelector("[data-partner-success]");
  const partnerError = partnerForm.querySelector("[data-partner-error]");
  const submitButton = partnerForm.querySelector('[type="submit"]');
  let isSubmitting = false;
  const partnerPhoneInput = partnerForm.elements.namedItem("phone");
  const validatePartnerPhone = () => {
    const value = partnerPhoneInput?.value.trim() || "";
    const digits = value.replace(/\D/g, "").length;
    const valid = !value || (/^[+0-9 ()/.\-]+$/.test(value) && digits >= 7 && digits <= 15
      && (!value.includes("+") || value.indexOf("+") === 0 && value.lastIndexOf("+") === 0));
    partnerPhoneInput?.setCustomValidity(valid ? "" : "Bitte gib eine gültige Telefonnummer mit 7 bis 15 Ziffern ein.");
  };
  partnerPhoneInput?.addEventListener("input", validatePartnerPhone);

  partnerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    validatePartnerPhone();
    if (!partnerForm.reportValidity()) return;
    const data = new FormData(partnerForm);
    const submission = {
      company: String(data.get("company") || "").trim(),
      contact: String(data.get("contact") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      location: String(data.get("location") || "").trim(),
      offer_type: String(data.get("offer_type") || "").trim(),
      category: String(data.get("category") || "").trim(),
      message: String(data.get("message") || "").trim()
    };
    if (!submission.company || !submission.contact || !submission.email || !submission.location || submission.location.length > 300 || !["Einzelne Kurse", "Mehrere Kurse", "Beides"].includes(submission.offer_type)) {
      partnerError.textContent = "Bitte fülle die Pflichtfelder aus und wähle aus, was du anbieten möchtest.";
      partnerError.hidden = false;
      return;
    }
    isSubmitting = true;
    partnerError.hidden = true;
    partnerSuccess.hidden = true;
    submitButton.disabled = true;
    partnerForm.setAttribute("aria-busy", "true");

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/Kursanbieter`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(submission)
      });
      if (!response.ok) throw new Error("Fehler beim Speichern der Kursanbieter-Anfrage");
      partnerForm.querySelectorAll("label, button").forEach((element) => { element.hidden = true; });
      partnerSuccess.hidden = false;
      partnerSuccess.focus();
    } catch (error) {
      console.error("Kursanbieter-Anfrage konnte nicht gespeichert werden:", error);
      partnerError.textContent = "Deine Anfrage konnte nicht gespeichert werden. Bitte versuche es erneut.";
      partnerError.hidden = false;
    } finally {
      isSubmitting = false;
      submitButton.disabled = false;
      partnerForm.removeAttribute("aria-busy");
    }
  });
});

const locationCarousel = document.querySelector("[data-location-carousel]");

if (locationCarousel) {
  const viewport = locationCarousel.querySelector("[data-location-viewport]");
  const cards = [...locationCarousel.querySelectorAll("[data-location-card]")];
  const previousButton = locationCarousel.querySelector("[data-location-previous]");
  const nextButton = locationCarousel.querySelector("[data-location-next]");
  const status = locationCarousel.querySelector("[data-location-status]");
  let activeIndex = 0;
  let scrollTimer;
  let isProgrammaticScroll = false;

  const setActiveCard = (index) => {
    activeIndex = (index + cards.length) % cards.length;
    cards.forEach((card, cardIndex) => {
      const isActive = cardIndex === activeIndex;
      card.classList.toggle("is-active", isActive);
      card.setAttribute("aria-current", isActive ? "true" : "false");
    });

    const city = cards[activeIndex].querySelector("strong").textContent;
    if (status) status.textContent = `${city}, ${activeIndex + 1} von ${cards.length}`;
  };

  const scrollToCard = (index, focusViewport = false) => {
    setActiveCard(index);
    const card = cards[activeIndex];
    if (viewport && card) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      isProgrammaticScroll = !prefersReducedMotion;
      viewport.scrollTo({
        left: card.offsetLeft - (viewport.clientWidth - card.clientWidth) / 2,
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });
      window.clearTimeout(scrollTimer);
      if (prefersReducedMotion) {
      } else {
        scrollTimer = window.setTimeout(settleScroll, 180);
      }
      if (focusViewport) viewport.focus({ preventScroll: true });
    }
  };

  const syncActiveCard = () => {
    if (!viewport) return;
    const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
    const closestIndex = cards.reduce((closest, card, index) => {
      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const closestCenter = cards[closest].offsetLeft + cards[closest].clientWidth / 2;
      return Math.abs(cardCenter - viewportCenter) < Math.abs(closestCenter - viewportCenter) ? index : closest;
    }, 0);
    setActiveCard(closestIndex);
  };

  const settleScroll = () => {
    if (isProgrammaticScroll) {
      isProgrammaticScroll = false;
      return;
    }

    syncActiveCard();
  };

  if (previousButton) previousButton.addEventListener("click", () => scrollToCard(activeIndex - 1, true));
  if (nextButton) nextButton.addEventListener("click", () => scrollToCard(activeIndex + 1, true));
  if (viewport) {
    viewport.addEventListener("scroll", () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(settleScroll, isProgrammaticScroll ? 180 : 100);
    }, { passive: true });
    viewport.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollToCard(activeIndex - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollToCard(activeIndex + 1);
      }
      if (event.key === "Home") {
        event.preventDefault();
        scrollToCard(0);
      }
      if (event.key === "End") {
        event.preventDefault();
        scrollToCard(cards.length - 1);
      }
    });
  }

  setActiveCard(0);
  requestAnimationFrame(() => scrollToCard(0));
}

const siteMenu = document.querySelector("[data-site-menu]");
const siteMenuTrigger = document.querySelector("[data-site-menu-trigger]");

if (siteMenu && siteMenuTrigger) {
  const menuPanel = siteMenu.querySelector(".site-menu-panel");
  const closeMenuButtons = siteMenu.querySelectorAll("[data-site-menu-close]");
  const menuFocusables = () => [...siteMenu.querySelectorAll("a[href], button:not([disabled])")];

  const closeSiteMenu = (returnFocus = true) => {
    siteMenu.classList.remove("is-open");
    siteMenu.setAttribute("aria-hidden", "true");
    siteMenuTrigger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("site-menu-open");
    if (returnFocus) siteMenuTrigger.focus();
  };

  const openSiteMenu = () => {
    siteMenu.classList.add("is-open");
    siteMenu.setAttribute("aria-hidden", "false");
    siteMenuTrigger.setAttribute("aria-expanded", "true");
    document.body.classList.add("site-menu-open");
    window.setTimeout(() => menuPanel.querySelector(".site-menu-close").focus(), 50);
  };

  siteMenuTrigger.addEventListener("click", openSiteMenu);
  closeMenuButtons.forEach((button) => button.addEventListener("click", () => closeSiteMenu()));
  siteMenu.querySelectorAll(".site-menu-links a").forEach((link) => link.addEventListener("click", () => closeSiteMenu(false)));
  siteMenu.querySelector("[data-open-booking]")?.addEventListener("click", () => closeSiteMenu(false));

  document.addEventListener("keydown", (event) => {
    if (!siteMenu.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeSiteMenu();
      return;
    }

    if (event.key !== "Tab") return;
    const focusables = menuFocusables();
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}


/* Cookie / privacy notice */
(() => {
  const key = "sponti_cookie_notice_v1";
  if (localStorage.getItem(key)) return;

  const banner = document.createElement("section");
  banner.className = "cookie-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", "Cookie- und Datenschutzhinweis");
  banner.innerHTML = `
    <div class="cookie-banner-copy">
      <strong>Datenschutz bei Sponti</strong>
      <p>Wir verwenden derzeit nur technisch notwendige Browser-Speicherfunktionen für Anmeldung, Sicherheit und Einstellungen. Analyse- und Marketing-Tracking ist aktuell nicht aktiviert.</p>
      <a href="datenschutz.html">Mehr zum Datenschutz</a>
    </div>
    <div class="cookie-banner-actions">
      <button class="button button-primary cookie-banner-ok" type="button">Verstanden</button>
    </div>
  `;
  document.body.appendChild(banner);

  banner.querySelector(".cookie-banner-ok").addEventListener("click", () => {
    localStorage.setItem(key, "acknowledged");
    banner.remove();
  });
})();

// Keep the login dropdown in sync with clicks anywhere on the page.
(function () {
  function closeSelectors(except) {
    document.querySelectorAll("details.account-selector[open]").forEach((item) => {
      if (item !== except) item.open = false;
    });
  }
  document.addEventListener("click", (event) => {
    const selector = event.target.closest("details.account-selector");
    if (!selector) closeSelectors();
    else if (event.target.closest("summary")) closeSelectors(selector);
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const open = document.querySelector("details.account-selector[open]");
    closeSelectors();
    if (open) { open.open = false; open.querySelector("summary")?.focus(); }
  }, true);
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-site-menu-trigger]")) closeSelectors();
  }, true);
})();

// Schreibweise von Orts- und Adressangaben vereinheitlichen.
(() => {
  const selector = 'input[name="city"], input[name="location"], input[name="venue"], input[name="meeting_point"], textarea[name="location"], textarea[name="venue"], textarea[name="meeting_point"]';
  const formatPlace = value => value.replace(/(^|[\\s,;/-])([\\p{L}])/gu, (_, sep, initial) => sep + initial.toLocaleUpperCase('de-CH'));
  const normalize = field => {
    if (!field?.matches?.(selector) || field.readOnly || field.disabled) return;
    const formatted = formatPlace(field.value);
    if (formatted !== field.value) {
      field.value = formatted;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };
  document.addEventListener('focusout', event => normalize(event.target), true);
  document.addEventListener('submit', event => {
    event.target.querySelectorAll?.(selector).forEach(normalize);
  }, true);
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll(selector).forEach(field => field.setAttribute('autocapitalize', 'words'));
  });
})();


/* Sponti unified desktop/mobile navigation — 2026-11-07.
   Reuses the existing account selector and routes; leaves authentication intact. */
(() => {
 function initGlobalHeader() {
  const header=document.querySelector('.site-header');
  if(!header || header.dataset.spontiNavReady==='1')return;
  header.dataset.spontiNavReady='1';
  header.classList.add('sponti-unified-header');
  const logo=header.querySelector('.logo');
  if(logo&&!logo.querySelector('img')) {
   const img=document.createElement('img');img.src='/logo.png';img.alt='Sponti Logo';logo.prepend(img);
  }
  const account=header.querySelector('details.account-selector');
  const oldMenu=header.querySelector('[data-site-menu-trigger]');
  if(oldMenu)oldMenu.remove();
  // Hide/remove only the site-menu drawer; profile dropdown stays available.
  const drawer=document.querySelector('[data-site-menu]');
  if(drawer){drawer.remove();document.body.classList.remove('site-menu-open');}
  const oldNav=header.querySelector('.detail-header-nav');
  if(oldNav)oldNav.remove();
  const links=[
   ['/', 'Startseite'],
   ['/kurse','Kurse entdecken'],
   ['/kursanbieter','Für Kursanbieter'],
   ['/motivation','Motivation'],
   ['/erfahrungen','Erfahrungen']
  ];
  const nav=document.createElement('nav');nav.className='sponti-global-nav';nav.setAttribute('aria-label','Hauptnavigation');
  const pathname=location.pathname.replace(/\.html$/,'').replace(/\/$/,'')||'/';
  for(const [href,label] of links){
   const a=document.createElement('a');a.href=href;a.textContent=label;
   if(pathname===href||(href==='/kurse'&&pathname==='/kurs'))a.setAttribute('aria-current','page');
   nav.append(a);
  }
  const actions=document.createElement('div');actions.className='sponti-header-actions';
  const search=document.createElement('div');search.className='sponti-header-search';
  const toggle=document.createElement('button');toggle.type='button';toggle.className='sponti-search-trigger';toggle.setAttribute('aria-label','Kurse suchen');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','sponti-search-panel');
  toggle.innerHTML='<svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>';
  const panel=document.createElement('form');panel.className='sponti-search-panel';panel.id='sponti-search-panel';panel.role='search';panel.hidden=true;panel.action='/kurse';panel.method='get';
  const input=document.createElement('input');input.type='search';input.name='suche';input.placeholder='Yoga, Pilates, Töpfern …';input.setAttribute('aria-label','Kurse nach Stichwort suchen');input.autocomplete='off';input.required=true;
  const submit=document.createElement('button');submit.type='submit';submit.textContent='Suchen';
  panel.append(input,submit);search.append(toggle,panel);
  function closeSearch(){panel.hidden=true;toggle.setAttribute('aria-expanded','false');}
  toggle.addEventListener('click',()=>{
   const opening=panel.hidden;panel.hidden=!opening;toggle.setAttribute('aria-expanded',String(opening));
   if(opening)input.focus();
  });
  document.addEventListener('click',e=>{if(!search.contains(e.target))closeSearch();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){closeSearch();toggle.focus();}});
  if(account)header.removeChild(account);
  actions.append(search);
  if(account){account.setAttribute('aria-label','Mein Profil');actions.append(account);}
  header.append(nav,actions);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initGlobalHeader);
 else initGlobalHeader();
})();


/* Replace decorative emoji in interface labels with consistent SVG line icons. */
(()=>{
 const paths={
 '✓':'<path d="m5 12 4 4L19 6"/>','✔':'<path d="m5 12 4 4L19 6"/>','✅':'<path d="m5 12 4 4L19 6"/>',
 '❤️':'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>','♥':'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>','♡':'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 '📅':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>','📆':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
 '📍':'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 '🔍':'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>','🔎':'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
 '⭐':'<path d="m12 2 3 6.5 7 .9-5 5 .9 7L12 18l-5.9 3.4.9-7-5-5 7-.9Z"/>','🌟':'<path d="m12 2 3 6.5 7 .9-5 5 .9 7L12 18l-5.9 3.4.9-7-5-5 7-.9Z"/>',
 '⚡':'<path d="m13 2-9 12h7l-1 8 10-12h-7Z"/>','🔔':'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 '👤':'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>','👥':'<circle cx="9" cy="8" r="3"/><path d="M2 20a7 7 0 0 1 14 0M17 5a3 3 0 0 1 0 6M19 20h3a6 6 0 0 0-5-6"/>',
 '🏠':'<path d="m3 10 9-7 9 7v11H3Z"/><path d="M9 21v-8h6v8"/>','✉':'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="m3 7 9 7 9-7"/>','📧':'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="m3 7 9 7 9-7"/>',
 '📞':'<path d="M6 3h4l2 5-3 2a16 16 0 0 0 5 5l2-3 5 2v4c0 2-2 3-4 3A18 18 0 0 1 3 7c0-2 1-4 3-4Z"/>',
 '🎨':'<path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 2-2c0-1-.5-2 1-2h1a4 4 0 0 0 4-4A10 10 0 0 0 12 3Z"/><circle cx="7" cy="11" r="1"/><circle cx="11" cy="7" r="1"/><circle cx="16" cy="8" r="1"/>',
 '🏃':'<circle cx="14" cy="4" r="2"/><path d="m7 21 4-7 3 2 2 5M4 12l5-3 4 2 3-1M11 14l-2-5"/>','🧘':'<circle cx="12" cy="5" r="2"/><path d="M8 10c1 2 7 2 8 0M12 9v6M3 19l6-4 3 3 3-3 6 4M3 19h18"/>',
 '🏋️':'<path d="M2 9v6m3-8v10m3-7v4m8-4v4m3-7v10m3-8v6M8 12h8"/>','🍳':'<path d="M3 9h14v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5ZM17 11h2a3 3 0 0 1 0 6h-2M7 3v3m5-3v3"/>',
 '🎭':'<path d="M3 4c4 2 8 2 12 0v8c0 5-3 8-6 9-3-1-6-4-6-9ZM15 5l6-1v8c0 3-2 5-4 6"/><path d="M6 10h1m4 0h1M6 14c2 2 4 2 6 0"/>',
 'ℹ️':'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>','❗':'<circle cx="12" cy="12" r="10"/><path d="M12 6v8M12 18h.01"/>',
 '🔒':'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 '💳':'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
 '📷':'<rect x="2" y="6" width="20" height="15" rx="2"/><circle cx="12" cy="13" r="4"/><path d="m7 6 2-3h6l2 3"/>',
 '💬':'<path d="M21 11a8 8 0 0 1-8 8H5l-3 3v-9a9 9 0 1 1 19-2Z"/>',
 '🌿':'<path d="M20 3C10 3 4 8 4 16a5 5 0 0 0 5 5c8 0 11-8 11-18ZM4 20c3-6 7-9 12-12"/>'
 };
 const keys=Object.keys(paths).sort((a,b)=>b.length-a.length);
 const escaped=keys.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 const re=new RegExp(escaped.join('|'),'gu');
 const svgNS='http://www.w3.org/2000/svg';
 const skip='script,style,textarea,code,pre,svg,[contenteditable],input,option,[data-no-icon-replace]';
 function scan(root){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){
   if(!n.parentElement||n.parentElement.closest(skip)||!re.test(n.nodeValue)){re.lastIndex=0;return NodeFilter.FILTER_REJECT;}re.lastIndex=0;return NodeFilter.FILTER_ACCEPT;
  }});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
   const text=node.nodeValue;re.lastIndex=0;const frag=document.createDocumentFragment();let last=0,match;
   while((match=re.exec(text))){if(match.index>last)frag.append(document.createTextNode(text.slice(last,match.index)));
    const span=document.createElement('span');span.className='sponti-line-icon';span.setAttribute('aria-label',match[0]);span.setAttribute('role','img');
    const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');svg.innerHTML=paths[match[0]];span.append(svg);frag.append(span);last=re.lastIndex;
   }
   if(last<text.length)frag.append(document.createTextNode(text.slice(last)));node.replaceWith(frag);
  }
 }
 const style=document.createElement('style');style.textContent='.sponti-line-icon{display:inline-flex;align-items:center;justify-content:center;vertical-align:-.16em;width:1.15em;height:1.15em;color:inherit;flex-shrink:0}.sponti-line-icon svg{display:block;width:100%;height:100%}';document.head.append(style);
 const run=()=>{scan(document.body);const observer=new MutationObserver(records=>{for(const record of records){for(const n of record.addedNodes){if(n.nodeType===1&& !n.matches(skip))scan(n);else if(n.nodeType===3&&n.parentElement&&!n.parentElement.closest(skip))scan(n.parentElement);}}});observer.observe(document.body,{childList:true,subtree:true});};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
