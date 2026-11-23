(()=>{
const form=document.querySelector('[data-billing-form]');
if(!form)return;
const BASE='https://ehifskiigrfpxeiruyxr.supabase.co/rest/v1/rpc/';
const KEY='sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy';
const msg=form.querySelector('[data-billing-msg]');
const member=document.querySelector('[data-provider-member]');
let loaded=false,saving=false;
function token(){
 try{const raw=localStorage.getItem('sponti-provider-auth');const x=raw?JSON.parse(raw):null;
  if(!x||!x.access_token)return '';if(x.expires_at&&x.expires_at*1000<Date.now()+5000)return '';return x.access_token;}catch(e){return '';}
}
async function rpc(name,body){
 const jwt=token();if(!jwt)throw new Error('Bitte melde dich neu an.');
 const r=await fetch(BASE+name,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+jwt,apikey:KEY},body:JSON.stringify(body||{})});
 const data=await r.json().catch(()=>null);
 if(!r.ok)throw new Error((data&&data.message)||'Fehler beim Speichern.');
 return data;
}
function say(text,bad){msg.textContent=text;msg.hidden=!text;msg.style.color=bad?'#a03a27':'#2f6b3f';}
async function load(){
 if(loaded||(member&&member.hidden)||!token())return;
 loaded=true;
 try{const d=await rpc('provider_get_billing',{})||{};
  for(const el of form.elements){if(el.name&&d[el.name]!=null)el.value=d[el.name];}
 }catch(e){loaded=false;}
}
form.addEventListener('submit',async ev=>{
 ev.preventDefault();if(saving)return;saving=true;say('');
 const p={};for(const el of form.elements){if(el.name)p[el.name]=String(el.value||'').trim();}
 try{await rpc('provider_save_billing',{p});say('Gespeichert. Danke!');}
 catch(e){say(e.message||'Speichern nicht möglich.',true);}
 saving=false;
});
if(member)new MutationObserver(load).observe(member,{attributes:true,attributeFilter:['hidden']});
load();
let n=0;const t=setInterval(()=>{n++;if(loaded||n>20){clearInterval(t);return;}load();},1000);
})();
