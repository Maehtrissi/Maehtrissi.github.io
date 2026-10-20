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
  for(const card of cards){const start=new Date(card.dataset.startsAt);const todayOk=!todayToggle?.checked||(zurichDay(start)===zurichDay(new Date())&&start.getTime()>Date.now()&&Number(card.dataset.seats)>0);const priceOk=!priceSlider||Number(card.dataset.price)<=Number(priceSlider.value)||priceSlider.value===priceSlider.max;const visible=filters.every(f=>!f.values.length||f.values.includes(card.dataset[f.card]))&&todayOk&&priceOk;card.hidden=!visible;card.style.display=visible?'':'none';if(visible)shown++;}
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
 const cancellationText=(start)=>start-Date.now()<=86400000?'Buchung verbindlich · keine kostenlose Stornierung':'Kostenlose Stornierung bis 24 h vor Beginn';

 function openBookingChoice(course){
  const overlay=element('div','guest-signup-overlay');
  const panel=element('section','guest-signup-panel booking-choice-panel');
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','booking-choice-title');
  const close=element('button','guest-signup-close','×');close.type='button';close.setAttribute('aria-label','Schliessen');
  const title=element('h2','','Wie möchtest du fortfahren?');title.id='booking-choice-title';
  const subtitle=element('p','',course.title);
  const options=element('div','booking-choice-options');
  const guest=element('button','booking-choice-option','Als Gast fortfahren');
  guest.type='button';
  guest.append(element('small','','Ohne Konto eine Kursanfrage senden'));
  const login=element('a','booking-choice-option','Anmelden');
  login.href='/profil?mode=login&course='+encodeURIComponent(course.id);
  login.append(element('small','','Mit deinem bestehenden Sponti-Konto'));
  const register=element('a','booking-choice-option','Registrieren');
  register.href='/profil?mode=register&course='+encodeURIComponent(course.id);
  register.append(element('small','','Kostenloses Konto erstellen'));
  options.append(guest,login,register);panel.append(close,title,subtitle,options);overlay.append(panel);
  document.body.append(overlay);
  const original=document.body.style.overflow;document.body.style.overflow='hidden';
  const dismiss=()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=original;overlay.remove();};
  const onKey=e=>{if(e.key==='Escape')dismiss();};
  document.addEventListener('keydown',onKey);
  close.addEventListener('click',dismiss);
  overlay.addEventListener('click',e=>{if(e.target===overlay)dismiss();});
  guest.addEventListener('click',()=>{dismiss();openGuestForm(course);});
  guest.focus();
 }
 function openGuestForm(course,account=null){

  const overlay=element('div','guest-signup-overlay');
  const panel=element('section','guest-signup-panel');
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','guest-form-title');
  const close=element('button','guest-signup-close','×');close.type='button';close.setAttribute('aria-label','Schliessen');
  const title=element('h2','',account?'Mit Konto Kurs anfragen':'Ohne Konto anmelden');title.id='guest-form-title';
  const subtitle=element('p','',course.title+' – Deine Anfrage wird an Sponti übermittelt.');
  const form=element('form','guest-signup-form');
  const field=(labelText,name,type,required)=>{const label=element('label','',labelText);const input=element('input','');input.name=name;input.type=type;input.required=required;input.maxLength=name==='email'?254:120;label.append(input);return label;};
  form.append(field('Vor- und Nachname','name','text',true),field('E-Mail-Adresse','email','email',true),field('Telefon (optional)','phone','tel',false));
  if(account){form.elements.name.value=account.name||'';form.elements.email.value=account.email||'';form.elements.phone.value=account.phone||'';form.elements.email.readOnly=true;}
  const qty=element('label','','Anzahl Plätze');const select=element('select','');select.name='quantity';
  for(let i=1;i<=Math.min(10,Math.max(1,Number(course.seats)));i++){const option=element('option','',String(i));option.value=String(i);select.append(option);}qty.append(select);form.append(qty);
  const note=element('p','guest-signup-note',account?'Deine Kontodaten wurden vorausgefüllt. Deine Anfrage wird erst nach einer Bestätigung verbindlich.':'Du brauchst kein Konto. Deine Anfrage ist erst nach einer Bestätigung verbindlich. Wir verwenden deine Angaben zur Bearbeitung dieser Kursanfrage.');
  const feedback=element('p','guest-signup-feedback');feedback.setAttribute('role','status');
  const submit=element('button','course-book','Anfrage senden');submit.type='submit';
  form.append(note,feedback,submit);panel.append(close,title,subtitle,form);overlay.append(panel);document.body.append(overlay);
  const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const dismiss=()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=oldOverflow;overlay.remove();};
  const onKey=e=>{if(e.key==='Escape')dismiss();};document.addEventListener('keydown',onKey);
  close.addEventListener('click',dismiss);overlay.addEventListener('click',e=>{if(e.target===overlay)dismiss();});
  form.addEventListener('submit',async e=>{e.preventDefault();submit.disabled=true;feedback.textContent='Anfrage wird gesendet …';
   const fields=new FormData(form);
   try{
    const response=await fetch('https://ehifskiigrfpxeiruyxr.supabase.co/rest/v1/rpc/submit_guest_course_request',{method:'POST',headers:{apikey:'sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy','Content-Type':'application/json'},body:JSON.stringify({p_course_id:course.id,p_name:String(fields.get('name')).trim(),p_email:String(fields.get('email')).trim(),p_phone:String(fields.get('phone')||'').trim(),p_quantity:Number(fields.get('quantity'))})});
    const result=await response.json();
    if(!response.ok)throw new Error(result.message||'Die Anfrage konnte nicht gesendet werden.');
    form.replaceChildren(element('p','guest-signup-success','Deine Anfrage ist eingegangen. Sponti meldet sich bei dir zur Bestätigung.'));
   }catch(err){feedback.textContent=err.message||'Bitte versuche es erneut.';submit.disabled=false;}
  });
  form.querySelector('input')?.focus();
 }
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
  const heading=element('h2','');const titleLink=element('a','course-title-link',course.title);titleLink.href='/kurs.html?id='+encodeURIComponent(course.id);heading.append(titleLink);body.append(urgency,heading,element('p','',course.description));
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
    const query=new URLSearchParams({select:'id,title,description,category,region,venue,starts_at,price,seats,booking_url',order:'starts_at.asc,id.asc',limit:'500',offset:String(offset)});
    const response=await fetch('https://ehifskiigrfpxeiruyxr.supabase.co/rest/v1/courses?'+query,{headers:{apikey:'sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy'},signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error('Kurse konnten nicht geladen werden.');
    const data=await response.json();if(!Array.isArray(data))throw new Error('Ungültige Antwort.');courses.push(...data);if(data.length<500)break;
   }
   cards=courses.map(render);grid.replaceChildren(...cards);
   const selected=new URLSearchParams(location.search).get('filter');const match=buttons.find(b=>b.dataset.filter===selected&&selected!=='alle');if(match){match.classList.add('active');buttons.find(b=>b.dataset.filter==='alle')?.classList.remove('active');}
   applyFilters();
   const pending=new URLSearchParams(location.search).get('course');
   if(pending && /^[0-9a-f-]{36}$/i.test(pending)){
    const selectedCourse=courses.find(c=>String(c.id)===pending && !c.booking_url);
    if(selectedCourse){
      history.replaceState(null,'',location.pathname);
      import('https://esm.sh/@supabase/supabase-js@2.57.0').then(async ({createClient})=>{
        const client=createClient('https://ehifskiigrfpxeiruyxr.supabase.co','sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy',{auth:{storageKey:'sponti-customer-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
        const {data:{user}}=await client.auth.getUser();
        if(!user){openBookingChoice(selectedCourse);return;}
        const {data:profile}=await client.rpc('customer_profile');
        openGuestForm(selectedCourse,{name:profile?.name||user.user_metadata?.name||'',email:user.email||'',phone:profile?.phone||''});
      }).catch(()=>openBookingChoice(selectedCourse));
    }
   }
  }catch{message.replaceChildren(document.createTextNode('Die Kurse konnten gerade nicht geladen werden. '));const retry=element('button','filter','Erneut versuchen');retry.type='button';retry.addEventListener('click',load);message.append(retry);}
  finally{grid.setAttribute('aria-busy','false');}
 }
 load();
 window.setInterval(()=>document.querySelectorAll('.course-countdown[data-starts-at]').forEach(el=>{const start=new Date(el.dataset.startsAt);el.textContent=countdownText(start);const policy=el.closest('.course-card')?.querySelector('.course-policy');if(policy)policy.textContent=cancellationText(start);}),60000);
})();
