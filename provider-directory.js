const API='https://ehifskiigrfpxeiruyxr.supabase.co';
const KEY='sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy';
const list=document.querySelector('[data-provider-directory-list]'),status=document.querySelector('[data-provider-directory-status]');
const text=(tag,value,cls)=>{const el=document.createElement(tag);el.textContent=value||'';if(cls)el.className=cls;return el;};
function card(p){
 const el=document.createElement('article');el.className='provider-directory-card';
 const images=Array.isArray(p.photos)?p.photos:[];
 if(images.length){const img=document.createElement('img');img.className='provider-directory-cover';img.loading='lazy';img.alt='Einblick bei '+p.company;img.src=API+'/storage/v1/object/public/provider-gallery/'+images[0].split('/').map(encodeURIComponent).join('/');el.append(img);}
 else el.append(text('div','Sponti Anbieter','provider-directory-placeholder'));
 const body=document.createElement('div');body.className='provider-directory-content';
 body.append(text('h3',p.company),text('p',[p.category,p.location].filter(Boolean).join(' · '),'provider-directory-meta'));
 if(p.description)body.append(text('p',p.description.length>180?p.description.slice(0,177)+'…':p.description));
 const details=document.createElement('details');details.className='provider-directory-details';details.append(text('summary','Anbieter ansehen'));
 if(p.description)details.append(text('p',p.description));
 if(images.length>1){const gallery=document.createElement('div');gallery.className='provider-directory-photos';for(const path of images.slice(1,5)){const img=document.createElement('img');img.loading='lazy';img.alt='Weiterer Einblick bei '+p.company;img.src=API+'/storage/v1/object/public/provider-gallery/'+path.split('/').map(encodeURIComponent).join('/');gallery.append(img);}details.append(gallery);}
 if(p.website&&/^https?:\/\//i.test(p.website)){const link=document.createElement('a');link.href=p.website;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Website besuchen ↗';details.append(link);}
 body.append(details);el.append(body);return el;
}
async function load(){try{const r=await fetch(API+'/rest/v1/rpc/list_public_providers',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:'{}'});if(!r.ok)throw Error('Anbieter konnten nicht geladen werden.');const data=await r.json();list.replaceChildren();for(const p of data)list.append(card(p));status.textContent=data.length?'': 'Noch keine Anbieterprofile verfügbar.';}catch(e){status.textContent='Anbieterprofile sind momentan nicht verfügbar.';}}
load();