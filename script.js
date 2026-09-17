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
form.addEventListener("submit", (event) => {
  event.preventDefault();
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

