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
const SPONTI_SIGNUP_ENDPOINT = "https://script.google.com/macros/s/AKfycbw3Z-8DkG9I3GPxeCyqOrwIVMRyE5tcZFDEHxhSJgdLOqgue-K3JmKwTPM8X4g8ahI5/exec";

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  fetch(SPONTI_SIGNUP_ENDPOINT, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({
      name: data.get("name"),
      email: data.get("email"),
      business: data.get("business"),
      consent: data.get("consent") ? "Ja" : "Nein",
    }),
  }).catch(() => {});
  form.hidden = true;
  success.hidden = false;
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

