(()=>{
const box=document.querySelector('[data-account-status]');
if(!box)return;
const member=document.querySelector('[data-provider-member]');
const BASE='https://ehifskiigrfpxeiruyxr.supabase.co/rest/v1/rpc/provider_get_status_json';
const KEY='sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy';
const STATES=[
 ['Neu','Deine Anmeldung ist eingegangen. Sponti prüft sie.'],
 ['Kontaktiert','Sponti hat sich bei dir gemeldet.'],
 ['Gespräch','Wir klären gemeinsam die Zusammenarbeit.'],
 ['Partner','Du bist freigeschaltet: Kurse erstellen und Stripe einrichten.'],
 ['Live','Alles ist bereit. Deine Kurse sind buchbar und bezahlbar.'],
 ['Abgelehnt','Eine Zusammenarbeit ist zurzeit nicht möglich.']
];
const label=box.querySelector('[data-status-label]');
const list=box.querySelector('[data-status-list]');
const button=box.querySelector('[data-status-button]');
let loaded=false;
function token(){
 try{const raw=localStorage.getItem('sponti-provider-auth');const x=raw?JSON.parse(raw):null;
  if(!x||!x.access_token)return '';if(x.expires_at&&x.expires_at*1000<Date.now()+5000)return '';return x.access_token;}catch(e){return '';}
}
function render(current){
 label.textContent=current;
 box.setAttribute('data-state',current);
 while(list.firstChild)list.removeChild(list.firstChild);
 for(const item of STATES){
  const li=document.createElement('li');
  if(item[0]===current)li.className='is-current';
  const b=document.createElement('strong');b.textContent=item[0];
  const t=document.createElement('span');t.textContent=item[1];
  li.appendChild(b);li.appendChild(t);list.appendChild(li);
 }
 box.removeAttribute('hidden');
}
let fails=0;
function diag(reason){
 fails++;
 if(fails>=3){label.textContent='nicht ladbar ('+reason+')';box.removeAttribute('hidden');}
}
async function load(){
 if(loaded||(member&&member.hidden))return;
 const jwt=token();if(!jwt){diag('keine Anmeldung');return;}
 loaded=true;
 try{
  const r=await fetch(BASE,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+jwt,apikey:KEY},body:'{}'});
  const raw=(await r.text()).trim();
  if(!r.ok){loaded=false;diag('HTTP '+r.status+' '+raw.slice(0,60));return;}
  let v=null;
  try{v=JSON.parse(raw);}catch(e){v=raw;}
  if(v&&typeof v==='object')v=v.status;
  if(typeof v==='string'&&v&&v!=='null'){fails=0;render(v);}
  else{loaded=false;diag('Antwort '+raw.slice(0,60));}
 }catch(e){loaded=false;diag('Fehler '+(e&&e.message));}
}
button.addEventListener('click',()=>{const open=box.classList.toggle('is-open');button.setAttribute('aria-expanded',String(open));});
document.addEventListener('click',e=>{if(!box.contains(e.target)){box.classList.remove('is-open');button.setAttribute('aria-expanded','false');}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){box.classList.remove('is-open');button.setAttribute('aria-expanded','false');}});
if(member)new MutationObserver(load).observe(member,{attributes:true,attributeFilter:['hidden']});
load();
let n=0;const t=setInterval(()=>{n++;if(loaded||n>30){clearInterval(t);return;}load();},1000);
})();
