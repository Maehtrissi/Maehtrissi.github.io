(function(){
'use strict';
const POLICY='commission-tier-2026-11-13';
const panel=document.querySelector('[data-commission-consent-panel]');
if(!panel)return;
const status=panel.querySelector('[data-commission-consent-status]');
const checkbox=panel.querySelector('[data-commission-consent-check]');
const button=panel.querySelector('[data-commission-consent-submit]');
const detail=panel.querySelector('[data-commission-consent-date]');
let busy=false, client=null;
const fmt=iso=>new Intl.DateTimeFormat('de-CH',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Zurich'}).format(new Date(iso));
function setMessage(message,error=false){status.textContent=message;status.style.color=error?'#a3342e':'#234b38'}
function reset(){checkbox.checked=false;checkbox.disabled=false;button.disabled=true;detail.textContent='';setMessage('Bitte melde dich als Kursanbieter an, um die Zustimmung zu verwalten.')}
async function refresh(){
 if(!client)return;
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user){reset();return}
 const {data,error}=await client.rpc('sponti_provider_commission_consent_status');
 if(error){setMessage('Zustimmungsstatus konnte nicht geladen werden.',true);button.disabled=true;return}
 const entry=Array.isArray(data)?data[0]:data;
 if(entry?.consented){checkbox.checked=true;checkbox.disabled=true;button.disabled=true;setMessage('Zustimmung zur geplanten Provisionsstaffel dokumentiert.');detail.textContent='Erfasst am '+fmt(entry.consented_at)+'. Die neue Staffel ist noch nicht für Buchungen aktiviert.'}
 else{checkbox.disabled=false;checkbox.checked=false;button.disabled=true;detail.textContent='';setMessage('Noch keine Zustimmung zu dieser neuen Staffel erfasst.')}
}
checkbox.addEventListener('change',()=>{button.disabled=!checkbox.checked||busy});
button.addEventListener('click',async()=>{
 if(busy||!checkbox.checked||!client)return;
 busy=true;button.disabled=true;checkbox.disabled=true;setMessage('Zustimmung wird gespeichert …');
 try{const {data,error}=await client.rpc('sponti_provider_accept_commission_terms',{p_confirm:true,p_policy_version:POLICY});if(error)throw error;if(!data)throw Error('Keine Bestätigung erhalten');await refresh()}
 catch(e){checkbox.disabled=false;button.disabled=!checkbox.checked;setMessage('Speichern fehlgeschlagen. Bitte erneut versuchen oder Sponti kontaktieren.',true)}
 finally{busy=false}
});
function init(){client=window.SpontiProviderSupabase;if(!client)return;client.auth.onAuthStateChange(()=>{setTimeout(refresh,0)});refresh()}
if(window.SpontiProviderSupabase)init();else window.addEventListener('sponti-provider-client-ready',init,{once:true});
})();
