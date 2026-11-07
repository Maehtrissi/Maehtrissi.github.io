// Sponti Stripe Connect sandbox: only shown to authenticated provider accounts.
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.117.2";
const sb=createClient("https://ehifskiigrfpxeiruyxr.supabase.co","sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy",{auth:{storageKey:"sponti-provider-auth",persistSession:true,autoRefreshToken:true}});
const panel=document.querySelector("#sponti-connect-sandbox");
const status=panel?.querySelector("[data-connect-status]");
const button=panel?.querySelector("[data-connect-action]");
const api="https://ehifskiigrfpxeiruyxr.supabase.co/functions/v1/sponti-connect-onboarding-test";
async function request(action){
 const {data:{session},error}=await sb.auth.getSession();if(error||!session?.access_token)throw Error("Bitte als Kursanbieter anmelden.");
 const res=await fetch(api,{method:"POST",headers:{"authorization":"Bearer "+session.access_token,"apikey":"sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy","content-type":"application/json"},body:JSON.stringify({action})});
 const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||"Stripe Connect derzeit nicht verfügbar");return data;
}
async function refresh(){
 if(!panel)return;
 try{
  const {data:{user}}=await sb.auth.getUser();
  if(!user){panel.hidden=true;return;}
  const data=await request("status");panel.hidden=false;
  
  if(data.connected){
   status.textContent=data.transfers_enabled&&data.onboarding_complete?"Testkonto verbunden und verifiziert (Sandbox).":data.onboarding_complete?"Angaben übermittelt; Stripe prüft die Voraussetzungen.":"Stripe-Testkonto erstellt. Bitte Registrierung bei Stripe abschliessen.";
   button.textContent=data.transfers_enabled&&data.onboarding_complete?"Angaben bei Stripe prüfen":"Stripe Connect Registrierung fortsetzen";
  }else{status.textContent="Noch kein Stripe-Testkonto verbunden.";button.textContent="Stripe Connect Testkonto verbinden";}
 }catch(e){if(e.message.includes("Kein verifiziertes")){panel.hidden=true;return;}panel.hidden=false;status.textContent=e.message||"Status konnte nicht geladen werden.";}
}
if(panel&&button){
 button.addEventListener("click",async()=>{button.disabled=true;status.textContent="Sicherer Stripe-Link wird erstellt …";try{
  const data=await request("onboard");const url=new URL(data.onboarding_url);
  if(url.protocol!=="https:"||url.hostname!=="connect.stripe.com")throw Error("Ungültige Stripe-Adresse.");
  window.location.assign(url.href);
 }catch(e){status.textContent=e.message||"Verbindung nicht verfügbar.";button.disabled=false;}});
 sb.auth.onAuthStateChange(()=>{setTimeout(refresh,0)});
 refresh();
}
