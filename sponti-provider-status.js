(()=>{
const box=document.querySelector('[data-account-status]');
if(!box)return;
const member=document.querySelector('[data-provider-member]');
const BASE='https://ehifskiigrfpxeiruyxr.supabase.co/rest/v1/rpc/provider_get_status';
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
 box.dataset.state=current;
 list.replaceChildren(...STATES.map(([name,text])=>{
  const li=document.createElement('li');
  if(name===current)li.className='is-current';
  const b=document.createElement('strong');b.textContent=name;
  const t=document.createElement('span');t.textContent=text;
  li.append(b,t);return li;
 }));
 box.hidden=false;
}
async function load(){
 if(loaded||(member&&member.hidden))return;
 const jwt=token();if(!jwt)return;
 loaded=true;
 try{
  const r=await fetch(BASE,{method:'POST',headers:{'content-type':'application/json',accept:'application/json',authorization:'Bearer '+jwt,apikey:KEY},body:'{}'});
  if(!r.ok){loaded=false;return;}
  const raw=(await r.text()).trim();
  let v=raw;
  try{const parsed=JSON.parse(raw);v=parsed;}catch(e){v=raw.replace(/^"|"$/g,'');}
  if(v&&typeof v==='object')v=v.provider_get_status||v.status||'';
  if(typeof v==='string'&&v&&v!=='null')render(v);else loaded=false;
 }catch(e){loaded=false;}
}
button.addEventListener('click',()=>{const open=box.classList.toggle('is-open');button.setAttribute('aria-expanded',String(open));});
document.addEventListener('click',e=>{if(!box.contains(e.target)){box.classList.remove('is-open');button.setAttribute('aria-expanded','false');}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){box.classList.remove('is-open');button.setAttribute('aria-expanded','false');}});
if(member)new MutationObserver(load).observe(member,{attributes:true,attributeFilter:['hidden']});
load();
let n=0;const t=setInterval(()=>{n++;if(loaded||n>30){clearInterval(t);return;}load();},1000);
})();
