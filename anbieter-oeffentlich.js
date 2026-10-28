const API='https://ehifskiigrfpxeiruyxr.supabase.co',KEY='sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy';
const output=document.getElementById('public-provider-content'),status=document.getElementById('public-provider-status');
const id=new URLSearchParams(location.search).get('id');
const el=(tag,value,cls)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=String(value);if(cls)node.className=cls;return node;};
const safePath=v=>typeof v==='string'&&/^[0-9a-f-]{36}\/[\w.-]+$/.test(v);
const imageUrl=v=>API+'/storage/v1/object/public/provider-gallery/'+v.split('/').map(encodeURIComponent).join('/');
const safeUrl=v=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}};
const link=(label,url)=>{const href=safeUrl(url);if(!href)return null;const a=el('a',label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;};
function section(title){const s=el('section',undefined,'public-provider-section');s.append(el('h2',title));output.append(s);return s;}
async function rpc(name){const res=await fetch(API+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});if(!res.ok)throw new Error('Anbieterprofile konnten nicht geladen werden.');return res.json();}
function render(p){
 document.title=p.company+' | Sponti Schweiz';
 const hero=el('div',undefined,'public-provider-hero'),img=document.createElement('img');img.src=safePath(p.banner_path)?imageUrl(p.banner_path):'/sponti-standard-banner.svg';img.alt='Banner von '+p.company;hero.append(img);
 const identity=el('div',undefined,'public-provider-identity');
 if(safePath(p.logo_path)){const logo=document.createElement('img');logo.src=imageUrl(p.logo_path);logo.alt='Logo von '+p.company;logo.className='public-provider-logo';identity.append(logo);}
 else identity.append(el('span','S','public-provider-logo public-provider-placeholder'));
 const heading=el('div');heading.append(el('h1',p.company),el('p',p.category||'Kursanbieter'));identity.append(heading);hero.append(identity);output.append(hero);
 const about=section('Über uns');about.append(el('p',p.about_text||'Dieser Anbieter hat noch keine Beschreibung hinterlegt.'));
 const info=section('Weitere Informationen');
 if(p.location)info.append(el('p','Standort: '+p.location));
 if(p.public_email){const a=el('a',p.public_email);a.href='mailto:'+p.public_email;a.className='public-provider-contact';const row=el('p',undefined,'public-provider-contact-row');row.append(el('span','E-Mail'),a);info.append(row);}
 if(p.public_phone){const a=el('a',p.public_phone);a.href='tel:'+p.public_phone.replace(/[^+0-9]/g,'');a.className='public-provider-contact';const row=el('p',undefined,'public-provider-contact-row');row.append(el('span','Telefon'),a);info.append(row);}
 const website=link('Website besuchen',p.website);
 const specialties=Array.isArray(p.specialties)?p.specialties:[];if(specialties.some(item=>item?.name)){const s=section('Unsere Angebote');s.classList.add('public-provider-offers');const row=el('div',undefined,'provider-offer-pills');for(const item of specialties.slice(0,30)){if(item?.name)row.append(el('span',item.name,'provider-offer-pill'));}s.append(row);output.insertBefore(s,about);}
 const photos=(Array.isArray(p.photos)?p.photos:[]).filter(safePath).slice(0,5);if(photos.length){const s=section('Einblicke'),gallery=el('div',undefined,'public-provider-gallery');for(const path of photos){const photo=document.createElement('img');photo.src=imageUrl(path);photo.alt='Einblick bei '+p.company;photo.loading='lazy';const trigger=el('button',undefined,'public-provider-photo-button');trigger.type='button';trigger.setAttribute('aria-label','Foto vergrössern: '+photo.alt);trigger.append(photo);trigger.addEventListener('click',()=>openPhoto(photo.src,photo.alt));gallery.append(trigger);}s.append(gallery);}
 const socials=(Array.isArray(p.social_links)?p.social_links:[]);if(website||socials.some(entry=>safeUrl(entry?.url))){const s=section('Links');if(website)s.append(website);for(const entry of socials.slice(0,20)){const a=link(entry.label||'Link',entry.url);if(a)s.append(a);}}
 const courses=section('Kurse dieses Anbieters');const rows=Array.isArray(p.courses)?p.courses:[];if(!rows.length)courses.append(el('p','Momentan sind keine Kurse veröffentlicht.'));
 const fmt=new Intl.DateTimeFormat('de-CH',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Zurich'});
 for(const course of rows.slice(0,40)){const box=el('article',undefined,'public-provider-item');box.append(el('h3',course.title||'Kurs'));if(course.starts_at){const date=new Date(course.starts_at);if(!Number.isNaN(date.getTime()))box.append(el('p',fmt.format(date)+' · '+(course.venue||'')+' · CHF '+Number(course.price||0).toFixed(2)));}if(course.description)box.append(el('p',course.description));const book=link('Zur Buchung',course.booking_url);if(book)box.append(book);courses.append(box);}
 status.hidden=true;output.hidden=false;
}
(async()=>{try{if(!id||!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Ungültiger Anbieterlink.');const providers=await rpc('list_public_providers');const basic=(Array.isArray(providers)?providers:[]).find(p=>String(p.provider_id)===id);if(!basic)throw new Error('Dieses Anbieterprofil ist nicht öffentlich verfügbar.');let extra=[];try{extra=await rpc('list_public_provider_extras_v2');}catch{try{extra=await rpc('list_public_provider_extras');}catch{}}const detail=(Array.isArray(extra)?extra:[]).find(p=>String(p.provider_id)===id)||{};let contacts=[];try{contacts=await rpc('list_public_provider_contacts');}catch{}const contact=(Array.isArray(contacts)?contacts:[]).find(p=>String(p.provider_id)===id)||{};render({...basic,...detail,...contact});}catch(e){status.textContent=e.message||'Profil konnte nicht geladen werden.';}})();

function openPhoto(src,alt){
 const dialog=document.createElement('dialog');dialog.className='provider-photo-dialog';dialog.setAttribute('aria-label','Vergrösserte Fotoansicht');
 const close=el('button','×','provider-photo-close');close.type='button';close.setAttribute('aria-label','Foto schliessen');
 const photo=document.createElement('img');photo.src=src;photo.alt=alt;
 dialog.append(close,photo);document.body.append(dialog);
 const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;dialog.remove();},{once:true});
 dialog.showModal();close.focus();
}
