// Self-service recovery when an authenticated provider login no longer has a provider profile.
// New applications always remain pending until an administrator approves them in the CRM.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.2";

const supabase = createClient(
  "https://ehifskiigrfpxeiruyxr.supabase.co",
  "sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy",
  { auth: { storageKey: "sponti-provider-auth", persistSession: true, autoRefreshToken: true } }
);
const box = document.querySelector("[data-provider-recovery]");
const form = box?.querySelector("[data-provider-recovery-form]");
const info = box?.querySelector("[data-recovery-message]");
const emailLabel = box?.querySelector("[data-recovery-email]");
const newAccount = box?.querySelector("[data-provider-new-account]");
let currentUser = null;
let checking = false;

function setMessage(message, error = false) {
  if (!info) return;
  info.textContent = message;
  info.setAttribute("role", error ? "alert" : "status");
}
function prefill(account) {
  if (!account || !form) return;
  const keys = { company:"company", contact:"contact", phone:"phone", location:"location", category:"category", offer_type:"offer_type" };
  for (const [field, source] of Object.entries(keys)) {
    if (account[source] && form.elements[field] && !form.elements[field].value)
      form.elements[field].value = account[source];
  }
}
async function refresh() {
  if (!box || checking) return;
  checking = true;
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) { currentUser = null; box.hidden = true; return; }
    currentUser = user;
    const { data: existing, error: profileError } = await supabase.from("provider_profiles")
      .select("user_id").eq("user_id", user.id).maybeSingle();
    if (profileError) throw profileError;
    if (existing) { box.hidden = true; return; }
    box.hidden = false;
    emailLabel.textContent = user.email || "deinem bestehenden Login";
    // This RPC only links an existing CRM record with the same verified login email.
    // Without a CRM record it returns saved=false; no new applicant is created on page load.
    const { data: account, error: accountError } = await supabase.rpc("provider_account");
    if (accountError) {
      setMessage("Dein bestehendes Konto konnte nicht automatisch zugeordnet werden. Falls dein CRM-Eintrag gelöscht wurde, kannst du das Profil unten erneut einrichten. Bei einer doppelten Zuordnung kontaktiere Sponti.", true);
    } else if (account?.saved) {
      prefill(account);
      setMessage("Dein bestehender Login ist erkannt. Ergänze die Angaben, um dein Anbieterprofil wieder einzurichten.");
    } else {
      setMessage("Dein Login besteht noch, aber das Anbieterprofil fehlt. Erstelle hier eine neue Anbieter-Anfrage mit diesem Login; Sponti prüft sie erneut.");
    }
  } catch (error) {
    box.hidden = false;
    setMessage("Der Profilstatus konnte nicht geprüft werden. Bitte melde dich erneut an oder kontaktiere Sponti.", true);
  } finally { checking = false; }
}
form?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!form.reportValidity() || !currentUser) return;
  const save = form.querySelector("[type=submit]");
  save.disabled = true;
  setMessage("Dein Anbieterprofil wird eingerichtet …");
  try {
    const fd = new FormData(form);
    const company = String(fd.get("company") || "").trim();
    const contact = String(fd.get("contact") || "").trim();
    const location = String(fd.get("location") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const category = String(fd.get("category") || "").trim();
    const offer_type = String(fd.get("offer_type") || "").trim();
    const { data: account, error: accountError } = await supabase.rpc("provider_account", {
      profile: { company, contact, location, phone, category, offer_type,
        description: "", public_location: location, public_enabled: false }
    });
    if (accountError) throw accountError;
    if (!account?.saved) throw new Error("Das Anbieterprofil konnte nicht im CRM zugeordnet werden.");
    const { data: existing, error: readError } = await supabase.from("provider_profiles")
      .select("user_id").eq("user_id", currentUser.id).maybeSingle();
    if (readError) throw readError;
    if (!existing) {
      const { error: insertError } = await supabase.from("provider_profiles").insert({
        user_id: currentUser.id, company, contact_name: contact, location, phone, category
      });
      if (insertError) throw insertError;
    }
    setMessage("Dein Profil wurde eingerichtet. Die Freigabe durch Sponti und Stripe Connect sind weiterhin erforderlich.");
    window.location.replace("/anbieter.html?profil=wiederhergestellt");
  } catch (error) {
    setMessage(error?.message || "Das Profil konnte nicht erstellt werden. Bitte versuche es erneut.", true);
  } finally { save.disabled = false; }
});
newAccount?.addEventListener("click", async () => {
  newAccount.disabled = true;
  try {
    // A separate login requires a different email; do not silently delete an existing account.
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    window.location.assign("/anbieter.html?mode=register");
  } catch (error) {
    newAccount.disabled = false;
    setMessage("Abmelden ist fehlgeschlagen. Bitte versuche es erneut.", true);
  }
});
supabase.auth.onAuthStateChange(() => { queueMicrotask(() => refresh()); });
refresh();
