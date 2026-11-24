/*
 * Sponti – Wiederkehrende Kurse im Anbieterboard
 *
 * Ergänzt den Kurs-Assistenten um "Wiederholung" (einmalig, jede Woche,
 * alle 2 Wochen) mit einem letzten Termin. Beim Speichern eines NEUEN Kurses
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
const MAX_DATES=26;
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
 '<label data-repeat-until-wrap hidden>Letzter Termin am<input type="date" name="repeat_until" data-repeat-until disabled></label>'+
 '</div><p class="account-help" data-repeat-summary aria-live="polite"></p>';
grid.after(box);

const intervalSelect=box.querySelector('[data-repeat-interval]');
const untilWrap=box.querySelector('[data-repeat-until-wrap]');
const untilInput=box.querySelector('[data-repeat-until]');
const summary=box.querySelector('[data-repeat-summary]');
const dayFormat=new Intl.DateTimeFormat('de-CH',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
const pad=n=>String(n).padStart(2,'0');
const localDay=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());

function isEditing(){return !!String(form.elements.namedItem('id')?.value||'').trim();}
function interval(){return isEditing()?0:Number(intervalSelect.value)||0;}

// Alle Termine ab dem gewählten Start (gleiche Uhrzeit, auch über die Zeitumstellung hinweg).
function plan(){
 const weeks=interval();
 const start=startInput.value?new Date(startInput.value):null;
 if(!weeks||!start||!Number.isFinite(start.getTime()))return {dates:start?[start]:[],tooMany:false};
 const until=untilInput.value;
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
 untilWrap.hidden=!weeks;
 untilInput.disabled=!weeks;
 untilInput.required=!!weeks;
 if(startInput.value){
  const first=new Date(startInput.value);
  if(Number.isFinite(first.getTime())){
   untilInput.min=localDay(first);
   const max=new Date(first.getTime());max.setFullYear(max.getFullYear()+1);
   untilInput.max=localDay(max);
  }
 }
 summary.classList.remove('is-error');
 untilInput.setCustomValidity('');
 if(!weeks){summary.textContent='';return;}
 if(!startInput.value){summary.textContent='Wähle zuerst Datum und Uhrzeit des ersten Termins.';return;}
 if(!untilInput.value){summary.textContent='Wähle das Datum des letzten Termins.';return;}
 const {dates,tooMany}=plan();
 if(dates.length<2){
  const msg='Der letzte Termin muss mindestens '+(weeks===1?'eine Woche':'zwei Wochen')+' nach dem ersten liegen.';
  untilInput.setCustomValidity(msg);summary.textContent=msg;summary.classList.add('is-error');return;
 }
 if(tooMany){
  const msg='Es können höchstens '+MAX_DATES+' Termine auf einmal erstellt werden. Wähle einen früheren letzten Termin.';
  untilInput.setCustomValidity(msg);summary.textContent=msg;summary.classList.add('is-error');return;
 }
 summary.textContent='Das ergibt '+dates.length+' Termine, vom '+dayFormat.format(dates[0])+' bis '+dayFormat.format(dates[dates.length-1])+
  '. Jeder Termin wird als eigener Kurs mit '+(form.elements.namedItem('seats')?.value||'den gleichen')+' freien Plätzen gespeichert und kann später einzeln bearbeitet werden.';
}

form.addEventListener('input',refresh);
form.addEventListener('change',refresh);
form.addEventListener('reset',()=>setTimeout(()=>{intervalSelect.value='0';untilInput.value='';refresh();},0));
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
