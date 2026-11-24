const API='https://ehifskiigrfpxeiruyxr.supabase.co';
const KEY='sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy';
const list=document.querySelector('[data-provider-directory-list]');
const compact=list?.dataset.previewLimit==='2';
const status=document.querySelector('[data-provider-directory-status]');
const text=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value||'';if(cls)e.className=cls;return e;};
const validURL=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}};
const imageURL=path=>API+'/storage/v1/object/public/provider-gallery/'+path.split('/').map(encodeURIComponent).join('/');
const safePath=path=>typeof path==='string'&&/^[0-9a-f-]{36}\/[\w.-]+$/.test(path);
function link(label,value){const url=validURL(value);if(!url)return null;const a=text('a',label+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function card(p){
 const el=document.createElement('article');el.className='provider-directory-card';
 const photos=Array.isArray(p.photos)?p.photos.filter(safePath):[];
 // The banner is independent from the photo gallery.
 const banner=document.createElement('div');banner.className='provider-directory-banner';
 if(safePath(p.banner_path)){
  const img=document.createElement('img');img.className='provider-directory-cover';img.loading='lazy';
  img.alt='Profilbanner von '+p.company;img.src=imageURL(p.banner_path);banner.append(img);
 }else{
  banner.classList.add('is-default');
  const image=document.createElement('img');image.className='provider-directory-cover';
  image.src='/sponti-standard-banner.webp?v=20261123b';image.alt='Sponti Standardbanner';image.loading='lazy';
  banner.append(image);
 }
 const identity=document.createElement('div');identity.className='provider-directory-identity';
 if(safePath(p.logo_path)){const logo=document.createElement('img');logo.className='provider-directory-logo';logo.alt='Logo von '+p.company;logo.loading='lazy';logo.src=imageURL(p.logo_path);identity.append(logo);}
 else{const fallback=text('span','S','provider-directory-logo provider-directory-logo-fallback');identity.append(fallback);}
 const heading=document.createElement('div');heading.className='provider-directory-heading-overlay';
 const providerName=text('h3');const nameLink=text('a',p.company);nameLink.href='/anbieterprofil?id='+encodeURIComponent(String(p.provider_id));providerName.append(nameLink);heading.append(providerName,text('p',p.category||'Kursanbieter','provider-directory-meta'));identity.append(heading);banner.append(identity);
 el.append(banner);
 const body=document.createElement('div');body.className='provider-directory-content';
 if(p.location)body.append(text('p',window.SpontiPlaces?.format(p.location)||p.location,'provider-directory-location'));
 const profileLink=text('a','Anbieterprofil ansehen','provider-directory-profile-link');profileLink.href='/anbieterprofil?id='+encodeURIComponent(String(p.provider_id));body.append(profileLink);
 const details=document.createElement('details');details.className='provider-directory-details';details.append(text('summary','Mehr über den Anbieter'));
 const about=String(p.about_text||'').trim();
 if(about)details.append(text('h4','Über uns'),text('p',about));
 const specialties=Array.isArray(p.specialties)?p.specialties:[];
 if(specialties.length){details.append(text('h4','Spezialgebiete und Angebote'));for(const s of specialties.slice(0,30)){if(!s||typeof s.name!=='string'||!s.name.trim())continue;const row=document.createElement('div');row.className='provider-directory-specialty';row.append(text('strong',s.name));if(s.description)row.append(text('p',s.description));details.append(row);}}
 if(photos.length){details.append(text('h4','Einblicke'));const gallery=document.createElement('div');gallery.className='provider-directory-photos';for(const path of photos.slice(0,5)){const img=document.createElement('img');img.loading='lazy';img.alt='Einblick bei '+p.company;img.src=imageURL(path);gallery.append(img);}details.append(gallery);}
 const website=link('Website besuchen',p.website);if(website)details.append(website);
 for(const social of (Array.isArray(p.social_links)?p.social_links:[]).slice(0,20)){if(!social)continue;const a=link(String(social.label||'Link'),social.url);if(a){a.className='provider-directory-social-link';details.append(a);}}
 details.append(text('h4','Kurse dieses Anbieters'));
 const courses=Array.isArray(p.courses)?p.courses:[];
 if(!courses.length)details.append(text('p','Momentan sind keine Kurse veröffentlicht.'));
 else{
  const format=new Intl.DateTimeFormat('de-CH',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Zurich'});
  for(const course of courses.slice(0,40)){
   const item=document.createElement('article');item.className='provider-directory-course';
   item.append(text('strong',course.title||'Kurs'));
   const date=course.starts_at?new Date(course.starts_at):null;
   if(date&&!Number.isNaN(date.getTime()))item.append(text('p',[format.format(date),window.SpontiPlaces?.format(course.venue)||course.venue,'CHF '+Number(course.price||0).toFixed(2)].filter(Boolean).join(' · ')));
   if(course.description)item.append(text('p',course.description));
   const booking=link('Zur Buchung',course.booking_url);if(booking)item.append(booking);
   details.append(item);
  }
 }
 body.append(details);el.append(body);return el;
}
async function rpc(name){
 const r=await fetch(API+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw new Error('Anbieter konnten nicht geladen werden.');return r.json();
}
async function load(){
 try{
  const providers=await rpc('list_public_course_providers');
  let extras=[];try{extras=await rpc('list_public_provider_extras_v2');}catch{try{extras=await rpc('list_public_provider_extras');}catch{}}
  const extraById=new Map((Array.isArray(extras)?extras:[]).map(x=>[String(x.provider_id),x]));
  list.replaceChildren();
  const REGION_WORDS={zug:['zug','baar','cham','steinhausen','rotkreuz','risch','hünenberg','huenenberg','ägeri','aegeri','menzingen','neuheim','walchwil'],luzern:['luzern','kriens','emmen','horw','ebikon','sursee','meggen','littau'],zuerich:['zürich','zuerich','winterthur','uster','dübendorf','wädenswil','horgen','kloten'],aargau:['aargau','aarau','baden','wettingen','wohlen','lenzburg','brugg','zofingen','muri','rheinfelden'],solothurn:['solothurn','olten','grenchen']};
  const region=list?.dataset.region||'';const words=REGION_WORDS[region]||[];
  const inRegion=p=>!words.length||[p.location,...(Array.isArray(p.courses)?p.courses.map(c=>c.venue):[])].some(v=>words.some(w=>String(v||'').toLowerCase().includes(w)));
  const activeProviders=providers.filter(p=>Array.isArray(p.courses)&&p.courses.some(c=>c.starts_at&&new Date(c.starts_at).getTime()>Date.now())&&inRegion(p));
  for(const p of (compact?activeProviders.slice(0,2):activeProviders)){list.append(card({...p,...(extraById.get(String(p.provider_id))||{})}));}
  status.classList.toggle('is-empty',activeProviders.length===0);
  if(activeProviders.length){
   status.replaceChildren();
  }else{
   const icon=document.createElement('span');
   icon.className='provider-directory-empty-icon';
   icon.setAttribute('aria-hidden','true');
   icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="m9.5 15 1.7 1.7 3.6-3.6"/></svg>';
   const title=text('strong','Noch keine Anbieter mit aktuellen Kursen verfügbar.','provider-directory-empty-title');
   const hint=text('span','Sobald neue Kursanbieter ihre Angebote veröffentlichen, findest du sie hier.','provider-directory-empty-subtitle');
   status.replaceChildren(icon,title,hint);
  }
 }catch{status.classList.remove('is-empty');status.textContent='Anbieterprofile sind momentan nicht verfügbar.';}
}
load();
