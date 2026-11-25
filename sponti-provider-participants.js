/*
 * Sponti – Teilnehmerliste im Anbieterboard ("Meine Kurse")
 *
 * Zeigt pro Termin, wie viele Plätze gebucht sind, und auf Klick die
 * Teilnehmer (Name, Plätze, Telefon, E-Mail) mit Druck- und CSV-Export.
 * Zusätzlich: "Termin absagen" für veröffentlichte Termine. Absagen = Kurs
 * deaktivieren; die Datenbank verschickt dann automatisch die Absage-E-Mail an
 * alle Gebuchten (customer_course_change_email_events). Deaktivieren/Löschen
 * von Terminen mit Buchungen fragt vorher nach.
 * Daten kommen aus der RPC public.provider_course_participants(), die nur
 * bestätigte Buchungen der eigenen Kurse zurückgibt.
 * anbieter-account.js stellt den Supabase-Client als window.SpontiProviderDb
 * bereit und setzt data-course-id auf jedem Kurs-Eintrag.
 */
(()=>{
'use strict';
const list=document.querySelector('[data-course-list]');
if(!list)return;

const style=document.createElement('style');
style.textContent=`
.sponti-participants-count{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:4px 10px;border-radius:999px;background:#eef3ea;color:#15574e;font:600 12px "DM Sans",sans-serif}
.sponti-waitlist-count{background:#fbf0e6;color:#9a5530;margin-left:6px}
.sponti-participants-count.is-empty{background:#f3f3ef;color:#6b776f}
.provider-course-item:has(.sponti-participants-panel){flex-wrap:wrap}
.sponti-participants-panel{grid-column:1/-1;flex:1 1 100%;width:100%;box-sizing:border-box;margin-top:14px;padding:16px 18px;border:1px solid #dbe6db;border-radius:16px;background:#f8faf5}
.sponti-participants-panel[hidden]{display:none}
.sponti-participants-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
.sponti-participants-head h4{margin:0;font:700 15px "DM Sans",sans-serif;color:#173e30}
.sponti-participants-tools{display:flex;gap:8px;flex-wrap:wrap}
.sponti-participants-tools button{padding:7px 13px;border:1px solid #cfdccf;border-radius:999px;background:#fff;color:#15574e;font:600 12px "DM Sans",sans-serif;cursor:pointer}
.sponti-participants-tools button:hover{background:#eef3ea}
.sponti-participants-table{width:100%;border-collapse:collapse;font:400 13px "DM Sans",sans-serif;color:#19342d}
.sponti-participants-table th{text-align:left;font-weight:600;font-size:12px;color:#5f7067;padding:6px 8px;border-bottom:1px solid #dbe6db}
.sponti-participants-table td{padding:8px;border-bottom:1px solid #e7eee5;vertical-align:top;word-break:break-word}
.sponti-participants-table tr:last-child td{border-bottom:0}
.sponti-participants-table a{color:#15574e}
.sponti-cancel-course{color:#a33b22!important}
.sponti-participants-note{margin:10px 0 0;font-size:12px;color:#6b776f}
@media(max-width:640px){.sponti-participants-table thead{display:none}.sponti-participants-table tr{display:block;padding:8px 0;border-bottom:1px solid #e7eee5}.sponti-participants-table td{display:block;padding:2px 0;border:0}.sponti-participants-table td[data-label]::before{content:attr(data-label)": ";color:#6b776f}}
`;
document.head.appendChild(style);

let byCourse=new Map(),waitlist=new Map(),loading=null,available=true;

async function load(){
 const db=window.SpontiProviderDb;
 if(!db)return;
 const {data,error}=await db.rpc('provider_course_participants');
 if(error){available=false;console.warn('Sponti Teilnehmerliste nicht verfügbar:',error.message);return;}
 available=true;byCourse=new Map();
 const wl=await db.rpc('provider_course_waitlist_counts');
 waitlist=new Map();
 if(!wl.error)for(const row of wl.data||[])waitlist.set(String(row.course_id),row);
 for(const row of data||[]){
  const key=String(row.course_id);
  if(!byCourse.has(key))byCourse.set(key,[]);
  byCourse.get(key).push(row);
 }
}

function seatsText(n){return n===1?'1 Platz':n+' Plätze';}

function link(href,text){const a=document.createElement('a');a.href=href;a.textContent=text;return a;}

function courseInfo(item){
 return {title:item.querySelector('h3')?.textContent||'Kurs',when:(item.querySelector('p')?.textContent||'').split(' · ')[0]};
}

function printList(item,rows){
 const {title,when}=courseInfo(item);
 const w=window.open('','_blank');
 if(!w)return;
 const d=w.document;
 d.title='Teilnehmerliste – '+title;
 const css=d.createElement('style');
 css.textContent='body{font:14px/1.45 Arial,sans-serif;color:#111;margin:32px}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 18px;color:#444}table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:7px 9px;text-align:left}th{background:#f1f1f1}td.check{width:60px}';
 d.head.appendChild(css);
 const h=d.createElement('h1');h.textContent=title;
 const p=d.createElement('p');p.textContent=when+' · '+seatsText(rows.reduce((s,r)=>s+(r.quantity||0),0))+' gebucht';
 const t=d.createElement('table');
 t.innerHTML='<thead><tr><th>Name</th><th>Plätze</th><th>Telefon</th><th>E-Mail</th><th>Da</th></tr></thead><tbody></tbody>';
 for(const r of rows){
  const tr=d.createElement('tr');
  for(const v of [r.guest_name||'–',String(r.quantity||1),r.guest_phone||'–',r.guest_email||'–','']){const td=d.createElement('td');td.textContent=v;tr.append(td);}
  tr.lastChild.className='check';
  t.tBodies[0].append(tr);
 }
 d.body.append(h,p,t);
 w.focus();
 setTimeout(()=>w.print(),250);
}

function downloadCsv(item,rows){
 const {title,when}=courseInfo(item);
 const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const lines=[['Kurs','Termin','Name','Plätze','Telefon','E-Mail','Gebucht am'].map(esc).join(';')];
 const fmt=new Intl.DateTimeFormat('de-CH',{dateStyle:'short',timeStyle:'short'});
 for(const r of rows)lines.push([title,when,r.guest_name,r.quantity,r.guest_phone,r.guest_email,r.booked_at?fmt.format(new Date(r.booked_at)):''].map(esc).join(';'));
 const blob=new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
 const a=document.createElement('a');
 a.href=URL.createObjectURL(blob);
 a.download=('Teilnehmer '+title+' '+when).replace(/[\\/:*?"<>|]+/g,'-').slice(0,120)+'.csv';
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function buildPanel(item,rows){
 const panel=document.createElement('div');
 panel.className='sponti-participants-panel';panel.hidden=true;
 const head=document.createElement('div');head.className='sponti-participants-head';
 const h=document.createElement('h4');h.textContent='Teilnehmerliste';
 const tools=document.createElement('div');tools.className='sponti-participants-tools';
 const print=document.createElement('button');print.type='button';print.textContent='Liste drucken';print.onclick=()=>printList(item,rows);
 const csv=document.createElement('button');csv.type='button';csv.textContent='Als Excel/CSV herunterladen';csv.onclick=()=>downloadCsv(item,rows);
 tools.append(print,csv);head.append(h,tools);
 const table=document.createElement('table');table.className='sponti-participants-table';
 table.innerHTML='<thead><tr><th>Name</th><th>Plätze</th><th>Telefon</th><th>E-Mail</th></tr></thead><tbody></tbody>';
 for(const r of rows){
  const tr=document.createElement('tr');
  const name=document.createElement('td');name.dataset.label='Name';name.textContent=r.guest_name||'–';
  const qty=document.createElement('td');qty.dataset.label='Plätze';qty.textContent=String(r.quantity||1);
  const phone=document.createElement('td');phone.dataset.label='Telefon';
  if(r.guest_phone)phone.append(link('tel:'+r.guest_phone.replace(/[^+\d]/g,''),r.guest_phone));else phone.textContent='–';
  const mail=document.createElement('td');mail.dataset.label='E-Mail';
  if(r.guest_email)mail.append(link('mailto:'+r.guest_email,r.guest_email));else mail.textContent='–';
  tr.append(name,qty,phone,mail);table.tBodies[0].append(tr);
 }
 const note=document.createElement('p');note.className='sponti-participants-note';
 note.textContent='Nutze diese Kontaktdaten nur für die Durchführung dieses Kurses (z. B. bei kurzfristigen Änderungen).';
 panel.append(head,table,note);
 return panel;
}

function decorate(){
 if(!available)return;
 for(const item of list.querySelectorAll('.provider-course-item[data-course-id]')){
  if(item.dataset.participantsReady==='1')continue;
  item.dataset.participantsReady='1';
  const rows=byCourse.get(String(item.dataset.courseId))||[];
  const booked=rows.reduce((s,r)=>s+(r.quantity||0),0);
  const info=item.querySelector(':scope > div');
  const badge=document.createElement('span');
  badge.className='sponti-participants-count'+(booked?'':' is-empty');
  badge.textContent=booked?seatsText(booked)+' gebucht':'Noch keine Buchungen';
  info?.append(badge);
  const wl=waitlist.get(String(item.dataset.courseId));
  if(wl&&(wl.waiting||wl.offered)){
   const w=document.createElement('span');
   w.className='sponti-participants-count sponti-waitlist-count';
   const parts=[];
   if(wl.waiting)parts.push(wl.waiting===1?'1 Platzanfrage':wl.waiting+' Platzanfragen');
   if(wl.offered)parts.push(wl.offered+' reserviert');
   w.textContent=parts.join(' · ');
   w.title='Kunden auf der Warteliste. Wird ein Platz frei oder erhöhst du die Platzzahl, bekommen sie automatisch einen reservierten Buchungslink.';
   info?.append(' ',w);
  }
  addCancel(item,booked);
  if(!booked)continue;
  const panel=buildPanel(item,rows);
  const btn=document.createElement('button');
  btn.type='button';btn.className='button account-secondary';
  btn.textContent='Teilnehmer ('+booked+')';btn.setAttribute('aria-expanded','false');
  btn.onclick=()=>{panel.hidden=!panel.hidden;btn.setAttribute('aria-expanded',String(!panel.hidden));};
  const actions=item.querySelector('.provider-course-actions');
  (actions||item).prepend(btn);
  item.append(panel);
 }
}

function cancelMessage(item,booked,verb){
 const {title,when}=courseInfo(item);
 return 'Termin «'+title+'» am '+when+' '+verb+'?\n\n'+
  (booked?seatsText(booked)+' gebucht: Alle Teilnehmenden erhalten automatisch eine Absage-E-Mail von Sponti.\nDie Rückerstattung übernimmt Sponti, du musst dafür nichts tun.':'Für diesen Termin gibt es noch keine Buchungen.')+
  '\n\nDer Termin ist danach nicht mehr buchbar.';
}
function addCancel(item,booked){
 const actions=item.querySelector('.provider-course-actions');
 if(!actions)return;
 const buttons=[...actions.querySelectorAll('button')];
 const deactivate=buttons.find(b=>b.textContent.trim()==='Deaktivieren');
 const remove=actions.querySelector('.provider-delete');
 let bypass=false;
 // Nachfragen, bevor ein gebuchter Termin deaktiviert oder gelöscht wird.
 item.addEventListener('click',e=>{
  if(bypass||!booked)return;
  const btn=e.target.closest&&e.target.closest('button');
  if(!btn||(btn!==deactivate&&btn!==remove))return;
  if(!window.confirm(cancelMessage(item,booked,btn===remove?'löschen und absagen':'deaktivieren und absagen'))){e.preventDefault();e.stopImmediatePropagation();}
 },true);
 if(!deactivate)return;
 const cancel=document.createElement('button');
 cancel.type='button';cancel.className='account-text-button sponti-cancel-course';cancel.textContent='Termin absagen';
 cancel.onclick=()=>{
  if(!window.confirm(cancelMessage(item,booked,'absagen')))return;
  bypass=true;deactivate.click();bypass=false;
 };
 deactivate.before(cancel);
}

let timer=null;
function refresh(){
 clearTimeout(timer);
 timer=setTimeout(async()=>{
  if(!loading)loading=load().finally(()=>{loading=null;});
  await loading;
  decorate();
 },60);
}
new MutationObserver(refresh).observe(list,{childList:true});
refresh();
})();
