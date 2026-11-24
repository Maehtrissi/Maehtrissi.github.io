/*
 * Sponti – Konto löschen (Anbieter- und Kundenkonto)
 *
 * Klick auf "Konto löschen" -> Rückfrage -> Löschanfrage wird in Supabase
 * gespeichert (RPC request_account_deletion) -> Abmelden -> Startseite.
 * Sponti sieht die Anfrage im CRM (Kursanbieter/Kunden -> Löschanfragen) und
 * löscht das Konto danach.
 */
(()=>{
'use strict';
const URL_BASE='https://ehifskiigrfpxeiruyxr.supabase.co';
const KEY='sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy';

function session(storageKey){
 try{const raw=localStorage.getItem(storageKey);const s=raw?JSON.parse(raw):null;return s&&s.access_token?s:null;}catch{return null;}
}

document.addEventListener('click',async e=>{
 const btn=e.target.closest('[data-delete-request]');
 if(!btn||btn.disabled)return;
 const provider=btn.dataset.deleteRequest==='Anbieterkonto';
 const label=provider?'Anbieterkonto':'Konto';
 const msg='Möchtest du dein '+label+' wirklich löschen?\n\n'+
  'Du wirst danach abgemeldet und Sponti löscht dein '+label+'.'+
  (provider?' Deine Kurse werden nicht mehr angezeigt.':'')+
  '\n\nDaten, die wir gesetzlich aufbewahren müssen (z. B. Buchungen und Zahlungen), bleiben so lange wie vorgeschrieben gespeichert.';
 if(!window.confirm(msg))return;
 const s=session(provider?'sponti-provider-auth':'sponti-customer-auth');
 if(!s){window.alert('Bitte melde dich zuerst an und versuche es dann erneut.');return;}
 btn.disabled=true;const text=btn.textContent;btn.textContent='Wird gesendet …';
 try{
  const r=await fetch(URL_BASE+'/rest/v1/rpc/request_account_deletion',{method:'POST',
   headers:{apikey:KEY,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},
   body:JSON.stringify({p_reason:''}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error('HTTP '+r.status);
 }catch(err){
  btn.disabled=false;btn.textContent=text;
  window.alert('Die Löschanfrage konnte gerade nicht gesendet werden. Bitte versuche es erneut oder schreibe an info@sponti-switzerland.ch.');
  return;
 }
 // Abmelden über den vorhandenen Abmelde-Knopf der Seite, danach Sitzung sicher entfernen.
 const logout=document.querySelector(provider?'[data-provider-logout]':'[data-account-logout]');
 try{logout?.click();}catch{}
 await new Promise(r=>setTimeout(r,600));
 try{localStorage.removeItem(provider?'sponti-provider-auth':'sponti-customer-auth');}catch{}
 window.alert('Deine Löschanfrage ist bei Sponti eingegangen. Du wurdest abgemeldet. Wir löschen dein '+label+' und melden uns per E-Mail, falls wir noch etwas brauchen.');
 location.href='/';
});
})();
