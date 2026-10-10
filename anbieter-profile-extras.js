import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const root=document.querySelector('[data-provider-account]');
const form=root?.querySelector('[data-provider-form="profile"]');
const specialties=root?.querySelector('[data-provider-specialties]');
const links=root?.querySelector('[data-provider-social-links]');
const logoInput=root?.querySelector('[data-provider-logo]');
const logoPreview=root?.querySelector('[data-provider-logo-preview]');
const bannerInput=root?.querySelector('[data-provider-banner]');
const bannerPreview=root?.querySelector('[data-provider-banner-preview]');
const message=root?.querySelector('[data-provider-extra-status]');
const publicPreview=root?.querySelector('[data-provider-preview]');
const coursesPreview=root?.querySelector('[data-provider-preview-courses]');
const client=createClient('https://ehifskiigrfpxeiruyxr.supabase.co','sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy',{
 auth:{storageKey:'sponti-provider-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});
const bucket='provider-gallery';
let currentUser=null,logoPath=null,bannerPath=null,loading=false,uploading=false;
const text=(tag,value,className)=>{const e=document.createElement(tag);e.textContent=value||'';if(className)e.className=className;return e;};
const notify=value=>{if(message)message.textContent=value;};
const safeLink=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}};
const photoUrl=path=>client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
function row(target,fields,values={}){
 const wrap=document.createElement('div');wrap.className='provider-extra-row';
 for(const [key,title,long] of fields){
  const label=document.createElement('label');label.textContent=title;
  const input=document.createElement(long?'textarea':'input');
  if(!long)input.type=key==='url'?'url':'text';
  if(long)input.rows=2;
  input.dataset.providerExtra=key;input.value=String(values[key]||'');
  input.maxLength=key==='url'?2048:key==='description'?1000:150;
  label.append(input);wrap.append(label);
 }
 const remove=text('button','Entfernen','button account-secondary');
 remove.type='button';remove.addEventListener('click',()=>{wrap.remove();renderPreviewExtras();});
 wrap.append(remove);target.append(wrap);
 wrap.querySelectorAll('input,textarea').forEach(e=>e.addEventListener('input',renderPreviewExtras));
}
function addSpecialty(value={}){if(specialties.children.length>=30){notify('Maximal 30 Spezialgebiete.');return;}row(specialties,[['name','Bezeichnung',false],['description','Beschreibung',true]],value);}
function addLink(value={}){if(links.children.length>=20){notify('Maximal 20 Links.');return;}row(links,[['label','Name',false],['url','Link (https://...)',false]],value);}
root?.querySelector('[data-add-specialty]')?.addEventListener('click',()=>addSpecialty());
root?.querySelector('[data-add-link]')?.addEventListener('click',()=>addLink());
function readRows(parent,keys){
 return [...parent.children].map(row=>{
  const item={};for(const key of keys)item[key]=row.querySelector('[data-provider-extra="'+key+'"]')?.value.trim()||'';
  return item;
 }).filter(item=>keys.some(key=>item[key]));
}
function readFields(){
 const specialtiesValue=readRows(specialties,['name','description']).filter(s=>s.name);
 const linkValues=readRows(links,['label','url']).filter(x=>x.label&&safeLink(x.url)).map(x=>({label:x.label,url:safeLink(x.url)}));
 return {about_text:form.elements.about_text.value.trim(),specialties:specialtiesValue,social_links:linkValues,logo_path:logoPath,banner_path:bannerPath};
}
window.SpontiProviderExtras={readFields};
form?.elements.about_text?.addEventListener('input',renderPreviewExtras);
function renderLogo(){
 logoPreview.replaceChildren();
 if(!logoPath)return;
 const img=document.createElement('img');img.className='provider-logo-image';img.alt='Firmenlogo';img.src=photoUrl(logoPath);
 const remove=text('button','Logo entfernen','button account-secondary');remove.type='button';
 remove.addEventListener('click',async()=>{
  if(!currentUser||uploading)return;
  uploading=true;remove.disabled=true;
  const old=logoPath;
  const res=await client.from('provider_profiles').update({logo_path:null,updated_at:new Date().toISOString()}).eq('user_id',currentUser.id);
  if(res.error)notify('Logo konnte nicht entfernt werden: '+res.error.message);
  else{logoPath=null;renderLogo();renderPreviewExtras();await client.storage.from(bucket).remove([old]);notify('Logo entfernt.');}
  uploading=false;
 });
 logoPreview.append(img,remove);
}
function renderPreviewExtras(){
 const card=publicPreview?.querySelector('.provider-public-card');if(!card)return;
 card.querySelector('[data-provider-extra-preview]')?.remove();
 // Keep the banner above the company name and independent from other photos.
 card.querySelector('[data-provider-banner-display]')?.remove();
 const banner=document.createElement('div');banner.dataset.providerBannerDisplay='';
 banner.className='provider-profile-preview-banner'+(bannerPath?'':' is-default');
 if(bannerPath){const img=document.createElement('img');img.src=photoUrl(bannerPath);img.alt='Profilbanner';banner.append(img);}
 else{const mark=document.createElement('div');mark.className='provider-default-mark';const img=document.createElement('img');img.src='logo.png';img.alt='Sponti';mark.append(img,text('strong','Sponti'));banner.append(mark);}
 card.prepend(banner);
 const box=document.createElement('div');box.dataset.providerExtraPreview='';
 if(logoPath){const img=document.createElement('img');img.src=photoUrl(logoPath);img.alt='Firmenlogo';img.className='provider-logo-image';box.append(img);}
 const about=form?.elements.about_text?.value.trim();if(about){box.append(text('h4','Über uns'),text('p',about));}
 const specialtiesValue=readRows(specialties,['name','description']).filter(x=>x.name);
 if(specialtiesValue.length){
  box.append(text('h4','Unsere Angebote'));
  const container=document.createElement('div');container.className='provider-public-specialties';
  for(const item of specialtiesValue){const article=document.createElement('article');article.append(text('strong',item.name));if(item.description)article.append(text('p',item.description));container.append(article);}
  box.append(container);
 }
 const linksValue=readRows(links,['label','url']).filter(x=>x.label&&safeLink(x.url));
 if(linksValue.length){box.append(text('h4','Weitere Links'));for(const item of linksValue){const a=document.createElement('a');a.textContent=item.label+' ↗';a.href=safeLink(item.url);a.target='_blank';a.rel='noopener noreferrer';a.style.display='block';box.append(a);}}
 card.append(box);
}
const observer=new MutationObserver(renderPreviewExtras);
if(publicPreview)observer.observe(publicPreview,{childList:true});
async function loadCourses(){
 if(!currentUser||!coursesPreview)return;
 const {data,error}=await client.from('provider_courses').select('id,title,description,venue,starts_at,price,seats,active').eq('provider_id',currentUser.id).order('starts_at',{ascending:true});
 coursesPreview.replaceChildren();
 if(error){coursesPreview.append(text('p','Kurse konnten nicht geladen werden.'));return;}
 const active=(data||[]).filter(c=>c.active);
 coursesPreview.append(text('h3','Kurse dieses Anbieters'));
 if(!active.length){coursesPreview.append(text('p','Momentan sind keine Kurse veröffentlicht.'));return;}
 const formatter=new Intl.DateTimeFormat('de-CH',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Zurich'});
 for(const c of active){
  const article=document.createElement('article');article.className='provider-course-item';
  article.append(text('h4',c.title),text('p',formatter.format(new Date(c.starts_at))+' · '+c.venue+' · CHF '+Number(c.price).toFixed(2)));
  if(c.description)article.append(text('p',c.description));coursesPreview.append(article);
 }
}
async function refresh(){
 if(loading)return;loading=true;
 try{
  const {data:{user}}=await client.auth.getUser();currentUser=user;
  if(!user){logoPath=null;bannerPath=null;specialties?.replaceChildren();links?.replaceChildren();logoPreview?.replaceChildren();bannerPreview?.replaceChildren();coursesPreview?.replaceChildren();return;}
  const {data,error}=await client.from('provider_profiles').select('about_text,specialties,social_links,logo_path,banner_path').eq('user_id',user.id).maybeSingle();
  if(error){notify('Weitere Profildaten konnten nicht geladen werden: '+error.message);return;}
  form.elements.about_text.value=data?.about_text||'';
  logoPath=data?.logo_path||null;
  bannerPath=data?.banner_path||null;
  specialties.replaceChildren();links.replaceChildren();
  for(const item of Array.isArray(data?.specialties)?data.specialties:[])addSpecialty(item);
  for(const item of Array.isArray(data?.social_links)?data.social_links:[])addLink(item);
  renderLogo();renderBanner();renderPreviewExtras();await loadCourses();
 }catch(error){notify(error.message||'Profil konnte nicht geladen werden.');}
 finally{loading=false;}
}
logoInput?.addEventListener('change',async()=>{
 const file=logoInput.files?.[0];logoInput.value='';
 if(!file)return;
 if(!currentUser){notify('Bitte zuerst anmelden.');return;}
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){notify('Nur JPG, PNG oder WebP bis 5 MB erlaubt.');return;}
 if(uploading)return;
 uploading=true;logoInput.disabled=true;
 const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
 const path=currentUser.id+'/logo-'+crypto.randomUUID()+'.'+ext;
 try{
  const upload=await client.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});
  if(upload.error)throw upload.error;
  const result=await client.from('provider_profiles').update({logo_path:path,updated_at:new Date().toISOString()}).eq('user_id',currentUser.id);
  if(result.error){await client.storage.from(bucket).remove([path]);throw result.error;}
  const previous=logoPath;logoPath=path;renderLogo();renderPreviewExtras();
  if(previous)await client.storage.from(bucket).remove([previous]);
  notify('Firmenlogo gespeichert.');
 }catch(error){notify('Logo-Upload fehlgeschlagen: '+error.message);}
 finally{uploading=false;logoInput.disabled=false;}
});

