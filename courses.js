(() => {
 const grid=document.querySelector('.course-grid');
 if(!grid)return;
 const categories={'yoga-wellness':['Yoga & Wellness','yoga'],'kochen-geniessen':['Kochen & Geniessen','pasta'],'kunst-handwerk':['Kunst & Handwerk','clay'],'fotografie-design':['Fotografie & Design','photo'],'tanz-bewegung':['Tanz & Bewegung','dance'],'natur-draussen':['Natur & Draussen','bouquet']};
 let cards=[];
 const buttons=[...document.querySelectorAll('.course-filters .filter')];
 const active=(attr)=>buttons.filter(b=>b.classList.contains('active')&&b.dataset[attr]&& !['alle','all'].includes(b.dataset[attr])).map(b=>b.dataset[attr]);
 const message=document.getElementById('course-status');
 const todayToggle=document.getElementById('filter-today');
 const priceSlider=document.getElementById('filter-price');
 const priceLabel=document.getElementById('filter-price-value');
 const zurichDay=(date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zurich',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
 const updatePriceLabel=()=>{if(priceSlider&&priceLabel){priceLabel.textContent=priceSlider.value===priceSlider.max?'Alle Preise':`Bis CHF ${priceSlider.value}`;priceSlider.style.setProperty('--price-progress',`${(Number(priceSlider.value)-Number(priceSlider.min))/(Number(priceSlider.max)-Number(priceSlider.min))*100}%`);}};
 todayToggle?.addEventListener('change',applyFilters);
 priceSlider?.addEventListener('input',()=>{updatePriceLabel();applyFilters();});
 updatePriceLabel();
 function applyFilters(){
  const filters=[['filter','category'],['location','location'],['day','day'],['time','time']].map(([button,card])=>({values:active(button),card}));
  let shown=0;
  for(const card of cards){const start=new Date(card.dataset.startsAt);const todayOk=!todayToggle?.checked||(zurichDay(start)===zurichDay(new Date())&&start.getTime()>Date.now()&&Number(card.dataset.seats)>0);const priceOk=!priceSlider||Number(card.dataset.price)<=Number(priceSlider.value)||priceSlider.value===priceSlider.max;const bookable=Number.isFinite(start.getTime())&&start.getTime()>Date.now()&&Number(card.dataset.seats)>0;const visible=bookable&&filters.every(f=>!f.values.length||f.values.includes(card.dataset[f.card]))&&todayOk&&priceOk;card.hidden=!visible;card.style.display=visible?'':'none';if(visible)shown++;}
  message.textContent=cards.length===0?'Aktuell sind keine Kurse veröffentlicht. Schau bald wieder vorbei oder tritt Sponti bei, um Kursinfos zu erhalten.':shown===0?'Für diese Auswahl gibt es aktuell keine Kurse. Ändere die Filter.':`${shown} ${shown===1?'Kurs':'Kurse'} verfügbar`;
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
 const countdownText=(start)=>{const ms=start-Date.now();if(ms<=0)return 'Startet jetzt';const mins=Math.floor(ms/60000);if(mins<60)return `Startet in ${Math.max(1,mins)} Min.`;const hours=Math.floor(mins/60);if(hours<24)return `Startet in ${hours} Std. ${mins%60} Min.`;const days=Math.floor(hours/24);return `Startet in ${days} ${days===1?'Tag':'Tagen'}`;};
 const cancellationText=()=> 'Stornobedingungen beim Kurs prüfen';

 function render(course){
  const card=element('article','course-card'),start=new Date(course.starts_at);
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zurich',weekday:'short',hour:'2-digit',hourCycle:'h23'}).formatToParts(start).map(p=>[p.type,p.value]));
  const day={Mon:'mo',Tue:'th',Wed:'mi',Thu:'do',Fri:'fr',Sat:'sa',Sun:'so'}[parts.weekday];
  const category=categories[course.category]||[course.category,'clay'];
  Object.assign(card.dataset,{category:course.category,location:course.region,day,time:Number(parts.hour)<12?'vormittag':Number(parts.hour)<18?'nachmittag':'abend',startsAt:course.starts_at,price:String(course.price),seats:String(course.seats)});
  const image=element('div',`course-image course-image-${category[1]}`);
  image.append(element('span','course-category',category[0]),element('span','course-date',new Intl.DateTimeFormat('de-CH',{timeZone:'Europe/Zurich',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(start)));
  const body=element('div','course-card-body');
  const urgency=element('div','course-urgency');
  const countdown=element('span','course-countdown',countdownText(start));
  countdown.dataset.startsAt=course.starts_at;
  const seats=element('span',Number(course.seats)<=2?'course-spots course-spots-low':'course-spots',course.seats===1?'Letzter Platz':`Noch ${course.seats} Plätze`);
  urgency.append(countdown,seats);
  const heading=element('h2','');const titleLink=element('a','course-title-link',course.title);titleLink.href='/kurs.html?id='+encodeURIComponent(course.id);heading.append(titleLink);body.append(urgency,heading,element('p','course-short-description',(course.short_description||course.description||'').replace(/\*\*/g,'').slice(0,180)));
  const details=element('div','course-details');details.append(element('span','','📍 '+course.venue),element('strong','',`${course.seats} ${course.seats===1?'Platz':'Plätze'} frei`));
  const bottom=element('div','course-bottom');bottom.append(element('span','course-price',new Intl.NumberFormat('de-CH',{style:'currency',currency:'CHF'}).format(Number(course.price))));
  const booking=element('a','course-book','Details & buchen');booking.href='/kurs.html?id='+encodeURIComponent(course.id);booking.style.textDecoration='none';
  const policy=element('div','course-policy',cancellationText(start));
  bottom.append(booking);body.append(details,policy,bottom);card.append(image,body);return card;
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
   cards=courses.filter(c=>new Date(c.starts_at).getTime()>Date.now()&&Number(c.seats)>0).map(render);grid.replaceChildren(...cards);
   const queryParams=new URLSearchParams(location.search);const selected=queryParams.get('filter');const match=buttons.find(b=>b.dataset.filter===selected&&selected!=='alle');if(match){match.classList.add('active');buttons.find(b=>b.dataset.filter==='alle')?.classList.remove('active');}
   const requestedPlace=queryParams.get('ort');const placeButton=buttons.find(b=>b.dataset.location===requestedPlace);if(placeButton){buttons.filter(b=>b.dataset.location).forEach(b=>b.classList.remove('active'));placeButton.classList.add('active');}
   applyFilters();
   const pending=new URLSearchParams(location.search).get('course');
   if(pending && /^[0-9a-f-]{36}$/i.test(pending)){
    const selectedCourse=courses.find(c=>String(c.id)===pending);
    if(selectedCourse)window.location.replace('/buchung.html?id='+encodeURIComponent(selectedCourse.id));
   }
  }catch{message.replaceChildren(document.createTextNode('Die Kurse konnten gerade nicht geladen werden. '));const retry=element('button','filter','Erneut versuchen');retry.type='button';retry.addEventListener('click',load);message.append(retry);}
  finally{grid.setAttribute('aria-busy','false');}
 }
 load();
 window.setInterval(()=>document.querySelectorAll('.course-countdown[data-starts-at]').forEach(el=>{const start=new Date(el.dataset.startsAt);el.textContent=countdownText(start);const policy=el.closest('.course-card')?.querySelector('.course-policy');if(policy)policy.textContent=cancellationText(start);}),60000);
})();
