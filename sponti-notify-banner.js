/* Hinweis im Kundenboard: Benachrichtigungen einstellen.
   Wird angezeigt, solange für das Konto noch keine Benachrichtigungs-Einstellungen
   gespeichert wurden (kein Eintrag in customer_preferences). Nach dem Speichern verschwindet er. */
(()=>{
const member=document.querySelector('[data-account-member]');
const banner=document.getElementById('sponti-notify-banner');
if(!member||!banner)return;
const URL_BASE='https://ehifskiigrfpxeiruyxr.supabase.co/rest/v1/';
const KEY='sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy';
const prompt=member.querySelector('[data-personalize-prompt]');
let state='unknown',seq=0; // unknown | missing | done

function session(){
 try{
  const raw=localStorage.getItem('sponti-customer-auth');
  const s=raw?JSON.parse(raw):null;
  if(!s||!s.access_token||!s.user||!s.user.id)return null;
  if(s.expires_at&&s.expires_at*1000<Date.now()+5000)return null;
  return s;
 }catch(e){return null;}
}
function render(){
 // Nicht doppelt anzeigen, solange die Willkommens-Frage zum Personalisieren sichtbar ist.
 const promptVisible=prompt&&!prompt.hidden;
 banner.hidden=member.hidden||state!=='missing'||promptVisible;
}
async function check(attempt=0){
 const id=++seq;
 const s=session();
 if(!s){
  // Token wird evtl. gerade erneuert – kurz später nochmals versuchen.
  if(attempt<4&&!member.hidden)setTimeout(()=>{if(id===seq)check(attempt+1);},1200);
  return;
 }
 try{
  const r=await fetch(URL_BASE+'customer_preferences?select=user_id&user_id=eq.'+encodeURIComponent(s.user.id)+'&limit=1',{headers:{apikey:KEY,authorization:'Bearer '+s.access_token}});
  if(id!==seq)return;
  if(!r.ok)return; // Im Zweifel keinen Hinweis zeigen.
  const rows=await r.json();
  state=Array.isArray(rows)&&rows.length?'done':'missing';
  render();
 }catch(e){}
}
banner.querySelector('[data-notify-open]')?.addEventListener('click',()=>{
 member.querySelector('[data-cboard-tab="preferences"]')?.click();
 const card=member.querySelector('[data-cboard-view="preferences"]');
 card?.scrollIntoView({behavior:'smooth',block:'start'});
});
// Nach erfolgreichem Speichern sofort ausblenden.
const status=member.querySelector('[data-preferences-status]');
if(status)new MutationObserver(()=>{if(/gespeichert/i.test(status.textContent||'')){state='done';render();}}).observe(status,{childList:true,characterData:true,subtree:true});
// Bei An-/Abmeldung neu prüfen.
new MutationObserver(()=>{if(member.hidden){state='unknown';seq++;render();}else check();}).observe(member,{attributes:true,attributeFilter:['hidden']});
if(prompt)new MutationObserver(render).observe(prompt,{attributes:true,attributeFilter:['hidden']});
window.addEventListener('storage',e=>{if(e.key==='sponti-customer-auth'&&!member.hidden)check();});
if(!member.hidden)check();
})();
