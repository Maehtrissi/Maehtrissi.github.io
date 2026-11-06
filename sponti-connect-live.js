import {createClient} from "https://esm.sh/@supabase/supabase-js@2.117.2";
const supabase=createClient("https://ehifskiigrfpxeiruyxr.supabase.co","sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy",{auth:{storageKey:"sponti-provider-auth",persistSession:true,autoRefreshToken:true}});
const create=document.querySelector("[data-new-course]");
const editor=document.querySelector("[data-course-editor]");
const form=document.querySelector('[data-provider-form="course"]');
const courseView=create?.closest("[data-board-view]");
let permitted=false;
const panel=document.createElement("section");
panel.className="account-card";
panel.setAttribute("aria-label","Onboarding für Kursanbieter");
panel.innerHTML='<h2>Dein Sponti-Onboarding</h2><ol data-connect-checklist></ol><p data-connect-message role="status">Status wird geprüft.</p><button class="button button-primary" type="button" data-connect-start disabled>Stripe Connect verbinden</button>';
courseView?.prepend(panel);
const list=panel.querySelector("[data-connect-checklist]");
const message=panel.querySelector("[data-connect-message]");
const start=panel.querySelector("[data-connect-start]");
function gate(value){permitted=!!value;if(create){create.disabled=!permitted;create.setAttribute("aria-disabled",String(!permitted));}if(!permitted&&editor)editor.hidden=true;}
gate(false);
function showSteps(state){const labels=[["Anbieter registriert",state.registered],["CRM-Freigabe erhalten",state.crm_approved],["Stripe Connect verbunden",state.stripe_live_connected],["Stripe-Verifizierung abgeschlossen",state.stripe_live_ready],["Kursanlage freigeschaltet",state.can_create_courses]];list.replaceChildren(...labels.map(([label,done])=>{const li=document.createElement("li");li.textContent=(done?"Erledigt: ":"Offen: ")+label;return li;}));}
create?.addEventListener("click",e=>{if(!permitted){e.preventDefault();e.stopImmediatePropagation();message.textContent="Bitte zuerst CRM-Freigabe und Stripe-Onboarding abschliessen.";}},true);
form?.addEventListener("submit",e=>{if(!permitted){e.preventDefault();e.stopImmediatePropagation();message.textContent="Die Kursanlage ist noch nicht freigegeben.";gate(false);}},true);
async function refresh(){
 gate(false);start.disabled=true;
 const {data:{user}}=await supabase.auth.getUser();
 if(!user){showSteps({});message.textContent="Bitte melde dich als Kursanbieter an.";return;}
 const {data:connect,error:connectError}=await supabase.functions.invoke("sponti-connect-onboarding-live",{body:{action:"status"}});
 const {data:ready,error:readyError}=await supabase.rpc("provider_course_readiness");
 if(readyError){message.textContent="Der Onboardingstatus konnte nicht geprüft werden.";return;}
 showSteps(ready||{});
 const allowed=!!ready?.can_create_courses&&connect?.ready===true&&!connectError;
 gate(allowed);
 start.disabled=!ready?.crm_approved||allowed||connect?.live_enabled!==true||!!connectError;
 start.textContent=ready?.stripe_live_connected?"Stripe-Onboarding fortsetzen":"Stripe Connect verbinden";
 message.textContent=allowed?"Du kannst jetzt Kurse erstellen.":!ready?.crm_approved?"Bitte warte auf die Freigabe durch Sponti.":connect?.live_enabled===false?"Stripe Connect Live-Onboarding ist noch nicht aktiviert.":connectError?"Stripe-Status momentan nicht verfügbar.":"Bitte Stripe Connect abschliessen und verifizieren lassen.";
}
start.addEventListener("click",async()=>{start.disabled=true;const {data,error}=await supabase.functions.invoke("sponti-connect-onboarding-live",{body:{action:"onboard"}});
 if(error||!data?.onboarding_url){message.textContent="Stripe-Onboarding derzeit nicht verfügbar.";refresh();return;}
 const link=new URL(data.onboarding_url);
 if(link.protocol==="https:"&&link.hostname==="connect.stripe.com")location.assign(link.href);
 else {message.textContent="Ungültiger Stripe-Link.";refresh();}
});
supabase.auth.onAuthStateChange(()=>queueMicrotask(refresh));
refresh().catch(()=>{gate(false);message.textContent="Onboardingstatus nicht verfügbar.";});
