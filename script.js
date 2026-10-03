const modal = document.querySelector("#booking-modal");
const openButtons = document.querySelectorAll("[data-open-booking]");
const closeButton = document.querySelector("[data-close-booking]");
const form = document.querySelector("#demo-form");
const success = document.querySelector("#form-success");

function openModal() {
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  const firstInput = modal.querySelector("input");
  if (firstInput) firstInput.focus();
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

openButtons.forEach((button) => button.addEventListener("click", openModal));
if (closeButton) closeButton.addEventListener("click", closeModal);
if (modal) {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal && modal.classList.contains("is-open")) closeModal();
});

const SUPABASE_URL = "https://ehifskiigrfpxeiruyxr.supabase.co";
const SUPABASE_KEY = "sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy";

if (form) {
  const phoneInput = form.elements.namedItem("phone");
  const errorMessage = document.querySelector("#form-error");
  const submitButton = form.querySelector('[type="submit"]');
  let isSubmitting = false;

  const validatePhone = () => {
    const value = phoneInput.value.trim();
    const digitCount = value.replace(/\D/g, "").length;
    const valid = /^[+0-9 ()/.\-]+$/.test(value)
      && (!value.includes("+") || value.indexOf("+") === 0 && value.lastIndexOf("+") === 0)
      && digitCount >= 7 && digitCount <= 15;
    phoneInput.setCustomValidity(valid ? "" : "Bitte gib eine gültige Telefonnummer mit 7 bis 15 Ziffern ein.");
  };
  phoneInput.addEventListener("input", validatePhone);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    validatePhone();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const submission = {
      Name: String(data.get("name") || "").trim(),
      Email: String(data.get("email") || "").trim(),
      Phone: String(data.get("phone") || "").trim(),
      Interest: data.get("business")
    };
    if (!submission.Name) {
      if (errorMessage) {
        errorMessage.textContent = "Bitte gib deinen Vor- und Nachnamen ein.";
        errorMessage.hidden = false;
      }
      return;
    }

    isSubmitting = true;
    if (errorMessage) errorMessage.hidden = true;
    if (success) success.hidden = true;
    if (submitButton) submitButton.disabled = true;
    form.setAttribute("aria-busy", "true");

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/Kunden%20-%20Users`,
        {
          method: "POST",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify(submission)
        }
      );
      if (!response.ok) throw new Error("Fehler beim Speichern in Supabase");
      form.hidden = true;
      if (success) success.hidden = false;
    } catch (error) {
      console.error("Supabase request failed:", error);
      if (errorMessage) {
        errorMessage.textContent = "Deine Anmeldung konnte nicht gespeichert werden. Bitte versuche es erneut.";
        errorMessage.hidden = false;
      }
    } finally {
      isSubmitting = false;
      if (submitButton) submitButton.disabled = false;
      form.removeAttribute("aria-busy");
    }
  });
}

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

  partnerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting || !partnerForm.reportValidity()) return;
    const data = new FormData(partnerForm);
    const submission = {
      company: String(data.get("company") || "").trim(),
      contact: String(data.get("contact") || "").trim(),
      email: String(data.get("email") || "").trim(),
      category: String(data.get("category") || "").trim(),
      message: String(data.get("message") || "").trim()
    };
    if (!submission.company || !submission.contact || !submission.email) {
      partnerError.textContent = "Bitte fülle Unternehmen, Ansprechperson und E-Mail-Adresse aus.";
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
