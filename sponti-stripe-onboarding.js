(()=>{
const member=document.querySelector('[data-provider-member]');
const banner=document.getElementById('sponti-stripe-banner');
const view=document.querySelector('[data-stripe-view]');
if(!member||!banner)return;
// Beim Livegang auf 'sponti-connect-onboarding-live' umstellen.
const FUNCTION_NAME='sponti-connect-onboarding-test';
const BASE='https://ehifskiigrfpxeiruyxr.supabase.co/functions/v1/';
const KEY='sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy';
const title=banner.querySelector('[data-stripe-title]');
const text=banner.querySelector('[data-stripe-text]');
const button=banner.querySelector('[data-stripe-start]');
const note=banner.querySelector('[data-stripe-note]');
const more=banner.querySelector('[data-stripe-more]');
const v={
 state:view&&view.querySelector('[data-stripe-state]'),
 text:view&&view.querySelector('[data-stripe-view-text]'),
 onboard:view&&view.querySelector('[data-stripe-onboard]'),
 dash:view&&view.querySelector('[data-stripe-dashboard]'),
 note:view&&view.querySelector('[data-stripe-view-note]')
};
let checked=false,busy=false;
function token(){
 try{
  const raw=localStorage.getItem('sponti-provider-auth');
  const session=raw?JSON.parse(raw):null;
  if(!session||!session.access_token)return '';
  if(session.expires_at&&session.expires_at*1000<Date.now()+5000)return '';
  return session.access_token;
 }catch(e){return '';}
}
async function call(action){
 const jwt=token();
 if(!jwt)return {status:0,data:{}};
 const response=await fetch(BASE+FUNCTION_NAME,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+jwt,apikey:KEY},body:JSON.stringify({action})});
 let data={};try{data=await response.json();}catch(e){}
 return {status:response.status,data};
}
function setNote(el,message){if(!el)return;el.textContent=message||'';el.hidden=!message;}
function render(kind){
 // kind: 'start' | 'review' | 'done' | 'locked'
 if(kind==='start'||kind==='review'){
  const started=kind==='review';
  title.textContent='Noch offen: Stripe-Konto einrichten';
  text.textContent=started
   ?'Du hast Stripe schon angefangen, aber es fehlen noch Angaben oder Stripe prüft noch. Mit dem Button machst du dort weiter.'
   :'Damit Kunden bei dir online bezahlen können und du dein Geld erhältst, richtest du einmal dein Konto bei Stripe ein. Das dauert wenige Minuten. Den Link bekommst du auch per E-Mail.';
  button.textContent=started?'Bei Stripe weitermachen':'Stripe jetzt einrichten';
  setNote(note,'');banner.hidden=false;
 }else banner.hidden=true;
 if(!view)return;
 const map={
  start:['Noch nicht eingerichtet','Richte dein Stripe-Konto einmal ein. Danach können Kunden bei dir bezahlen, und du erhältst deinen Anteil direkt auf dein Bankkonto.'],
  review:['Unvollständig','Bei Stripe fehlen noch Angaben, oder Stripe prüft sie noch. Mache dort weiter, wo du aufgehört hast.'],
  done:['Bereit','Dein Stripe-Konto ist eingerichtet. Im Stripe-Dashboard siehst du Auszahlungen, Zahlungen und deine Kontodaten.'],
  locked:['Noch nicht verfügbar','Das Stripe-Konto steht nach der Freischaltung durch Sponti zur Verfügung.']
 };
 const m=map[kind]||map.locked;
 v.state.textContent=m[0];v.state.setAttribute('data-kind',kind);v.text.textContent=m[1];
 v.onboard.hidden=!(kind==='start'||kind==='review');
 v.onboard.textContent=kind==='review'?'Onboarding fortsetzen':'Onboarding starten';
 v.dash.hidden=kind!=='done';
}
function isComplete(d){
 if(d.ready===true)return true;
 return d.onboarding_complete===true&&d.transfers_enabled===true&&!(d.requirements_due>0);
}
async function check(){
 if(checked||member.hidden)return;
 if(!token())return;
 checked=true;
 try{
  const {status,data}=await call('status');
  if(status===403){checked=false;render('locked');return;}
  if(status!==200){checked=false;banner.hidden=true;return;}
  if(data.live_enabled===false){banner.hidden=true;return;}
  if(isComplete(data)){render('done');return;}
  render((data.details_submitted===true||data.onboarding_complete===true)?'review':'start');
 }catch(e){checked=false;banner.hidden=true;}
}
async function startOnboarding(btn,out){
 if(busy)return;busy=true;btn.disabled=true;setNote(out,'');
 const label=btn.textContent;btn.textContent='Link wird erstellt …';
 try{
  const {status,data}=await call('onboard');
  if(status===200&&typeof data.onboarding_url==='string'&&data.onboarding_url.startsWith('https://connect.stripe.com/')){
   window.location.assign(data.onboarding_url);return;
  }
  setNote(out,data.error||'Der Link konnte nicht erstellt werden. Bitte lade die Seite neu und versuche es nochmals.');
 }catch(e){setNote(out,'Keine Verbindung zu Stripe. Bitte versuche es gleich nochmals.');}
 busy=false;btn.disabled=false;btn.textContent=label;
}
async function openDashboard(){
 if(busy||!v.dash)return;busy=true;v.dash.disabled=true;setNote(v.note,'');
 const label=v.dash.textContent;v.dash.textContent='Dashboard wird geöffnet …';
 const tab=window.open('','_blank');
 try{
  const {status,data}=await call('dashboard');
  if(status===200&&typeof data.dashboard_url==='string'&&/^https:\/\/(connect|dashboard)\.stripe\.com\//.test(data.dashboard_url)){
   if(tab){tab.location.href=data.dashboard_url;tab.opener=null;}else window.location.assign(data.dashboard_url);
   busy=false;v.dash.disabled=false;v.dash.textContent=label;return;
  }
  if(tab)tab.close();
  setNote(v.note,data.error||'Das Dashboard konnte nicht geöffnet werden.');
 }catch(e){if(tab)tab.close();setNote(v.note,'Keine Verbindung zu Stripe. Bitte versuche es gleich nochmals.');}
 busy=false;v.dash.disabled=false;v.dash.textContent=label;
}
button.addEventListener('click',()=>startOnboarding(button,note));
if(v.onboard)v.onboard.addEventListener('click',()=>startOnboarding(v.onboard,v.note));
if(v.dash)v.dash.addEventListener('click',openDashboard);
if(more)more.addEventListener('click',()=>{const tab=document.querySelector('[data-board-tab="stripe"]');if(tab)tab.click();});
new MutationObserver(()=>check()).observe(member,{attributes:true,attributeFilter:['hidden']});
check();
// Erneut prüfen, z. B. nachdem Sponti den Anbieter freigeschaltet hat.
let tries=0;const timer=setInterval(()=>{tries++;if(tries>60){clearInterval(timer);return;}if(!checked)check();},5000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!checked)check();});
window.addEventListener('focus',()=>{if(!checked)check();});
})();
