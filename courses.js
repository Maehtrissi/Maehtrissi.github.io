(() => {
 const grid=document.querySelector('.course-grid');
 if(!grid)return;
 const categories={'yoga-wellness':['Yoga & Wellness','yoga'],'kochen-geniessen':['Kochen & Geniessen','pasta'],'kunst-handwerk':['Kunst & Handwerk','clay'],'fotografie-design':['Fotografie & Design','photo'],'tanz-bewegung':['Tanz & Bewegung','dance'],'natur-draussen':['Natur & Draussen','bouquet']};
 let cards=[];
 const buttons=[...document.querySelectorAll('.course-filters .filter')];
 const active=(attr)=>buttons.filter(b=>b.classList.contains('active')&&b.dataset[attr]&& !['alle','all'].includes(b.dataset[attr])).map(b=>b.dataset[attr]);
 const message=document.getElementById('course-status');
 function applyFilters(){
  const filters=[['filter','category'],['location','location'],['day','day'],['time','time']].map(([button,card])=>({values:active(button),card}));
  let shown=0;
  for(const card of cards){const visible=filters.every(f=>!f.values.length||f.values.includes(card.dataset[f.card]));card.hidden=!visible;card.style.display=visible?'':'none';if(visible)shown++;}
  message.textContent=cards.length===0?'Aktuell sind keine Kurse veröffentlicht. Schau bald wieder vorbei oder tritt Sponti bei, um Kursinfos zu erhalten.':shown===0?'Für diese Auswahl gibt es aktuell keine Kurse. Ändere die Filter.':`${shown} ${shown===1?'Kurs':'Kurse'} verfügbar`;
 }
 buttons.forEach(button=>button.addEventListener('click',()=>{
  const attr=['filter','location','day','time'].find(key=>button.dataset[key]);if(!attr)return;
  const group=buttons.filter(b=>b.dataset[attr]);
  if(attr==='location'){group.forEach(b=>b.classList.remove('active'));button.classList.add('active');}
  else if(button.dataset[attr]==='alle'){group.forEach(b=>b.classList.remove('active'));button.classList.add('active');}
  else{button.classList.toggle('active');if(attr==='filter')group.find(b=>b.dataset.filter==='alle')?.classList.toggle('active',active('filter').length===0);}
  applyFilters();
 }));
 const element=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;};
 const countdownText=(start)=>{const ms=start-Date.now();if(ms<=0)return 'Startet jetzt';const mins=Math.floor(ms/60000);if(mins<60)return `Startet in ${Math.max(1,mins)} Min.`;const hours=Math.floor(mins/60);if(hours<24)return `Startet in ${hours} Std. ${mins%60} Min.`;const days=Math.floor(hours/24);return `Startet in ${days} ${days===1?'Tag':'Tagen'}`;};
 const cancellationText=(start)=>start-Date.now()<=86400000?'Buchung verbindlich · keine kostenlose Stornierung':'Kostenlose Stornierung bis 24 h vor Beginn';
 function render(course){
  const card=element('article','course-card'),start=new Date(course.starts_at);
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zurich',weekday:'short',hour:'2-digit',hourCycle:'h23'}).formatToParts(start).map(p=>[p.type,p.value]));
  const day={Mon:'mo',Tue:'th',Wed:'mi',Thu:'do',Fri:'fr',Sat:'sa',Sun:'so'}[parts.weekday];
  const category=categories[course.category]||[course.category,'clay'];
  Object.assign(card.dataset,{category:course.category,location:course.region,day,time:Number(parts.hour)<12?'vormittag':Number(parts.hour)<18?'nachmittag':'abend'});
  const image=element('div',`course-image course-image-${category[1]}`);
  image.append(element('span','course-category',category[0]),element('span','course-date',new Intl.DateTimeFormat('de-CH',{timeZone:'Europe/Zurich',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(start)));
  const body=element('div','course-card-body');
  const urgency=element('div','course-urgency');
  const countdown=element('span','course-countdown',countdownText(start));
  countdown.dataset.startsAt=course.starts_at;
  const seats=element('span',Number(course.seats)<=2?'course-spots course-spots-low':'course-spots',course.seats===1?'Letzter Platz':`Noch ${course.seats} Plätze`);
  urgency.append(countdown,seats);
  body.append(urgency,element('h2','',course.title),element('p','',course.description));
  const details=element('div','course-details');details.append(element('span','','📍 '+course.venue),element('strong','',`${course.seats} ${course.seats===1?'Platz':'Plätze'} frei`));
  const bottom=element('div','course-bottom');bottom.append(element('span','course-price',new Intl.NumberFormat('de-CH',{style:'currency',currency:'CHF'}).format(Number(course.price))));
  let booking=null;
  try{if(course.booking_url){const url=new URL(course.booking_url);if(['https:','http:'].includes(url.protocol)&&!url.username&&!url.password){booking=element('a','course-book','Zur Buchung');booking.href=url.href;booking.target='_blank';booking.rel='noopener noreferrer';booking.style.textDecoration='none';}}}catch{/* Ignore invalid legacy links. */}
  if(!booking){booking=element('button','course-book','Infos erhalten');booking.type='button';booking.addEventListener('click',()=>document.querySelector('[data-open-booking]')?.click());}
  const policy=element('div','course-policy',cancellationText(start));
  bottom.append(booking);body.append(details,policy,bottom);card.append(image,body);return card;
 }
 async function load(){
  grid.setAttribute('aria-busy','true');message.textContent='Kurse werden geladen …';
  try{
   const courses=[];
   for(let offset=0;;offset+=500){
    const query=new URLSearchParams({select:'id,title,description,category,region,venue,starts_at,price,seats,booking_url',order:'starts_at.asc,id.asc',limit:'500',offset:String(offset)});
    const response=await fetch('https://ehifskiigrfpxeiruyxr.supabase.co/rest/v1/courses?'+query,{headers:{apikey:'sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy'},signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error('Kurse konnten nicht geladen werden.');
    const data=await response.json();if(!Array.isArray(data))throw new Error('Ungültige Antwort.');courses.push(...data);if(data.length<500)break;
   }
   cards=courses.map(render);grid.replaceChildren(...cards);
   const selected=new URLSearchParams(location.search).get('filter');const match=buttons.find(b=>b.dataset.filter===selected&&selected!=='alle');if(match){match.classList.add('active');buttons.find(b=>b.dataset.filter==='alle')?.classList.remove('active');}
   applyFilters();
  }catch{message.replaceChildren(document.createTextNode('Die Kurse konnten gerade nicht geladen werden. '));const retry=element('button','filter','Erneut versuchen');retry.type='button';retry.addEventListener('click',load);message.append(retry);}
  finally{grid.setAttribute('aria-busy','false');}
 }
 load();
 window.setInterval(()=>document.querySelectorAll('.course-countdown[data-starts-at]').forEach(el=>{const start=new Date(el.dataset.startsAt);el.textContent=countdownText(start);const policy=el.closest('.course-card')?.querySelector('.course-policy');if(policy)policy.textContent=cancellationText(start);}),60000);
})();
