/* Sponti: Kurslinks per WhatsApp, E-Mail oder Zwischenablage teilen. */
(() => {
  'use strict';
  const containerSelector='[data-sponti-course-share]';
  const triggerSelector='.sponti-course-share-trigger';
  let openPanel=null;
  const make=(tag,className,text)=>{
    const element=document.createElement(tag);
    element.className=className;
    if(text!==undefined)element.textContent=text;
    return element;
  };
  function closePanel(panel,restoreFocus=false){
    if(!panel)return;
    const menu=panel.querySelector('.sponti-course-share-menu');
    const trigger=panel.querySelector(triggerSelector);
    if(menu)menu.hidden=true;
    if(trigger)trigger.setAttribute('aria-expanded','false');
    if(openPanel===panel)openPanel=null;
    if(restoreFocus)trigger?.focus();
  }
  function getCourseUrl(panel){
    const source=panel.dataset.shareUrl||location.href;
    try{
      const url=new URL(source,location.origin);
      if(url.origin!==location.origin)return null;
      return url.href;
    }catch{return null;}
  }
  function prepare(panel){
    let menu=panel.querySelector('.sponti-course-share-menu');
    if(menu)return menu;
    const title=String(panel.dataset.shareTitle||document.title||'Kurs auf Sponti').trim();
    const url=getCourseUrl(panel);
    if(!url)return null;
    const message='Diesen Kurs auf Sponti entdecken: '+title+'\n'+url;
    const subject='Kurs auf Sponti: '+title;
    menu=make('div','sponti-course-share-menu');
    menu.setAttribute('role','group');
    menu.setAttribute('aria-label','Kurs teilen über');
    const whatsapp=make('a','sponti-course-share-action','WhatsApp');
    whatsapp.href='https://wa.me/?text='+encodeURIComponent(message);
    whatsapp.target='_blank';
    whatsapp.rel='noopener noreferrer';
    const email=make('a','sponti-course-share-action','E-Mail');
    email.href='mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(message);
    const copy=make('button','sponti-course-share-action sponti-course-share-copy','Link kopieren');
    copy.type='button';
    const status=make('span','sponti-course-share-feedback');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    menu.append(whatsapp,email,copy,status);
    menu.hidden=true;
    panel.append(menu);
    return menu;
  }
  async function copyText(text){
    if(navigator.clipboard?.writeText){
      try{await navigator.clipboard.writeText(text);return true;}catch{}
    }
    const textarea=document.createElement('textarea');
    textarea.value=text;
    textarea.readOnly=true;
    textarea.style.position='fixed';
    textarea.style.opacity='0';
    textarea.style.left='-9999px';
    document.body.append(textarea);
    textarea.select();
    let copied=false;
    try{copied=document.execCommand('copy');}catch{}
    textarea.remove();
    return copied;
  }
  document.addEventListener('click',event=>{
    const trigger=event.target.closest(triggerSelector);
    if(trigger){
      const panel=trigger.closest(containerSelector);
      if(!panel)return;
      event.preventDefault();
      const menu=prepare(panel);
      if(!menu)return;
      const willOpen=menu.hidden;
      if(openPanel&&openPanel!==panel)closePanel(openPanel);
      menu.hidden=!willOpen;
      trigger.setAttribute('aria-expanded',String(willOpen));
      openPanel=willOpen?panel:null;
      return;
    }
    const copyButton=event.target.closest('.sponti-course-share-copy');
    if(copyButton){
      const panel=copyButton.closest(containerSelector);
      if(!panel)return;
      event.preventDefault();
      const url=getCourseUrl(panel);
      if(!url)return;
      const feedback=panel.querySelector('.sponti-course-share-feedback');
      void copyText(url).then(ok=>{
        if(feedback)feedback.textContent=ok?'Link kopiert.':'Link konnte nicht kopiert werden. Bitte den Link aus der Adresszeile kopieren.';
      });
      return;
    }
    const link=event.target.closest('.sponti-course-share-action');
    if(link){closePanel(link.closest(containerSelector));return;}
    if(openPanel&&!event.target.closest(containerSelector))closePanel(openPanel);
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&openPanel){
      event.preventDefault();
      closePanel(openPanel,true);
    }
  });
})();