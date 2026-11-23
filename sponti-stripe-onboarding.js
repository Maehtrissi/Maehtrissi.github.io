(()=>{
const member=document.querySelector('[data-provider-member]');
const banner=document.getElementById('sponti-stripe-banner');
if(!member||!banner)return;
// Beim Livegang auf 'sponti-connect-onboarding-live' umstellen.
const FUNCTION_NAME='sponti-connect-onboarding-test';
const BASE='https://ehifskiigrfpxeiruyxr.supabase.co/functions/v1/';
const KEY='sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy';
const title=banner.querySelector('[data-stripe-title]');
const text=banner.querySelector('[data-stripe-text]');
const button=banner.querySelector('[data-stripe-start]');
const note=banner.querySelector('[data-stripe-note]');
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
function show(kind){
 if(kind==='hidden'){banner.hidden=true;return;}
 const started=kind==='review';
 title.textContent=started?'Stripe prüft deine Angaben':'Schliesse noch dein Stripe-Konto ab';
 text.textContent=started
  ?'Du hast Stripe schon ausgefüllt, aber es fehlen noch Angaben oder Stripe prüft noch. Mit dem Button machst du dort weiter.'
  :'Damit Kunden bei dir online bezahlen können und du dein Geld erhältst, richtest du einmal dein Konto bei Stripe ein. Das dauert wenige Minuten. Den Link bekommst du auch per E-Mail.';
 button.textContent=started?'Bei Stripe weitermachen':'Stripe jetzt einrichten';
 note.hidden=true;
 banner.hidden=false;
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
  if(status!==200){checked=false;show('hidden');return;}
  if(data.live_enabled===false){show('hidden');return;}
  if(isComplete(data)){show('hidden');return;}
  const started=(data.details_submitted===true)||(data.onboarding_complete===true);
  show(started?'review':'start');
 }catch(e){checked=false;show('hidden');}
}
button.addEventListener('click',async()=>{
 if(busy)return;busy=true;button.disabled=true;note.hidden=true;
 const label=button.textContent;button.textContent='Link wird erstellt …';
 try{
  const {status,data}=await call('onboard');
  if(status===200&&typeof data.onboarding_url==='string'&&data.onboarding_url.startsWith('https://connect.stripe.com/')){
   window.location.assign(data.onboarding_url);return;
  }
  note.textContent=data.error||'Der Link konnte nicht erstellt werden. Bitte lade die Seite neu und versuche es nochmals.';
  note.hidden=false;
 }catch(e){
  note.textContent='Keine Verbindung zu Stripe. Bitte versuche es gleich nochmals.';note.hidden=false;
 }
 busy=false;button.disabled=false;button.textContent=label;
});
new MutationObserver(()=>check()).observe(member,{attributes:true,attributeFilter:['hidden']});
check();
// Falls die Anmeldung erst kurz nach dem Laden bereit ist.
// Erneut prüfen, z. B. nachdem Sponti den Anbieter freigeschaltet hat.
let tries=0;const timer=setInterval(()=>{tries++;if(tries>60){clearInterval(timer);return;}if(!checked)check();},5000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!checked)check();});
window.addEventListener('focus',()=>{if(!checked)check();});
})();
