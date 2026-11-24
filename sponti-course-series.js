/*
 * Sponti – Wiederkehrende Kurse im Anbieterboard
 *
 * Ergänzt den Kurs-Assistenten um "Wiederholung" (einmalig, jede Woche,
 * alle 2 Wochen) und eine Dauer (1, 2, 3, 6 Monate, 1 Jahr oder bis Datum).
 * Preis und freie Plätze gelten für alle Termine; die Plätze können danach
 * pro Termin angepasst werden. Beim Speichern eines NEUEN Kurses
 * werden alle Termine auf einmal angelegt: Jeder Termin ist ein eigener Kurs
 * mit eigenen freien Plätzen und Buchungen; alle teilen dieselbe series_id.
 * Beim Bearbeiten eines bestehenden Termins wird nur dieser Termin geändert.
 *
 * Benötigt die Spalte public.provider_courses.series_id (Migration
 * provider_course_series). anbieter-account.js ruft beim Einfügen
 * window.SpontiCourseSeries.insert(client, row) auf.
 */
(()=>{
'use strict';
const MAX_DATES=53;
const form=document.querySelector('[data-course-editor] form[data-provider-form="course"]');
if(!form)return;
const editor=form.closest('[data-course-editor]');
const startInput=form.elements.namedItem('starts_at');
const grid=startInput?.closest('.account-form-grid');
if(!startInput||!grid)return;

const style=document.createElement('style');
style.textContent='.provider-course-repeat{border:0;padding:0;margin:18px 0 6px;min-width:0}.provider-course-repeat legend{font-weight:600;margin-bottom:8px;padding:0}.provider-course-repeat-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.provider-course-repeat [data-repeat-summary]{margin:10px 0 0}.provider-course-repeat [data-repeat-summary].is-error{color:#b42318}';
document.head.appendChild(style);

const box=document.createElement('fieldset');
box.className='provider-course-repeat';
box.innerHTML='<legend>Wiederholung</legend>'+
 '<div class="provider-course-repeat-grid">'+
 '<label>Wie oft findet der Kurs statt?<select name="repeat_interval" data-repeat-interval>'+
 '<option value="0">Einmaliger Termin</option><option value="1">Jede Woche</option><option value="2">Alle 2 Wochen</option></select></label>'+
 '<label data-repeat-duration-wrap hidden>Wie lange?<select name="repeat_duration" data-repeat-duration disabled>'+
 '<option value="1">1 Monat</option><option value="2" selected>2 Monate</option><option value="3">3 Monate</option><option value="6">6 Monate</option><option value="12">1 Jahr</option><option value="date">Bis zu einem bestimmten Datum</option></select></label>'+
 '<label data-repeat-until-wrap hidden>Letzter Termin am<input type="date" name="repeat_until" data-repeat-until disabled></label>'+
 '</div><p class="account-help" data-repeat-summary aria-live="polite"></p>';
grid.after(box);

const intervalSelect=box.querySelector('[data-repeat-interval]');
const untilWrap=box.querySelector('[data-repeat-until-wrap]');
const durationWrap=box.querySelector('[data-repeat-duration-wrap]');
const durationSelect=box.querySelector('[data-repeat-duration]');
const untilInput=box.querySelector('[data-repeat-until]');
const summary=box.querySelector('[data-repeat-summary]');
const dayFormat=new Intl.DateTimeFormat('de-CH',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
const pad=n=>String(n).padStart(2,'0');
const localDay=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());

function isEditing(){return !!String(form.elements.namedItem('id')?.value||'').trim();}
function interval(){return isEditing()?0:Number(intervalSelect.value)||0;}

// Letzter möglicher Kurstag: Start + gewählte Monate, oder das gewählte Datum.
function untilDay(start){
 if(durationSelect.value==='date')return untilInput.value;
 const months=Number(durationSelect.value)||0;
 if(!months||!start)return '';
 const end=new Date(start.getTime());
 end.setMonth(end.getMonth()+months);
 end.setDate(end.getDate()-1);
 return localDay(end);
}
// Alle Termine ab dem gewählten Start (gleiche Uhrzeit, auch über die Zeitumstellung hinweg).
function plan(){
 const weeks=interval();
 const start=startInput.value?new Date(startInput.value):null;
 if(!weeks||!start||!Number.isFinite(start.getTime()))return {dates:start?[start]:[],tooMany:false};
 const until=untilDay(start);
 if(!until)return {dates:[start],tooMany:false};
 const dates=[];let tooMany=false;
 for(let k=0;;k++){
  const d=new Date(start.getTime());
  d.setDate(d.getDate()+7*weeks*k);
  if(localDay(d)>until)break;
  if(dates.length>=MAX_DATES){tooMany=true;break;}
  dates.push(d);
 }
 return {dates,tooMany};
}

function refresh(){
 const editing=isEditing();
 box.hidden=editing;
 const weeks=interval();
 const byDate=!!weeks&&durationSelect.value==='date';
 durationWrap.hidden=!weeks;
 durationSelect.disabled=!weeks;
 untilWrap.hidden=!byDate;
 untilInput.disabled=!byDate;
 untilInput.required=byDate;
 if(startInput.value){
  const first=new Date(startInput.value);
  if(Number.isFinite(first.getTime())){
   untilInput.min=localDay(first);
   const max=new Date(first.getTime());max.setFullYear(max.getFullYear()+1);
   untilInput.max=localDay(max);
  }
 }
 summary.classList.remove('is-error');
 untilInput.setCustomValidity('');durationSelect.setCustomValidity('');
 const invalidField=byDate?untilInput:durationSelect;
 if(!weeks){summary.textContent='';return;}
 if(!startInput.value){summary.textContent='Wähle zuerst Datum und Uhrzeit des ersten Termins.';return;}
 if(byDate&&!untilInput.value){summary.textContent='Wähle das Datum des letzten Termins.';return;}
 const {dates,tooMany}=plan();
 if(dates.length<2){
  const msg=byDate?'Der letzte Termin muss mindestens '+(weeks===1?'eine Woche':'zwei Wochen')+' nach dem ersten liegen.':'In diesem Zeitraum gibt es nur einen Termin. Wähle eine längere Dauer.';
  invalidField.setCustomValidity(msg);summary.textContent=msg;summary.classList.add('is-error');return;
 }
 if(tooMany){
  const msg='Es können höchstens '+MAX_DATES+' Termine auf einmal erstellt werden (etwa ein Jahr). Wähle einen kürzeren Zeitraum.';
  invalidField.setCustomValidity(msg);summary.textContent=msg;summary.classList.add('is-error');return;
 }
 summary.textContent='Das ergibt '+dates.length+' Termine, vom '+dayFormat.format(dates[0])+' bis '+dayFormat.format(dates[dates.length-1])+
  '. Preis und '+(form.elements.namedItem('seats')?.value?form.elements.namedItem('seats').value+' freie Plätze':'freie Plätze')+' gelten für jeden Termin. Die freien Plätze kannst du danach unter «Meine Kurse» für jede Woche einzeln anpassen.';
}

form.addEventListener('input',refresh);
form.addEventListener('change',refresh);
form.addEventListener('reset',()=>setTimeout(()=>{intervalSelect.value='0';durationSelect.value='2';untilInput.value='';refresh();},0));
if(editor)new MutationObserver(()=>{if(!editor.hidden)refresh();}).observe(editor,{attributes:true,attributeFilter:['hidden']});

// Zusammenfassung im Schritt "Veröffentlichung".
const review=form.querySelector('[data-course-review-list]');
if(review)new MutationObserver(()=>{
 if(review.querySelector('[data-repeat-review]')||!interval())return;
 const {dates}=plan();if(dates.length<2)return;
 const wrap=document.createElement('div');wrap.dataset.repeatReview='';
 const dt=document.createElement('dt');dt.textContent='Wiederholung';
 const dd=document.createElement('dd');
 dd.textContent=(interval()===1?'Jede Woche':'Alle 2 Wochen')+', '+dates.length+' Termine bis '+dayFormat.format(dates[dates.length-1]);
 wrap.append(dt,dd);review.append(wrap);
}).observe(review,{childList:true});

refresh();

window.SpontiCourseSeries={
 async insert(client,row){
  const {dates}=plan();
  if(dates.length<2)return client.from('provider_courses').insert(row);
  const seriesId=crypto.randomUUID();
  const firstStart=new Date(row.starts_at).getTime();
  const durationMs=row.ends_at?new Date(row.ends_at).getTime()-firstStart:null;
  const rows=dates.map(d=>({...row,series_id:seriesId,starts_at:d.toISOString(),
   ends_at:durationMs===null?null:new Date(d.getTime()+durationMs).toISOString()}));
  const result=await client.from('provider_courses').insert(rows);
  if(!result.error){
   setTimeout(()=>{
    const status=document.querySelector('[data-provider-status]');
    if(status){status.textContent=rows.length+' Termine '+(row.active?'veröffentlicht.':'als Entwurf gespeichert.');status.hidden=false;status.classList.remove('is-error');}
   },0);
  }
  return result;
 }
};
})();
