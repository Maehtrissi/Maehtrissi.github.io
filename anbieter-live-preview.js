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
  const name=form.elements.namedItem('company')?.value.trim();
  const category=form.elements.namedItem('category')?.value.trim();
  const location=form.elements.namedItem('location')?.value.trim();
  const website=form.elements.namedItem('website')?.value.trim();
  const title=card.querySelector('h3');if(title)title.textContent=name||'Dein Unternehmen';
  const paragraphs=Array.from(card.children).filter(e=>e.tagName==='P');
  if(paragraphs[0])paragraphs[0].textContent=category||'Kategorie ergänzen';
  if(paragraphs[1])paragraphs[1].textContent=location||'Standort ergänzen';
  const link=Array.from(card.children).find(e=>e.tagName==='A');
  if(link){if(/^https?:\/\//i.test(website)){link.href=website;link.textContent=website;link.hidden=false;}else if(!website){link.hidden=true;}}
 };
 form.addEventListener('input',update);form.addEventListener('change',update);
 const target=member.querySelector('[data-provider-preview]');
 if(target)new MutationObserver(update).observe(target,{childList:true});
 update();
}
