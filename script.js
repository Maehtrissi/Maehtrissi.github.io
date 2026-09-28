const modal = document.querySelector("#booking-modal");
const openButtons = document.querySelectorAll("[data-open-booking]");
const closeButton = document.querySelector("[data-close-booking]");
const form = document.querySelector("#demo-form");
const success = document.querySelector("#form-success");

function openModal() {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  modal.querySelector("input").focus();
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

openButtons.forEach((button) => button.addEventListener("click", openModal));
closeButton.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
});
const SUPABASE_URL = "https://ehifskiigrfpxeiruyxr.supabase.co";
const SUPABASE_KEY = "sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy";

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const data = new FormData(form);

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
        body: JSON.stringify({
          Name: data.get("name"),
          Email: data.get("email"),
          Interest: data.get("business")
        })
      }
    );

    if (!response.ok) {
  throw new Error("Fehler beim Speichern");
}

    form.hidden = true;
    success.hidden = false;

  } catch (error) {
    console.error(error);
    alert("Fehler beim Speichern");
  }
});

const partnerForm = document.querySelector("#partner-form");
const partnerSuccess = document.querySelector("#partner-success");
if (partnerForm) {
  partnerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    partnerForm.querySelectorAll("input, select, textarea, button").forEach((el) => (el.hidden = true));
    partnerSuccess.hidden = false;
  });
}

const locationCarousel = document.querySelector("[data-location-carousel]");

if (locationCarousel) {
  const viewport = locationCarousel.querySelector("[data-location-viewport]");
  const cards = [...locationCarousel.querySelectorAll("[data-location-card]")];
  const previousButton = locationCarousel.querySelector("[data-location-previous]");
  const nextButton = locationCarousel.querySelector("[data-location-next]");
  const status = locationCarousel.querySelector("[data-location-status]");
  let activeIndex = 0;
  let scrollTimer;

  const setActiveCard = (index) => {
    activeIndex = (index + cards.length) % cards.length;
    cards.forEach((card, cardIndex) => {
      const isActive = cardIndex === activeIndex;
      card.classList.toggle("is-active", isActive);
      card.setAttribute("aria-current", isActive ? "true" : "false");
    });

    const city = cards[activeIndex].querySelector("strong").textContent;
    status.textContent = `${city}, ${activeIndex + 1} von ${cards.length}`;
  };

  const scrollToCard = (index, focusViewport = false) => {
    setActiveCard(index);
    const card = cards[activeIndex];
    viewport.scrollTo({
      left: card.offsetLeft - (viewport.clientWidth - card.clientWidth) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
    if (focusViewport) viewport.focus({ preventScroll: true });
  };

  const syncActiveCard = () => {
    const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
    const closestIndex = cards.reduce((closest, card, index) => {
      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const closestCenter = cards[closest].offsetLeft + cards[closest].clientWidth / 2;
      return Math.abs(cardCenter - viewportCenter) < Math.abs(closestCenter - viewportCenter) ? index : closest;
    }, 0);
    setActiveCard(closestIndex);
  };

  previousButton.addEventListener("click", () => scrollToCard(activeIndex - 1, true));
  nextButton.addEventListener("click", () => scrollToCard(activeIndex + 1, true));
  viewport.addEventListener("scroll", () => {
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(syncActiveCard, 100);
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

  setActiveCard(0);
  requestAnimationFrame(() => scrollToCard(0));
}