function renderBanner(){
 if(!bannerPreview)return;
 bannerPreview.replaceChildren();
 const outer=document.createElement('div');outer.className='provider-banner-preview'+(bannerPath?'':' is-default');
 if(bannerPath){
  const img=document.createElement('img');img.src=photoUrl(bannerPath);img.alt='Aktueller Profilbanner';outer.append(img);
 }else{
  const mark=document.createElement('div');mark.className='provider-default-mark';
  const img=document.createElement('img');img.src='logo.png';img.alt='Sponti';mark.append(img,text('strong','Sponti'));
  outer.append(mark);
 }
 bannerPreview.append(outer);
 if(bannerPath){
  const remove=text('button','Banner entfernen','button account-secondary');
  remove.type='button';remove.classList.add('provider-remove-banner');
  remove.addEventListener('click',async()=>{
   if(!currentUser||uploading)return;
   uploading=true;remove.disabled=true;if(bannerInput)bannerInput.disabled=true;
   const previous=bannerPath;
   try{
    const result=await client.from('provider_profiles').update({banner_path:null,updated_at:new Date().toISOString()}).eq('user_id',currentUser.id);
    if(result.error)throw result.error;
    bannerPath=null;renderBanner();renderPreviewExtras();
    const cleanup=await client.storage.from(bucket).remove([previous]);
    notify(cleanup.error?'Banner entfernt; alte Bilddatei konnte nicht gelöscht werden.':'Banner entfernt. Der Sponti-Standardbanner wird verwendet.');
   }catch(err){notify('Banner konnte nicht entfernt werden: '+err.message);remove.disabled=false;}
   finally{uploading=false;if(bannerInput)bannerInput.disabled=false;}
  });
  bannerPreview.append(remove);
 }
}
bannerInput?.addEventListener('change',async()=>{
 const file=bannerInput.files?.[0];bannerInput.value='';
 if(!file)return;
 if(!currentUser){notify('Bitte zuerst als Anbieter anmelden.');return;}
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){
  notify('Banner: Nur JPG, PNG oder WebP bis 5 MB erlaubt.');return;
 }
 if(uploading)return;
 uploading=true;bannerInput.disabled=true;if(logoInput)logoInput.disabled=true;
 const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
 const path=currentUser.id+'/banner-'+crypto.randomUUID()+'.'+ext;
 try{
  const upload=await client.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});
  if(upload.error)throw upload.error;
  const result=await client.from('provider_profiles').update({banner_path:path,updated_at:new Date().toISOString()}).eq('user_id',currentUser.id);
  if(result.error){await client.storage.from(bucket).remove([path]);throw result.error;}
  const previous=bannerPath;bannerPath=path;renderBanner();renderPreviewExtras();
  if(previous)await client.storage.from(bucket).remove([previous]);
  notify('Profilbanner gespeichert.');
 }catch(error){notify('Banner-Upload fehlgeschlagen: '+error.message);}
 finally{uploading=false;bannerInput.disabled=false;if(logoInput)logoInput.disabled=false;}
});

client.auth.onAuthStateChange(()=>setTimeout(refresh,0));
root?.querySelector('[data-new-course]')?.addEventListener('click',()=>setTimeout(loadCourses,300));
root?.querySelector('[data-provider-form="course"]')?.addEventListener('submit',()=>setTimeout(loadCourses,900));
refresh();
