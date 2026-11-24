/*
 * Sponti – Bereich "Bewertungen" im Anbieterboard
 * Zeigt die von Sponti freigegebenen Bewertungen der eigenen Kurse
 * (RPC public.provider_course_reviews, Client: window.SpontiProviderDb).
 */
(()=>{
'use strict';
const box=document.querySelector('[data-provider-reviews]');
if(!box)return;
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const stars=n=>'★★★★★'.slice(0,n)+'☆☆☆☆☆'.slice(0,5-n);
const date=new Intl.DateTimeFormat('de-CH',{dateStyle:'medium',timeZone:'Europe/Zurich'});
let loaded=false;

async function load(){
 const db=window.SpontiProviderDb;
 if(!db){setTimeout(load,400);return;}
 loaded=true;
 const status=box.querySelector('[data-reviews-status]');
 const list=box.querySelector('[data-reviews-list]');
 const summary=box.querySelector('[data-reviews-summary]');
 status.textContent='Bewertungen werden geladen …';
 const {data,error}=await db.rpc('provider_course_reviews');
 if(error){status.textContent='Bewertungen konnten gerade nicht geladen werden. Bitte lade die Seite neu.';loaded=false;return;}
 const rows=data||[];
 list.replaceChildren();
 if(!rows.length){status.textContent='Noch keine Bewertungen. Nach jedem Kurs bekommen deine Teilnehmenden automatisch eine E-Mail mit der Bitte um eine Bewertung. Sponti prüft sie kurz und zeigt sie dir dann hier.';summary.hidden=true;return;}
 status.textContent='';
 const rated=rows.filter(r=>r.rating);
 if(rated.length){
  const avg=rated.reduce((s,r)=>s+r.rating,0)/rated.length;
  summary.hidden=false;
  summary.replaceChildren(make('strong','',avg.toFixed(1).replace('.',',')),make('span','sponti-reviews-stars',stars(Math.round(avg))),make('span','',rated.length+(rated.length===1?' Bewertung':' Bewertungen')));
 }
 for(const r of rows){
  const card=make('article','sponti-provider-review');
  const head=make('div','sponti-provider-review-head');
  head.append(make('strong','',r.name||'Teilnehmer/in'));
  if(r.rating)head.append(make('span','sponti-reviews-stars',stars(r.rating)));
  card.append(head,make('small','',(r.course||'Kurs')+(r.starts_at?' · '+date.format(new Date(r.starts_at)):'')),make('p','',r.review));
  if(r.reply){const rep=make('div','sponti-provider-review-reply');rep.append(make('strong','','Antwort von Sponti'),make('p','',r.reply));card.append(rep);}
  list.append(card);
 }
}

const style=document.createElement('style');
style.textContent=`
[data-reviews-summary]{display:flex;align-items:center;gap:12px;margin:4px 0 18px;padding:14px 16px;border-radius:14px;background:#f6f8f2;border:1px solid #dbe6db}
[data-reviews-summary] strong{font:700 28px "Playfair Display",Georgia,serif;color:#173e30}
[data-reviews-summary] span:last-child{color:#5f7067;font-size:13px}
.sponti-reviews-stars{color:#f0a233;letter-spacing:1px;font-size:16px}
.sponti-provider-review{padding:16px 0;border-top:1px solid #e7eee5}
.sponti-provider-review:first-child{border-top:0}
.sponti-provider-review-head{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.sponti-provider-review small{display:block;color:#6b7d72;font-size:12px;margin-top:2px}
.sponti-provider-review p{margin:8px 0 0;line-height:1.6;white-space:pre-wrap;color:#19342d}
.sponti-provider-review-reply{margin-top:10px;padding:10px 14px;border-left:3px solid #c9dccb;background:#f8faf5;border-radius:0 10px 10px 0}
.sponti-provider-review-reply p{margin:4px 0 0}
`;
document.head.appendChild(style);

// Erst laden, wenn der Bereich geöffnet wird.
document.querySelector('[data-board-tab="reviews"]')?.addEventListener('click',()=>{if(!loaded)load();});
})();
