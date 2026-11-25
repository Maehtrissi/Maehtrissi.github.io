/*
 * Sponti – Platzanfrage (Warteliste) auf der Kursseite
 *
 * - Kurs ausgebucht, Buchungsschluss (2 h vor Beginn) noch nicht erreicht:
 *   Der Buchungsknopf wird zu «Platz anfragen» und öffnet ein kurzes Formular
 *   (RPC public.sponti_join_waitlist). Kostenlos und unverbindlich.
 * - Link aus der E-Mail «Ein Platz ist frei» (?platz=TOKEN): reservierter Platz,
 *   der Knopf führt direkt zur Buchung mit diesem Platz.
 * - Abmeldelink aus den E-Mails (?warteliste_abmelden=TOKEN): Anfrage löschen.
 * course-detail.js lässt den Knopf in Ruhe, sobald data-waitlist gesetzt ist.
 */
(()=>{
'use strict';
const URL_BASE='https://ehifskiigrfpxeiruyxr.supabase.co';
const KEY='sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SALE_LEAD_MS=2*60*60*1000;
const query=new URLSearchParams(location.search);
const courseId=query.get('id')||'';
if(!uuid.test(courseId)||query.get('demo')==='1')return;
const offerToken=uuid.test(query.get('platz')||'')?query.get('platz'):null;
const leaveToken=uuid.test(query.get('warteliste_abmelden')||'')?query.get('warteliste_abmelden'):null;
const fmt=d=>new Intl.DateTimeFormat('de-CH',{dateStyle:'full',timeStyle:'short',timeZone:'Europe/Zurich'}).format(new Date(d))+' Uhr';

const style=document.createElement('style');
style.textContent=`
.sponti-waitlist-box{margin:14px 0 0;padding:14px 16px;border:1px solid #d9e3da;border-radius:16px;background:#f5f7f0;color:#173e30;font:400 14px/1.6 "DM Sans",sans-serif}
.sponti-waitlist-box[data-state="warning"]{border-color:#efd3bd;background:#fbf3ec}
.sponti-waitlist-box strong{display:block;margin-bottom:2px}
.sponti-waitlist-form{display:grid;gap:10px;margin-top:12px}
.sponti-waitlist-form[hidden]{display:none}
.sponti-waitlist-form label{display:grid;gap:4px;font:600 13px "DM Sans",sans-serif;color:#314f42}
.sponti-waitlist-form input,.sponti-waitlist-form select{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cfdccf;border-radius:12px;background:#fff;font:400 15px "DM Sans",sans-serif;color:#19342d}
.sponti-waitlist-form .sponti-waitlist-terms{display:flex;gap:10px;align-items:flex-start;font-weight:400;line-height:1.5}
.sponti-waitlist-form .sponti-waitlist-terms input{width:auto;margin-top:4px}
.sponti-waitlist-form a{color:#173e30}
.sponti-waitlist-form button{padding:12px 18px;border:0;border-radius:999px;background:#173e30;color:#fff;font:700 15px "DM Sans",sans-serif;cursor:pointer}
.sponti-waitlist-form button[disabled]{opacity:.6;cursor:wait}
.sponti-waitlist-error{margin:0;color:#a33b22;font-size:13px}
`;
document.head.append(style);

async function rpc(fn,args){
 const r=await fetch(URL_BASE+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(15000)});
 const data=await r.json().catch(()=>null);
 if(!r.ok)throw Error((data&&data.message)||'Das hat leider nicht geklappt. Bitte versuche es erneut.');
 return data;
}
async function getCourse(){
 const params=new URLSearchParams({select:'id,seats,starts_at,price,payment_link,booking_url',id:'eq.'+courseId,limit:'1'});
 const r=await fetch(URL_BASE+'/rest/v1/courses?'+params,{headers:{apikey:KEY},signal:AbortSignal.timeout(15000)});
 if(!r.ok)return null;
 const rows=await r.json();
 return rows[0]||null;
}
function ready(){
 return new Promise(resolve=>{
  const start=Date.now();
  const tick=()=>{const shell=document.getElementById('detail-shell');if((shell&&!shell.hidden)||Date.now()-start>20000)return resolve();setTimeout(tick,150);};
  tick();
 });
}
function box(cta,title,text,state,key='main'){
 let el=document.querySelector('.sponti-waitlist-box[data-key="'+key+'"]');
 if(!el){el=document.createElement('div');el.className='sponti-waitlist-box';el.dataset.key=key;el.setAttribute('role','status');cta.insertAdjacentElement('afterend',el);}
 el.dataset.state=state||'info';
 el.replaceChildren();
 const strong=document.createElement('strong');strong.textContent=title;
 const p=document.createElement('span');p.textContent=text;
 el.append(strong,p);
 return el;
}
function cleanUrl(...keys){
 const u=new URL(location.href);keys.forEach(k=>u.searchParams.delete(k));
 history.replaceState(history.state,'',u.pathname+u.search+u.hash);
}
function bookingHref(course){
 if(/^https:\/\/[^\s]+$/.test(course.payment_link||'')){
  try{const u=new URL(course.payment_link);u.searchParams.set('client_reference_id',course.id);return u;}catch{}
 }
 return null;
}

function showOffer(cta,course,offer){
 cta.dataset.waitlist='offer';
 cta.classList.remove('is-disabled');
 cta.textContent='Reservierten Platz buchen →';
 const link=bookingHref(course);
 if(link){if(offer.email)link.searchParams.set('prefilled_email',offer.email);cta.href=link.href;}
 else cta.href='/buchung.html?id='+encodeURIComponent(course.id)+'&platz='+encodeURIComponent(offerToken);
 const n=Number(offer.quantity)||1;
 box(cta,(n===1?'1 Platz ist':n+' Plätze sind')+' für dich reserviert.',
  'Aus deiner Platzanfrage. Die Reservierung gilt bis '+fmt(offer.expires_at)+'.'+(link?' Bitte bezahle mit der E-Mail-Adresse aus deiner Anfrage.':''),'info');
}

function showRequest(cta,course){
 const closesAt=new Date(course.starts_at).getTime()-SALE_LEAD_MS;
 if(!(Date.now()<closesAt)||(course.booking_url||'')!=='')return;
 cta.dataset.waitlist='request';
 cta.classList.remove('is-disabled');
 cta.textContent='Platz anfragen →';
 cta.href='#platz-anfragen';
 const info=box(cta,'Dieser Kurs ist ausgebucht.','Frag kostenlos und unverbindlich einen Platz an. Wird einer frei, reservieren wir ihn für dich und schicken dir einen Buchungslink per E-Mail.','info');
 info.id='platz-anfragen';
 const form=document.createElement('form');
 form.className='sponti-waitlist-form';form.hidden=true;form.noValidate=false;
 form.innerHTML=`
  <label>Vor- und Nachname<input name="name" autocomplete="name" required minlength="2" maxlength="200"></label>
  <label>E-Mail-Adresse<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
  <label>Telefonnummer (optional)<input name="phone" type="tel" autocomplete="tel" maxlength="32"></label>
  <label>Anzahl Plätze<select name="quantity"></select></label>
  <label class="sponti-waitlist-terms"><input type="checkbox" name="terms" required><span>Ich akzeptiere die <a href="/agb#platzanfrage" target="_blank" rel="noopener">AGB</a> und habe die <a href="/datenschutz" target="_blank" rel="noopener">Datenschutzerklärung</a> zur Kenntnis genommen.</span></label>
  <p class="sponti-waitlist-error" role="alert" hidden></p>
  <button type="submit">Platz unverbindlich anfragen</button>`;
 const qty=form.elements.quantity;
 for(let i=1;i<=10;i++){const o=document.createElement('option');o.value=String(i);o.textContent=String(i);qty.append(o);}
 info.append(form);
 const open=()=>{form.hidden=false;form.elements.name.focus();};
 cta.addEventListener('click',e=>{if(cta.dataset.waitlist!=='request')return;e.preventDefault();open();info.scrollIntoView({behavior:'smooth',block:'center'});});
 document.querySelector('.mobile-booking-dock')?.remove();
 const error=form.querySelector('.sponti-waitlist-error');
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!form.reportValidity())return;
  const button=form.querySelector('button');button.disabled=true;error.hidden=true;
  try{
   const result=await rpc('sponti_join_waitlist',{p_course_id:course.id,p_name:form.elements.name.value.trim(),p_email:form.elements.email.value.trim(),p_phone:form.elements.phone.value.trim(),p_quantity:Number(qty.value),p_accept_terms:form.elements.terms.checked});
   box(cta,'Deine Platzanfrage ist eingegangen.',(result&&result.position?'Du bist auf Platz '+result.position+' der Warteliste. ':'')+'Sobald ein Platz frei wird, reservieren wir ihn für dich und schicken dir einen Buchungslink per E-Mail. Eine Bestätigung ist unterwegs.','info');
   cta.textContent='Platz angefragt ✓';cta.removeAttribute('href');cta.classList.add('is-disabled');cta.dataset.waitlist='done';
  }catch(err){error.textContent=err.message;error.hidden=false;button.disabled=false;}
 });
 const timer=setInterval(()=>{if(Date.now()>=closesAt&&cta.dataset.waitlist==='request'){clearInterval(timer);delete cta.dataset.waitlist;info.remove();cta.removeAttribute('href');cta.classList.add('is-disabled');cta.textContent='Ticketverkauf beendet';}},30000);
}

(async()=>{
 await ready();
 const cta=document.getElementById('detail-cta');
 if(!cta)return;
 const course=await getCourse().catch(()=>null);
 if(!course)return;
 if(leaveToken){
  cleanUrl('warteliste_abmelden');
  try{const r=await rpc('sponti_leave_waitlist',{p_token:leaveToken});box(cta,r&&r.ok?'Erledigt.':'Hinweis',(r&&r.message)||'Deine Platzanfrage wurde gelöscht.',r&&r.ok?'info':'warning','leave');}
  catch(err){box(cta,'Hinweis',err.message,'warning','leave');}
 }
 if(offerToken){
  let offer=null;
  try{offer=await rpc('sponti_waitlist_offer',{p_token:offerToken});}catch{}
  if(offer&&offer.valid&&offer.course_id===course.id){showOffer(cta,course,offer);return;}
  box(cta,'Reservierung abgelaufen','Der für dich reservierte Platz ist nicht mehr gültig. Falls wieder etwas frei wird, kannst du erneut anfragen.','warning');
 }
 if(Number(course.seats)<1)showRequest(cta,course);
})();
})();
