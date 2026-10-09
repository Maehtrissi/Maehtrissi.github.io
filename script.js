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

// Close account dropdown when clicking outside, pressing Escape, or opening main navigation.
document.addEventListener("pointerdown", (event) => {
  document.querySelectorAll(".account-selector[open]").forEach((selector) => {
    if (!selector.contains(event.target)) selector.open = false;
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") document.querySelectorAll(".account-selector[open]").forEach((selector) => { selector.open = false; selector.querySelector("summary")?.focus(); });
});
document.querySelectorAll("[data-site-menu-trigger]").forEach((trigger) => trigger.addEventListener("click", () => {
  document.querySelectorAll(".account-selector[open]").forEach((selector) => { selector.open = false; });
}));
