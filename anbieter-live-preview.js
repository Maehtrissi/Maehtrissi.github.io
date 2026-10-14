// Live-Vorschau der öffentlichen Anbieterangaben. Keine automatische Speicherung.
const root=document.querySelector('[data-provider-account]');
const member=root?.querySelector('[data-provider-member]');
const form=member?.querySelector('[data-provider-form="profile"]');
const preview=member?.querySelector('.provider-preview');
if(form&&preview){
 const editor=form.closest('.account-card');
 const layout=document.createElement('div');layout.className='provider-live-layout';
 editor.before(layout);layout.append(editor,preview);
 const update=()=>{
  const card=preview.querySelector('.provider-public-card');if(!card)return;
  const get=name=>form.elements.namedItem(name)?.value.trim()||'';
  const name=get('company'), category=get('category'), location=get('location'), website=get('website');
  const title=card.querySelector('h3');if(title)title.textContent=name||'Dein Unternehmen';
  const description=Array.from(card.children).find(el=>el.tagName==='P');
  if(description)description.textContent=category||'Kategorie ergänzen';
  let locationLine=card.querySelector('[data-live-provider-location]');
  if(!locationLine){locationLine=document.createElement('p');locationLine.dataset.liveProviderLocation='';if(description)description.after(locationLine);else card.append(locationLine);}
  locationLine.textContent=location||'Standort ergänzen';
  let link=card.querySelector('a.button.account-secondary');
  if(/^https?:\/\//i.test(website)){
    if(!link){link=document.createElement('a');link.className='button account-secondary';link.target='_blank';link.rel='noopener noreferrer';card.append(link);}
    link.href=website;link.textContent='Website besuchen';link.hidden=false;
  }else if(link){link.hidden=true;}
 };
 form.addEventListener('input',update);form.addEventListener('change',update);
 const target=member.querySelector('[data-provider-preview]');
 if(target)new MutationObserver(update).observe(target,{childList:true});
 update();
}
