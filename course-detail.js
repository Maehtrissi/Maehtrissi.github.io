(()=>{const URL_BASE='https://ehifskiigrfpxeiruyxr.supabase.co';const KEY='sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy';const id=new URLSearchParams(location.search).get('id');const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;const $=s=>document.querySelector(s);const fmtPrice=n=>new Intl.NumberFormat('de-CH',{style:'currency',currency:'CHF'}).format(Number(n));const fmtDate=s=>new Intl.DateTimeFormat('de-CH',{dateStyle:'full',timeStyle:'short',timeZone:'Europe/Zurich'}).format(new Date(s));const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};const DEMO_MODE=new URLSearchParams(location.search).get('demo')==='1';
const SALE_LEAD_MS=2*60*60*1000;const saleClosesAt=c=>new Date(c.starts_at).getTime()-SALE_LEAD_MS;const saleDate=s=>new Intl.DateTimeFormat('de-CH',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Zurich'}).format(new Date(s));
const DEMO_COURSE={id:'00000000-0000-4000-8000-000000000001',title:'Keramik-Workshop: Gestalte deine eigene Tasse',description:'Entdecke die Welt der Keramik in einem entspannten, kreativen Workshop. Du formst deine eigene Tasse von Hand und gestaltest sie nach deinen Vorstellungen. Vorkenntnisse sind nicht nötig. Die Kursleitung zeigt dir Schritt für Schritt die wichtigsten Techniken. Nach dem Brennen kann dein Werkstück zu einem späteren Zeitpunkt abgeholt werden. Alle Kursdaten sind Beispiele.',category:'kunst-handwerk',region:'luzern',venue:'Luzern – Demo-Veranstaltungsort (keine echte Adresse)',starts_at:'2026-11-14T10:00:00+01:00',price:49,seats:8,booking_url:'',ticket_type:'Digitale Buchungsbestätigung (Demo)',meeting_point:'Eingang des Demo-Ateliers in Luzern. Die genaue Adresse würde nach der Buchung mitgeteilt.',cancellation_policy:'Beispiel: Kostenlose Stornierung bis 24 Stunden vor Kursbeginn. Bei späterer Absage ist keine Rückerstattung vorgesehen. Diese Bedingungen sind nicht verbindlich.',additional_info:'Dauer: ungefähr 2 Stunden. Material und Werkzeuge sind im Beispielpreis enthalten. Bitte Kleidung tragen, die schmutzig werden darf. Geeignet ab 16 Jahren.',accessibility:'Beispielangabe: Stufenloser Eingang und barrierefreies WC. Bitte bei einer echten Buchung die Angaben des Anbieters prüfen.',help_info:'Bei Fragen zu echten Sponti-Angeboten erreichst du uns über die Kontaktseite. Für diesen Demokurs gibt es keinen Kursanbieter.',similar_experiences:'Beispiele: Töpfer-Schnupperkurs, Keramik bemalen und kreatives Gestalten.'};
function addDemoBanner(){if(!DEMO_MODE)return;const banner=make('div','booking-demo-banner','DEMO-KURS · Beispielansicht – kein echtes Angebot, keine Reservierung und keine Zahlung.');banner.setAttribute('role','note');const target=document.querySelector('.booking-breadcrumb');target?.after(banner);}
async function getCourse(){if(DEMO_MODE)return DEMO_COURSE;if(!id||!uuid.test(id))throw Error('Ungültiger Kurslink.');const params=new URLSearchParams({select:'id,title,description,category,region,venue,starts_at,ends_at,price,seats,meeting_point,additional_info,accessibility',id:'eq.'+id,limit:'1'});const r=await fetch(URL_BASE+'/rest/v1/courses?'+params,{headers:{apikey:KEY},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Kursdaten konnten nicht geladen werden.');const rows=await r.json();if(!rows.length)throw Error('Dieser Kurs ist nicht verfügbar.');return rows[0];}const categories={'yoga-wellness':'Yoga & Wellness','kochen-geniessen':'Kochen & Geniessen','kunst-handwerk':'Kunst & Handwerk','fotografie-design':'Fotografie & Design','tanz-bewegung':'Tanz & Bewegung','natur-draussen':'Natur & Draussen'};function facts(target,course){
 const data=[
  ['Datum & Uhrzeit',fmtDate(course.starts_at),'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>'],
  ['Ort',window.SpontiPlaces?.format(course.venue||course.region||'Schweiz')||course.venue||course.region||'Schweiz','<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>'],
  ['Region',window.SpontiPlaces?.region(course.region||'Schweiz')||course.region||'Schweiz','<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'],
  ['Freie Plätze',String(course.seats??0),'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2"/><path d="M17 5a3 3 0 0 1 0 6M18 15c2 1 3 3 3 5"/>']
 ];
 for(const [label,value,icon] of data){
  const item=make('div','detail-overview-item');
  const symbol=make('span','detail-overview-icon');
  symbol.setAttribute('aria-hidden','true');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('width','20');svg.setAttribute('height','20');
  svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
  svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
  svg.innerHTML=icon;
  symbol.append(svg);
  const text=make('div','detail-overview-text');
  text.append(make('span','detail-overview-label',label),make('strong','detail-overview-value',value));
  item.append(symbol,text);target.append(item);
 }
}function addInfoSection(title,body){if(!body||!String(body).trim())return;const sec=make('section','detail-block');sec.append(make('h2','',title),make('p','',body));$('#detail-left-extras').append(sec);}function displayExtras(c){const host=make('div','detail-extra-sections');host.id='detail-left-extras';$('#detail-overview-facts').closest('.detail-block').after(host);const meetingPoint=String(c.meeting_point||'').trim();const venue=String(c.venue||'').trim();const entries=[...(meetingPoint&&meetingPoint.toLocaleLowerCase('de-CH')!==venue.toLocaleLowerCase('de-CH')?[['Genauer Treffpunkt',meetingPoint]]:[]),['Weitere Informationen',c.additional_info],['Barrierefreiheit',c.accessibility]];for(const [title,value] of entries)addInfoSection(title,value);}async function loadPublicProvider(courseId){
 if(DEMO_MODE)return;
 const rpc=async name=>{
  const res=await fetch(URL_BASE+'/rest/v1/rpc/'+name,{
   method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},
   body:'{}',signal:AbortSignal.timeout(12000)
  });
  if(!res.ok)throw Error('Öffentliche Anbieterinformationen nicht verfügbar.');
  return res.json();
 };
 try{
  const providers=await rpc('list_public_course_providers');
  if(!Array.isArray(providers))return;
  const provider=providers.find(p=>Array.isArray(p.courses)&&p.courses.some(c=>String(c.id)===String(courseId)));
  if(!provider||!uuid.test(String(provider.provider_id))||!String(provider.company||'').trim())return;
  const providerId=String(provider.provider_id),providerName=String(provider.company).trim();
  const card=$('#detail-provider-card'),avatar=$('#detail-provider-card-avatar');
  const contactList=$('#detail-provider-contact-list'),quickLinks=$('#detail-provider-quick-links');
  if(!card||!avatar||!contactList||!quickLinks)return;
  $('#detail-provider-card-name').textContent=providerName;
  $('#detail-provider-card-category').textContent=String(provider.category||'Kursanbieter').trim();
  $('#detail-provider-card-link').href='/anbieterprofil?id='+encodeURIComponent(providerId);
  avatar.textContent=providerName.slice(0,1).toLocaleUpperCase('de-CH');
  const addContact=(label,value,href,external)=>{
   const line=make('div','detail-provider-contact');
   const text=make('span','detail-provider-contact-label',label);
   const detail=make(href?'a':'span','detail-provider-contact-value',value);
   if(href){detail.href=href;if(external){detail.target='_blank';detail.rel='noopener noreferrer';}}
   line.append(text,detail);contactList.append(line);
  };
  const location=String(provider.location||'').trim();
  if(location)addContact('Standort',window.SpontiPlaces?.format(location)||location);
  const addQuickLink=(label,value)=>{
   try{
    const url=new URL(String(value||'').trim());
    if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return;
    if(quickLinks.querySelectorAll('a').length>=5||[...quickLinks.querySelectorAll('a')].some(a=>a.href===url.href))return;
    const anchor=make('a','detail-provider-quick-link',label);
    anchor.href=url.href;anchor.target='_blank';anchor.rel='noopener noreferrer';
    quickLinks.append(anchor);
   }catch{}
  };
  addQuickLink('Website',provider.website);
  card.hidden=false;
  const results=await Promise.allSettled([rpc('list_public_provider_contacts'),rpc('list_public_provider_extras_v2')]);
  if(results[0].status==='fulfilled'&&Array.isArray(results[0].value)){
   const contact=results[0].value.find(p=>String(p.provider_id)===providerId);
   const email=String(contact?.public_email||'').trim();
   const phone=String(contact?.public_phone||'').trim();
   if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    addContact('E-Mail',email,'mailto:'+email);
    const emailButton=$('#detail-provider-contact-button');
    if(emailButton){emailButton.href='mailto:'+email+'?subject='+encodeURIComponent('Frage zu deinem Kurs auf Sponti');emailButton.hidden=false;}
   }
   if(/^[+0-9(). /-]{6,30}$/.test(phone)){
    const number=phone.replace(/[^0-9+]/g,'');
    if(number.replace(/\D/g,'').length>=6)addContact('Telefon',phone,'tel:'+number);
   }
  }
  if(results[1].status==='fulfilled'&&Array.isArray(results[1].value)){
   const extra=results[1].value.find(p=>String(p.provider_id)===providerId);
   const about=String(extra?.about_text||'').trim(),aboutEl=$('#detail-provider-card-about');
   if(about){aboutEl.textContent=about.length>220?about.slice(0,217).trimEnd()+'…':about;aboutEl.hidden=false;}
   for(const link of (Array.isArray(extra?.social_links)?extra.social_links:[]).slice(0,10)){
    if(!link||!link.url)continue;
    const label=String(link.label||'Social Media').trim().slice(0,32);
    addQuickLink(label||'Social Media',link.url);
   }
   const logo=String(extra?.logo_path||'');
   if(/^[0-9a-f-]{36}\/[\w.-]+$/i.test(logo)){
    const img=document.createElement('img');
    img.src=URL_BASE+'/storage/v1/object/public/provider-gallery/'+logo.split('/').map(encodeURIComponent).join('/');
    img.alt='';img.loading='lazy';img.onerror=()=>img.remove();avatar.replaceChildren(img);
   }
  }
  if(!contactList.children.length)addContact('Kontakt','Weitere Angaben im Anbieterprofil');
 }catch{/* Keine privaten Kontakte anzeigen oder Kursdetailansicht blockieren. */}
}
async function boot(){try{addDemoBanner();const c=await getCourse();document.title=c.title+' | Sponti';$('#course-breadcrumb').textContent=c.title;$('#detail-title').textContent=c.title;$('#detail-side-title').textContent=c.title;$('#detail-category').textContent=categories[c.category]||c.category||'Erlebnis';$('#detail-description').textContent=c.description||'Weitere Informationen zum Kurs erhältst du beim Anbieter.';$('#detail-visual').classList.add('detail-'+(c.category||'').replace(/[^a-z-]/g,''));$('#detail-price').textContent=fmtPrice(c.price);window.SpontiCourseCalendar?.setCourse(c);facts($('#detail-overview-facts'),c);displayExtras(c);void loadPublicProvider(c.id);const bookingNote=document.querySelector('.booking-summary .booking-note');if(bookingNote)bookingNote.textContent=Number(c.price)===0?'Kostenloser Kurs: Buchung ohne Zahlung möglich, sofern noch Plätze frei sind.':'Kostenpflichtiger Kurs: Zahlung über Sponti derzeit noch nicht verfügbar.';const share=$('[data-sponti-course-share]');if(share&&!DEMO_MODE){share.dataset.shareTitle=c.title;share.dataset.shareUrl=new URL('/kurs.html?id='+encodeURIComponent(c.id),location.origin).href;share.hidden=false;}const a=$('#detail-cta');a.textContent='Tickets buchen →';a.href=DEMO_MODE?'/buchung.html?demo=1':'/buchung.html?id='+encodeURIComponent(c.id);const deadline=$('#ticket-sale-deadline');const deadlineText=$('#ticket-sale-deadline-text');const deadlineMs=saleClosesAt(c);if(Number.isFinite(deadlineMs)){deadline.hidden=false;deadlineText.textContent='Verkauf endet am '+saleDate(deadlineMs)+' Uhr';}const updateSaleStatus=()=>{const ended=Number.isFinite(deadlineMs)&&Date.now()>=deadlineMs;const unavailable=Number(c.seats)<1||ended||new Date(c.starts_at)<=new Date();if(ended){deadlineText.textContent='Ticketverkauf beendet · Verkaufsschluss: '+saleDate(deadlineMs)+' Uhr';deadline.classList.add('is-ended');}if(unavailable){a.removeAttribute('href');a.classList.add('is-disabled');a.textContent=ended?'Ticketverkauf beendet':'Zurzeit nicht buchbar';document.querySelector('.mobile-booking-dock')?.remove();}return !unavailable;};const available=updateSaleStatus();$('#detail-status').hidden=true;$('#detail-intro').hidden=false;$('#detail-shell').hidden=false;
  if(available){const dock=make('div','mobile-booking-dock');const action=make('a','booking-primary','Tickets buchen →');action.href=a.href;dock.append(action);document.body.append(dock);}if(Number.isFinite(deadlineMs)&&Date.now()<deadlineMs)window.setInterval(updateSaleStatus,30000);}catch(err){$('#detail-status').textContent=err.message+' ';$('#detail-status').append(Object.assign(make('a','','Alle Kurse ansehen'),{href:'/kurse'}));}}boot();})();