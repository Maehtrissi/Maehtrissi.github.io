/*
 * Sponti – Live-Kursliste auf Orts-Landingpages (/kurse-zug, /yoga-zug …)
 * Lädt veröffentlichte, kommende Kurse aus Supabase und filtert nach
 * data-region, data-category und data-keyword (Titel/Beschreibung).
 * Ergänzt pro Kurs strukturierte Daten (schema.org Event) für Google.
 */
(()=>{
'use strict';
const box=document.querySelector('[data-location-courses]');
if(!box)return;
const SALE_LEAD_MS=2*60*60*1000;
const region=box.dataset.region||'',category=box.dataset.category||'',keyword=(box.dataset.keyword||'').toLowerCase();
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const when=new Intl.DateTimeFormat('de-CH',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Zurich'});
const chf=new Intl.NumberFormat('de-CH',{style:'currency',currency:'CHF'});

function empty(){
 box.replaceChildren();
 const p=make('p','sponti-location-status','Gerade sind hier keine freien Plätze ausgeschrieben. Neue Plätze kommen oft kurzfristig dazu – tritt unserer WhatsApp-Community bei, dann erfährst du es als Erstes.');
 const a=make('a','button button-primary','WhatsApp-Community beitreten');a.href='https://chat.whatsapp.com/EO0QokxRnht6HreYx9PrBg';a.target='_blank';a.rel='noopener noreferrer';
 box.append(p,a);
}

async function load(){
 try{
  const q=new URLSearchParams({select:'id,title,description,category,region,venue,starts_at,ends_at,price,seats,status,archived_at',status:'eq.published',archived_at:'is.null',starts_at:'gt.'+new Date(Date.now()+SALE_LEAD_MS).toISOString(),order:'starts_at.asc',limit:'60'});
  if(region)q.set('region','eq.'+region);
  if(category&&!keyword)q.set('category','eq.'+category);
  const r=await fetch('https://ehifskiigrfpxeiruyxr.supabase.co/rest/v1/courses?'+q,{headers:{apikey:'sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy'},signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error('HTTP '+r.status);
  let rows=await r.json();
  rows=(Array.isArray(rows)?rows:[]).filter(c=>Number(c.seats)>0);
  if(keyword)rows=rows.filter(c=>(String(c.title||'')+' '+String(c.description||'')).toLowerCase().includes(keyword));
  if(!rows.length){empty();return;}
  const list=make('div','sponti-location-list');
  const events=[];
  for(const c of rows.slice(0,24)){
   const a=make('a','sponti-location-card');a.href='/kurs.html?id='+encodeURIComponent(c.id);
   a.append(make('span','sponti-location-date',when.format(new Date(c.starts_at))),make('strong','',c.title||'Kurs'),
    make('span','sponti-location-meta',[c.venue,Number(c.price)>0?chf.format(Number(c.price)):'Gratis',c.seats+(Number(c.seats)===1?' Platz frei':' Plätze frei')].filter(Boolean).join(' · ')));
   list.append(a);
   events.push({'@type':'Event',name:c.title,startDate:c.starts_at,...(c.ends_at?{endDate:c.ends_at}:{}),
    eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode',eventStatus:'https://schema.org/EventScheduled',
    location:{'@type':'Place',name:c.venue||'Schweiz',address:{'@type':'PostalAddress',addressLocality:c.venue||'',addressCountry:'CH'}},
    url:location.origin+'/kurs.html?id='+c.id,
    offers:{'@type':'Offer',price:Number(c.price||0).toFixed(2),priceCurrency:'CHF',availability:'https://schema.org/InStock',url:location.origin+'/kurs.html?id='+c.id},
    organizer:{'@type':'Organization',name:'Sponti',url:location.origin}});
  }
  box.replaceChildren(list);
  const ld=document.createElement('script');ld.type='application/ld+json';ld.textContent=JSON.stringify({'@context':'https://schema.org','@graph':events});
  document.head.append(ld);
 }catch(err){
  box.replaceChildren(make('p','sponti-location-status','Die Kurse konnten gerade nicht geladen werden.'));
  const a=make('a','text-link','Zur Kursübersicht →');a.href='/kurse'+(region?'?ort='+region:'');box.append(a);
 }
}
load();
})();
