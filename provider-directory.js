const API='https://ehifskiigrfpxeiruyxr.supabase.co';
const KEY='sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy';
const list=document.querySelector('[data-provider-directory-list]');
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
  const mark=document.createElement('div');mark.className='provider-directory-default-mark';
  const icon=document.createElement('img');icon.src='logo.png';icon.alt='Sponti';icon.loading='lazy';
  mark.append(icon,text('span','Sponti','provider-directory-default-wordmark'));banner.append(mark);
 }
 el.append(banner);
 const body=document.createElement('div');body.className='provider-directory-content';
 if(safePath(p.logo_path)){const logo=document.createElement('img');logo.className='provider-directory-logo';logo.alt='Logo von '+p.company;logo.loading='lazy';logo.src=imageURL(p.logo_path);body.append(logo);}
 body.append(text('h3',p.company),text('p',[p.category,p.location].filter(Boolean).join(' · '),'provider-directory-meta'));
 const details=document.createElement('details');details.className='provider-directory-details';details.append(text('summary','Anbieter ansehen'));
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
   if(date&&!Number.isNaN(date.getTime()))item.append(text('p',[format.format(date),course.venue,'CHF '+Number(course.price||0).toFixed(2)].filter(Boolean).join(' · ')));
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
  const providers=await rpc('list_public_providers');
  let extras=[];try{extras=await rpc('list_public_provider_extras_v2');}catch{try{extras=await rpc('list_public_provider_extras');}catch{}}
  const extraById=new Map((Array.isArray(extras)?extras:[]).map(x=>[String(x.provider_id),x]));
  list.replaceChildren();
  for(const p of providers){list.append(card({...p,...(extraById.get(String(p.provider_id))||{})}));}
  status.textContent=providers.length?'':'Noch keine Anbieterprofile verfügbar.';
 }catch{status.textContent='Anbieterprofile sind momentan nicht verfügbar.';}
}
load();
