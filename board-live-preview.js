// Live-Vorschau der öffentlichen Anbieterangaben. Keine automatische Speicherung.
const root=document.querySelector('[data-provider-account]');
const member=root?.querySelector('[data-provider-member]');
const form=member?.querySelector('[data-provider-form="profile"]');
const preview=member?.querySelector('.provider-preview');
if(form&&preview){
 const update=()=>{
  const card=preview.querySelector('.provider-public-card');if(!card)return;
  const get=name=>form.elements.namedItem(name)?.value.trim()||'';
  const name=get('company'),category=get('category'),location=get('location'),website=get('website');
  const title=card.querySelector('.provider-profile-heading h3');if(title)title.textContent=name||'Dein Unternehmen';
  const cat=card.querySelector('[data-provider-category]');if(cat)cat.textContent=category||'Kategorie ergänzen';
  const place=card.querySelector('[data-live-provider-location]');if(place)place.textContent=location||'Standort ergänzen';
  const details=card.querySelector('.provider-profile-sections .provider-profile-section:nth-child(2)');
  if(details){
   let link=details.querySelector('[data-live-provider-website]');
   if(/^https?:\/\//i.test(website)){if(!link){link=document.createElement('a');link.dataset.liveProviderWebsite='';link.target='_blank';link.rel='noopener noreferrer';details.append(link);}link.href=website;link.textContent='Website besuchen ↗';link.hidden=false;}
   else if(link)link.hidden=true;
  }
 };
 form.addEventListener('input',update);form.addEventListener('change',update);
 const target=member.querySelector('[data-provider-preview]');
 if(target)new MutationObserver(update).observe(target,{childList:true});
 update();
}

