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
