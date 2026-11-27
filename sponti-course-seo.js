/*
 * Sponti – SEO für Kursdetailseiten (kurs.html?id=…)
 * Setzt Seitentitel, Beschreibung, Canonical und schema.org-Event-Daten,
 * damit Google jeden Kurs mit Name, Ort, Datum und Preis versteht.
 */
(()=>{
'use strict';
const id=new URLSearchParams(location.search).get('id')||'';
if(!/^[0-9a-f-]{36}$/i.test(id))return;
const cats={'yoga-wellness':'Yoga & Meditation','pilates-barre':'Pilates & Barre','fitness-spinning':'Fitness & Spinning','tanz-bewegung':'Tanz','kunst-handwerk':'Töpfern & Kreatives','kochen-geniessen':'Kochen & Geniessen','fotografie-design':'Fotografie & Design','natur-draussen':'Natur & Draussen'};
const places={zug:'Zug',zuerich:'Zürich',luzern:'Luzern',solothurn:'Solothurn',aargau:'Aargau'};
function meta(sel,attr,name,value){let el=document.head.querySelector(sel);if(!el){el=document.createElement(attr==='link'?'link':'meta');if(attr==='link')el.rel=name;else el.setAttribute(attr,name);document.head.append(el);}el.setAttribute(attr==='link'?'href':'content',value);}
(async()=>{
 try{
  const q=new URLSearchParams({select:'id,title,description,category,region,venue,meeting_point,starts_at,ends_at,price,seats,status,archived_at',id:'eq.'+id,limit:'1'});
  const r=await fetch('https://ehifskiigrfpxeiruyxr.supabase.co/rest/v1/courses?'+q,{headers:{apikey:'sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy'},signal:AbortSignal.timeout(15000)});
  if(!r.ok)return;
  const c=(await r.json())[0];
  if(!c)return;
  const place=places[c.region]||c.venue||'Schweiz';
  const date=new Intl.DateTimeFormat('de-CH',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Zurich'}).format(new Date(c.starts_at));
  const title=c.title+' in '+place+' am '+date+' | Sponti';
  const desc=(c.title+' in '+(c.venue||place)+' am '+date+'. '+(Number(c.price)>0?'CHF '+Number(c.price).toFixed(2)+' pro Platz. ':'')+String(c.description||'Freie Plätze spontan auf Sponti buchen.')).replace(/\s+/g,' ').slice(0,158);
  const url=location.origin+'/kurs.html?id='+c.id;
  document.title=title;
  meta('meta[name="description"]','name','description',desc);
  meta('link[rel="canonical"]','link','canonical',url);
  meta('meta[property="og:title"]','property','og:title',title);
  meta('meta[property="og:description"]','property','og:description',desc);
  meta('meta[property="og:url"]','property','og:url',url);
  const available=c.status==='published'&&!c.archived_at&&Number(c.seats)>0&&new Date(c.starts_at)>new Date();
  const ld={'@context':'https://schema.org','@type':'Event',name:c.title,description:String(c.description||'').slice(0,500),
   startDate:c.starts_at,...(c.ends_at?{endDate:c.ends_at}:{}),
   eventStatus:c.archived_at||c.status!=='published'?'https://schema.org/EventCancelled':'https://schema.org/EventScheduled',
   eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode',
   location:{'@type':'Place',name:c.venue||place,address:{'@type':'PostalAddress',streetAddress:c.meeting_point||c.venue||'',addressLocality:place,addressCountry:'CH'}},
   offers:{'@type':'Offer',price:Number(c.price||0).toFixed(2),priceCurrency:'CHF',url,availability:available?'https://schema.org/InStock':'https://schema.org/SoldOut'},
   organizer:{'@type':'Organization',name:'Sponti',url:location.origin},
   ...(cats[c.category]?{keywords:cats[c.category]}:{})};
  const s=document.createElement('script');s.type='application/ld+json';s.textContent=JSON.stringify(ld);document.head.append(s);
 }catch{}
})();
})();
