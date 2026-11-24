(() => {
 const SALE_LEAD_MS=2*60*60*1000;
 const grid=document.querySelector('.course-grid');
 if(!grid)return;
 const categories={'yoga-wellness':['Yoga & Wellness','yoga'],'kochen-geniessen':['Kochen & Geniessen','pasta'],'kunst-handwerk':['Kunst & Handwerk','clay'],'fotografie-design':['Fotografie & Design','photo'],'tanz-bewegung':['Tanz & Bewegung','dance'],'natur-draussen':['Natur & Draussen','bouquet']};
 let cards=[];
 const buttons=[...document.querySelectorAll('.course-filters .filter')];
 const active=(attr)=>buttons.filter(b=>b.classList.contains('active')&&b.dataset[attr]&& !['alle','all'].includes(b.dataset[attr])).map(b=>b.dataset[attr]);
 const message=document.getElementById('course-status');
 const queryParams=new URLSearchParams(location.search);for(const [k,v] of new URLSearchParams(document.body.dataset.presetParams||''))if(!queryParams.has(k))queryParams.set(k,v);
 const searchTerm=(queryParams.get('suche')||'').trim().toLocaleLowerCase('de-CH');
 const selectedPlace=(queryParams.get('ort')||'').trim();
 const slugPlaces=['zug','zuerich','luzern','solothurn','aargau','andere'];
 const placeSlug=selectedPlace.toLocaleLowerCase('de-CH');
 const customPlace=selectedPlace&&!slugPlaces.includes(placeSlug)&&placeSlug!=='all'?placeSlug:'';
 const requestedDate=(queryParams.get('datum')||'').trim();
 const selectedDate=/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)&&!Number.isNaN(Date.parse(requestedDate))?requestedDate:'';
 const todayRequested=queryParams.get('heute')==='1';

 const todayToggle=document.getElementById('filter-today');
 if(todayRequested&&todayToggle)todayToggle.checked=true;
 const priceSlider=document.getElementById('filter-price');
 const priceLabel=document.getElementById('filter-price-value');
 const zurichDay=(date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zurich',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
 const updatePriceLabel=()=>{if(priceSlider&&priceLabel){priceLabel.textContent=priceSlider.value===priceSlider.max?'Alle Preise':`Bis CHF ${priceSlider.value}`;priceSlider.style.setProperty('--price-progress',`${(Number(priceSlider.value)-Number(priceSlider.min))/(Number(priceSlider.max)-Number(priceSlider.min))*100}%`);}};
 todayToggle?.addEventListener('change',applyFilters);
 priceSlider?.addEventListener('input',()=>{updatePriceLabel();applyFilters();});
 updatePriceLabel();
 const dateNotice=document.getElementById('sponti-applied-date');
 if(selectedDate&&dateNotice){
  const dateLabel=document.createElement('span');
  dateLabel.textContent='Gewähltes Datum: '+new Intl.DateTimeFormat('de-CH',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Zurich'}).format(new Date(selectedDate+'T12:00:00Z'));
  const clearLink=document.createElement('a');
  const withoutDate=new URLSearchParams(location.search);
  withoutDate.delete('datum');
  clearLink.href='/kurse'+(withoutDate.toString()?'?'+withoutDate.toString():'');
  clearLink.textContent='Datum entfernen';
  dateNotice.replaceChildren(dateLabel,clearLink);
  dateNotice.hidden=false;
 }
 function applyFilters(){
  const filters=[['filter','category'],['location','location'],['day','day'],['time','time']].map(([button,card])=>({values:active(button),card}));
  let shown=0;
  for(const card of cards){const start=new Date(card.dataset.startsAt);const todayOk=!todayToggle?.checked||(zurichDay(start)===zurichDay(new Date())&&start.getTime()>Date.now()&&Number(card.dataset.seats)>0);const priceOk=!priceSlider||Number(card.dataset.price)<=Number(priceSlider.value)||priceSlider.value===priceSlider.max;const bookable=Number.isFinite(start.getTime())&&start.getTime()>Date.now()+SALE_LEAD_MS&&Number(card.dataset.seats)>0;const searchOk=!searchTerm||(card.dataset.searchText||'').includes(searchTerm);const placeOk=!customPlace||(card.dataset.placeText||'').includes(customPlace);const dateOk=!selectedDate||zurichDay(start)===selectedDate;const visible=bookable&&searchOk&&placeOk&&dateOk&&filters.every(f=>!f.values.length||f.values.includes(card.dataset[f.card]))&&todayOk&&priceOk;card.hidden=!visible;card.style.display=visible?'':'none';if(visible)shown++;}
  message.textContent=cards.length===0?'Aktuell sind keine Kurse veröffentlicht. Schau bald wieder vorbei oder tritt Sponti bei, um Kursinfos zu erhalten.':shown===0?(searchTerm?'Keine Kurse für diese Suche gefunden. Versuche einen anderen Begriff.':'Für diese Auswahl gibt es aktuell keine Kurse. Ändere die Filter.'):`${shown} ${shown===1?'Kurs':'Kurse'} verfügbar`;
 }
 buttons.forEach(button=>button.addEventListener('click',()=>{
  const attr=['filter','location','day','time'].find(key=>button.dataset[key]);if(!attr)return;
  const group=buttons.filter(b=>b.dataset[attr]);
  if(attr==='location'){group.forEach(b=>b.classList.remove('active'));button.classList.add('active');}
  else if(['alle','all'].includes(button.dataset[attr])){group.forEach(b=>b.classList.remove('active'));button.classList.add('active');}
  else{
   button.classList.toggle('active');
   const allButton=group.find(b=>['alle','all'].includes(b.dataset[attr]));
   if(attr==='filter')allButton?.classList.toggle('active',active('filter').length===0);
   if(attr==='day'||attr==='time')allButton?.classList.toggle('active',active(attr).length===0);
  }
  applyFilters();
 }));
 const element=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;};

 const upcomingRoot=document.getElementById('sponti-upcoming-events');
 const upcomingEmpty=(message)=>{
  if(!upcomingRoot)return;
  upcomingRoot.replaceChildren(element('p','sponti-upcoming-empty',message));
  upcomingRoot.setAttribute('aria-busy','false');
 };
 function renderUpcomingCourses(courses){
  if(!upcomingRoot)return;
  const bookingCutoff=Date.now()+SALE_LEAD_MS;
  const upcoming=courses.filter(course=>{
   const starts=new Date(course.starts_at).getTime();
   return Number.isFinite(starts)&&starts>bookingCutoff&&Number(course.seats)>0
    &&course.status==='published'&&!course.archived_at&&course.id&&course.title;
  }).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)).slice(0,3);
  if(!upcoming.length){upcomingEmpty('Momentan sind keine nächsten Kurse mit freien Plätzen verfügbar.');return;}

  const dateFormatter=new Intl.DateTimeFormat('de-CH',{day:'2-digit',month:'short',timeZone:'Europe/Zurich'});
  const timeFormatter=new Intl.DateTimeFormat('de-CH',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Zurich'});
  const items=upcoming.map(course=>{
   const start=new Date(course.starts_at);
   const date=dateFormatter.format(start);
   const time=timeFormatter.format(start);
   const seats=Math.floor(Number(course.seats));
   const seatText=seats===1?'1 Platz frei':seats+' Plätze frei';
   const item=element('a','sponti-upcoming-event');
   item.href='/kurs.html?id='+encodeURIComponent(String(course.id));
   item.setAttribute('aria-label',String(course.title)+' – '+date+' um '+time+' – '+seatText+' – Kursdetails öffnen');
   const calendarIcon=element('span','sponti-upcoming-calendar-clock');
   calendarIcon.setAttribute('aria-hidden','true');
   calendarIcon.innerHTML='<svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><rect x="3.5" y="6.5" width="23" height="22" rx="4"/><path d="M9.5 3.5v6M20.5 3.5v6M3.5 13h23"/><circle cx="25" cy="25" r="8.5" fill="#e8f0e2"/><path d="M25 20v5l3.5 2"/></svg>';
   const info=element('span','sponti-upcoming-info');
   const title=element('strong','sponti-upcoming-name',String(course.title));
   const metadata=element('span','sponti-upcoming-meta',date+' · '+time+' · '+seatText);
   info.append(title,metadata);
   const arrow=element('span','sponti-upcoming-arrow','›');
   arrow.setAttribute('aria-hidden','true');
   item.append(calendarIcon,info,arrow);
   return item;
  });
  upcomingRoot.replaceChildren(...items);
  upcomingRoot.setAttribute('aria-busy','false');
 }

 const countdownText=(start)=>{const ms=start-Date.now();if(ms<=0)return 'Startet jetzt';const mins=Math.floor(ms/60000);if(mins<60)return `Startet in ${Math.max(1,mins)} Min.`;const hours=Math.floor(mins/60);if(hours<24)return `Startet in ${hours} Std. ${mins%60} Min.`;const days=Math.floor(hours/24);return `Startet in ${days} ${days===1?'Tag':'Tagen'}`;};

 function render(course){
  const card=element('article','course-card'),start=new Date(course.starts_at);card.dataset.courseId=String(course.id);
  const detailUrl='/kurs.html?id='+encodeURIComponent(course.id);
  card.tabIndex=0;card.setAttribute('role','link');card.setAttribute('aria-label',`${course.title} – Kursdetails öffnen`);
  card.addEventListener('click',e=>{if(e.target.closest('a,button,input,select,textarea'))return;window.location.assign(detailUrl);});
  card.addEventListener('keydown',e=>{if(e.target!==card)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();window.location.assign(detailUrl);}});
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zurich',weekday:'short',hour:'2-digit',hourCycle:'h23'}).formatToParts(start).map(p=>[p.type,p.value]));
  const day={Mon:'mo',Tue:'th',Wed:'mi',Thu:'do',Fri:'fr',Sat:'sa',Sun:'so'}[parts.weekday];
  const category=categories[course.category]||[course.category,'clay'];
  Object.assign(card.dataset,{category:categories[course.category]?course.category:'andere',location:['zug','zuerich','luzern','solothurn','aargau','andere'].includes(course.region)?course.region:'andere',day,time:Number(parts.hour)<12?'vormittag':Number(parts.hour)<18?'nachmittag':'abend',startsAt:course.starts_at,price:String(course.price),seats:String(course.seats),placeText:[course.venue,course.region].filter(Boolean).join(' ').toLocaleLowerCase('de-CH'),searchText:[course.title,course.description,course.short_description,course.category,category[0],course.venue,course.region].filter(Boolean).join(' ').toLocaleLowerCase('de-CH')});
  const image=element('div',`course-image course-image-${category[1]}`);
  const countdown=element('span','course-countdown course-image-countdown',countdownText(start));
  countdown.dataset.startsAt=course.starts_at;
  image.append(element('span','course-category',category[0]),countdown);
  const body=element('div','course-card-body');
  const availability=element('div','course-availability'+(Number(course.seats)===1?' is-last':Number(course.seats)===2?' is-low':''));
  const availabilityTrack=element('div','course-availability-track');availabilityTrack.setAttribute('aria-hidden','true');
  const availabilityFill=element('span','course-availability-fill');
  const remainingSeats=Math.max(0,Math.floor(Number(course.seats)||0));
  // Temporary 10-seat comparison scale until the original course capacity is stored.
  const capacity=10;
  availabilityFill.style.width=Math.min(100,remainingSeats/capacity*100)+'%';
  availabilityTrack.append(availabilityFill);availability.append(availabilityTrack);
  const heading=element('h2','');const titleLink=element('a','course-title-link',course.title);titleLink.href='/kurs.html?id='+encodeURIComponent(course.id);heading.append(titleLink);const providerRow=element('p','course-provider');providerRow.hidden=true;body.append(heading,providerRow);
  const details=element('div','course-details');
  const locationText=element('span','course-location',window.SpontiPlaces?.format(course.venue)||course.venue);
  locationText.style.display='inline-flex';locationText.style.alignItems='center';locationText.style.gap='5px';
  const locationIcon=document.createElementNS('http://www.w3.org/2000/svg','svg');
  locationIcon.setAttribute('viewBox','0 0 24 24');locationIcon.setAttribute('width','15');locationIcon.setAttribute('height','15');locationIcon.setAttribute('fill','none');locationIcon.setAttribute('stroke','currentColor');locationIcon.setAttribute('stroke-width','1.8');locationIcon.setAttribute('stroke-linecap','round');locationIcon.setAttribute('stroke-linejoin','round');locationIcon.setAttribute('aria-hidden','true');
  const pinOutline=document.createElementNS('http://www.w3.org/2000/svg','path');pinOutline.setAttribute('d','M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z');
  const pinCenter=document.createElementNS('http://www.w3.org/2000/svg','circle');pinCenter.setAttribute('cx','12');pinCenter.setAttribute('cy','10');pinCenter.setAttribute('r','2.5');
  locationIcon.append(pinOutline,pinCenter);locationText.prepend(locationIcon);
  const courseDate=new Intl.DateTimeFormat('de-CH',{timeZone:'Europe/Zurich',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(start);
  const dateText=element('span','course-event-date',courseDate+' Uhr');
  const calendarIcon=document.createElementNS('http://www.w3.org/2000/svg','svg');
  calendarIcon.setAttribute('viewBox','0 0 24 24');calendarIcon.setAttribute('width','15');calendarIcon.setAttribute('height','15');calendarIcon.setAttribute('fill','none');calendarIcon.setAttribute('stroke','currentColor');calendarIcon.setAttribute('stroke-width','1.8');calendarIcon.setAttribute('stroke-linecap','round');calendarIcon.setAttribute('stroke-linejoin','round');calendarIcon.setAttribute('aria-hidden','true');
  const calendarFrame=document.createElementNS('http://www.w3.org/2000/svg','rect');
  calendarFrame.setAttribute('x','3');calendarFrame.setAttribute('y','5');calendarFrame.setAttribute('width','18');calendarFrame.setAttribute('height','16');calendarFrame.setAttribute('rx','2');
  const calendarLines=document.createElementNS('http://www.w3.org/2000/svg','path');
  calendarLines.setAttribute('d','M7 3v4M17 3v4M3 10h18');
  calendarIcon.append(calendarFrame,calendarLines);dateText.prepend(calendarIcon);
  details.append(locationText,dateText);
  const seatsCompact=element('div','course-seats-footer');
  const seatsRow=element('div','course-seats-footer-row');
  seatsRow.append(element('span','', 'Freie Plätze'),element('strong','',String(course.seats)));
  seatsCompact.append(seatsRow,availability);
  const booking=element('a','course-book','Details & buchen');booking.href='/kurs.html?id='+encodeURIComponent(course.id);booking.style.textDecoration='none';
  const priceFooter=element('div','course-price-footer');
  const priceInfo=element('div','course-price-info');
  priceInfo.append(element('span','', 'Preis pro Platz'),element('strong','course-price',new Intl.NumberFormat('de-CH',{style:'currency',currency:'CHF'}).format(Number(course.price))));
  priceFooter.append(priceInfo,booking);
  body.append(details,seatsCompact,priceFooter);card.append(image,body);return card;
 }
async function linkCourseProviders(targetCards){
  try{
   const response=await fetch('https://ehifskiigrfpxeiruyxr.supabase.co/rest/v1/rpc/list_public_course_providers',{
    method:'POST',
    headers:{apikey:'sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy','Content-Type':'application/json'},
    body:'{}',
    signal:AbortSignal.timeout(15000)
   });
   if(!response.ok)return;
   const providers=await response.json();
   if(!Array.isArray(providers))return;
   const index=new Map();
   const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
   for(const provider of providers){
    if(!provider||!uuid.test(String(provider.provider_id))||!String(provider.company||'').trim())continue;
    for(const course of (Array.isArray(provider.courses)?provider.courses:[])){
     if(course?.id)index.set(String(course.id),provider);
    }
   }
   if(cards!==targetCards)return;
   for(const card of targetCards){
    const provider=index.get(card.dataset.courseId);
    if(!provider)continue;
    const row=card.querySelector('.course-provider');
    if(!row)continue;
    const name=String(provider.company).trim();
    const link=element('a','',name);
    link.href='/anbieterprofil?id='+encodeURIComponent(String(provider.provider_id));
    row.replaceChildren(document.createTextNode('Anbieter: '),link);
    row.hidden=false;
    card.dataset.searchText+=' '+name.toLocaleLowerCase('de-CH');
   }
   applyFilters();
  }catch{/* Kursübersicht auch bei nicht erreichbaren Anbieterprofilen weiterhin anzeigen. */}
 }
 async function load(){
  grid.setAttribute('aria-busy','true');message.textContent='Kurse werden geladen …';
  try{
   const courses=[];
   for(let offset=0;;offset+=500){
    const query=new URLSearchParams({select:'*',order:'starts_at.asc,id.asc',limit:'500',offset:String(offset)});
    const response=await fetch('https://ehifskiigrfpxeiruyxr.supabase.co/rest/v1/courses?'+query,{headers:{apikey:'sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy'},signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error('Kurse konnten nicht geladen werden.');
    const data=await response.json();if(!Array.isArray(data))throw new Error('Ungültige Antwort.');courses.push(...data);if(data.length<500)break;
   }
   renderUpcomingCourses(courses);
   cards=courses.filter(c=>new Date(c.starts_at).getTime()>Date.now()+SALE_LEAD_MS&&Number(c.seats)>0).map(render);grid.replaceChildren(...cards);
   const selected=queryParams.get('filter');const match=buttons.find(b=>b.dataset.filter===selected&&selected!=='alle');if(match){match.classList.add('active');buttons.find(b=>b.dataset.filter==='alle')?.classList.remove('active');}
   const placeButton=buttons.find(b=>b.dataset.location===placeSlug);if(placeButton){buttons.filter(b=>b.dataset.location).forEach(b=>b.classList.remove('active'));placeButton.classList.add('active');}
   applyFilters();
   void linkCourseProviders(cards);
   const pending=new URLSearchParams(location.search).get('course');
   if(pending && /^[0-9a-f-]{36}$/i.test(pending)){
    const selectedCourse=courses.find(c=>String(c.id)===pending);
    if(selectedCourse)window.location.replace('/buchung.html?id='+encodeURIComponent(selectedCourse.id));
   }
  }catch{upcomingEmpty('Die nächsten Termine konnten gerade nicht geladen werden.');message.replaceChildren(document.createTextNode('Die Kurse konnten gerade nicht geladen werden. '));const retry=element('button','filter','Erneut versuchen');retry.type='button';retry.addEventListener('click',load);message.append(retry);}
  finally{grid.setAttribute('aria-busy','false');}
 }
 load();
 window.setInterval(()=>document.querySelectorAll('.course-countdown[data-starts-at]').forEach(el=>{const start=new Date(el.dataset.startsAt);el.textContent=countdownText(start);}),60000);
})();
