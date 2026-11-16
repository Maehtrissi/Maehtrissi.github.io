// Sponti Favoriten – identische Supabase-Anmeldung wie das Kundenkonto.
(() => {
  'use strict';
  const API='https://ehifskiigrfpxeiruyxr.supabase.co';
  const KEY='sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy';
  const AUTH_STORAGE='sponti-customer-auth';
  const ID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const EMPTY_TEXT='Du hast noch keine Favoriten ausgewählt.';
  let clientPromise=null;
  let userId=null;
  let favoriteIds=new Set();
  let favoriteOrder=[];
  let authCheck=0;
  let renderCheck=0;
  const busy=new Set();
  const $=selector=>document.querySelector(selector);

  const textNode=(tag,text,cls)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    el.textContent=text;
    return el;
  };
  const isCourseId=value=>typeof value==='string'&&ID_PATTERN.test(value);
  const placeText=value=>window.SpontiPlaces?.format(value)||value||'';
  const empty=(container)=>{
    if(!container)return;
    const holder=document.createElement('div');
    holder.className='sponti-favorites-empty';
    holder.append(textNode('p',EMPTY_TEXT,'sponti-favorites-empty-title'));
    holder.append(textNode('p','Entdecke Kurse und speichere sie mit dem Herz-Symbol.'));
    container.replaceChildren(holder);
  };
  const status=(container,message)=>{
    if(!container)return;
    container.replaceChildren(textNode('p',message,'sponti-favorites-status'));
  };
  function client(){
    if(!clientPromise){
      clientPromise=import('https://esm.sh/@supabase/supabase-js@2.57.0')
        .then(({createClient})=>{
          const db=createClient(API,KEY,{auth:{
            storageKey:AUTH_STORAGE,persistSession:true,autoRefreshToken:true,
            detectSessionInUrl:false,flowType:'implicit'
          }});
          db.auth.onAuthStateChange(event=>{
            if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED','USER_UPDATED'].includes(event)){
              queueMicrotask(()=>{void load();});
            }
          });
          return db;
        });
    }
    return clientPromise;
  }
  function updateHearts(){
    document.querySelectorAll('[data-favorite-id]').forEach(button=>{
      const id=button.dataset.favoriteId;
      const saved=favoriteIds.has(id);
      button.classList.toggle('is-favorite',saved);
      button.setAttribute('aria-pressed',String(saved));
      button.setAttribute('aria-label',saved?'Kurs aus Favoriten entfernen':'Kurs als Favorit speichern');
      button.title=saved?'Aus Favoriten entfernen':'Zu Favoriten hinzufügen';
      button.disabled=busy.has(id);
    });
    const detailLabel=$('[data-favorite-detail-label]');
    if(detailLabel)detailLabel.textContent=favoriteIds.has(detailLabel.dataset.favoriteDetailLabel)
      ?'Gespeichert':'Kurs merken';
  }
  function makeHeart(id){
    const button=document.createElement('button');
    button.type='button';
    button.className='sponti-favorite-heart';
    button.dataset.favoriteId=id;
    button.setAttribute('aria-pressed','false');
    button.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" fill="currentColor" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
    // SVG paths are decorative: the button carries the accessible label.
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      void toggle(id);
    });
    return button;
  }
  function decorate(){
    document.querySelectorAll('.course-card').forEach(card=>{
      if(card.querySelector('.sponti-favorite-heart'))return;
      const link=card.querySelector('a[href*="kurs.html?id="]');
      if(!link)return;
      const id=new URL(link.href,location.href).searchParams.get('id');
      if(!isCourseId(id))return;
      card.classList.add('sponti-favorite-card');
      card.append(makeHeart(id));
    });
    if(document.body.classList.contains('sponti-detail-page')&&!$('.sponti-detail-favorite')){
      const id=new URLSearchParams(location.search).get('id');
      const main=$('main');
      if(isCourseId(id)&&main){
        const wrapper=document.createElement('div');
        wrapper.className='sponti-detail-favorite';
        const button=makeHeart(id);
        const label=textNode('span','Kurs merken');
        label.dataset.favoriteDetailLabel=id;
        wrapper.append(button,label);
        main.prepend(wrapper);
      }
    }
    updateHearts();
  }
  function renderItems(container,courses,limit){
    if(!container)return;
    const byId=new Map(courses.map(course=>[course.id,course]));
    const fragment=document.createDocumentFragment();
    for(const id of favoriteOrder.slice(0,limit)){
      const course=byId.get(id);
      if(!course)continue;
      const article=document.createElement('article');
      article.className='sponti-favorite-entry';
      const link=document.createElement('a');
      link.href='/kurs.html?id='+encodeURIComponent(id);
      link.className='sponti-favorite-entry-link';
      link.append(textNode('strong',course.title));
      const info=[placeText(course.venue||course.region),
        course.starts_at?new Date(course.starts_at).toLocaleDateString('de-CH'):null]
        .filter(Boolean).join(' · ');
      if(info)link.append(textNode('span',info));
      const remove=textNode('button','Entfernen','sponti-favorite-remove');
      remove.type='button';
      remove.setAttribute('aria-label','Favorit entfernen: '+course.title);
      remove.disabled=busy.has(id);
      remove.addEventListener('click',()=>{void toggle(id);});
      article.append(link,remove);
      fragment.append(article);
    }
    if(!fragment.childNodes.length){
      status(container,'Deine gespeicherten Kurse sind aktuell nicht verfügbar.');
      return;
    }
    container.replaceChildren(fragment);
  }
  async function renderBoard(){
    const board=$('#sponti-favorites-list');
    const overview=$('#sponti-overview-favorites');
    if(!board&&!overview)return;
    const revision=++renderCheck;
    if(!userId||!favoriteOrder.length){
      empty(board);
      empty(overview);
      return;
    }
    const activeId=userId;
    try{
      const db=await client();
      const {data,error}=await db.from('courses')
        .select('id,title,starts_at,venue,region')
        .in('id',favoriteOrder.slice(0,200));
      if(error)throw error;
      if(revision!==renderCheck||activeId!==userId)return;
      const courses=Array.isArray(data)?data:[];
      renderItems(board,courses,200);
      renderItems(overview,courses,3);
    }catch(error){
      if(revision!==renderCheck)return;
      console.warn('Sponti favorites rendering error',error?.code||'unknown');
      status(board,'Favoriten konnten gerade nicht geladen werden. Bitte versuche es erneut.');
      status(overview,'Favoriten können momentan nicht geladen werden.');
    }
  }
  async function load(){
    const revision=++authCheck;
    try{
      const db=await client();
      const {data,error}=await db.auth.getUser();
      if(revision!==authCheck)return;
      if(error||!data?.user||data.user.is_anonymous){
        userId=null;favoriteIds.clear();favoriteOrder=[];updateHearts();
        await renderBoard();return;
      }
      const id=data.user.id;
      const {data:rows,error:fetchError}=await db.from('course_favorites')
        .select('course_id').eq('user_id',id).order('created_at',{ascending:false});
      if(revision!==authCheck)return;
      if(fetchError)throw fetchError;
      userId=id;
      favoriteOrder=(rows||[]).map(x=>x.course_id).filter(isCourseId);
      favoriteIds=new Set(favoriteOrder);
      updateHearts();
      await renderBoard();
    }catch(error){
      if(revision!==authCheck)return;
      console.warn('Sponti favorites loading error',error?.code||'unknown');
      const board=$('#sponti-favorites-list');
      const overview=$('#sponti-overview-favorites');
      status(board,'Favoriten konnten gerade nicht geladen werden. Bitte versuche es erneut.');
      status(overview,'Favoriten können momentan nicht geladen werden.');
    }
  }
  async function toggle(id){
    if(!isCourseId(id)||busy.has(id))return;
    busy.add(id);updateHearts();
    try{
      const db=await client();
      const {data:{user},error:authError}=await db.auth.getUser();
      if(authError||!user||user.is_anonymous){
        location.href='/profil?mode=login';
        return;
      }
      const idOfUser=user.id;
      const wasSaved=favoriteIds.has(id);
      if(wasSaved){
        const {error}=await db.from('course_favorites').delete()
          .eq('user_id',idOfUser).eq('course_id',id);
        if(error)throw error;
        favoriteIds.delete(id);
        favoriteOrder=favoriteOrder.filter(item=>item!==id);
      }else{
        const {error}=await db.from('course_favorites')
          .upsert({user_id:idOfUser,course_id:id},{onConflict:'user_id,course_id',ignoreDuplicates:true});
        if(error)throw error;
        favoriteIds.add(id);
        favoriteOrder=[id,...favoriteOrder.filter(item=>item!==id)];
      }
      userId=idOfUser;
      updateHearts();
      await renderBoard();
    }catch(error){
      console.warn('Sponti favorite write error',error?.code||'unknown');
      alert('Favorit konnte nicht gespeichert werden. Bitte versuche es erneut.');
      void load();
    }finally{
      busy.delete(id);updateHearts();
    }
  }
  function init(){
    decorate();
    const grid=$('.course-grid');
    if(grid)new MutationObserver(()=>decorate()).observe(grid,{childList:true,subtree:false});
    const board=$('#sponti-favorites-list');
    const overview=$('#sponti-overview-favorites');
    if(board)status(board,'Favoriten werden geladen …');
    if(overview)status(overview,'Favoriten werden geladen …');
    void load();
    // Kundenkonto und Favoriten verwenden denselben Supabase-Auth-Speicher.
    window.addEventListener('storage',e=>{if(e.key===AUTH_STORAGE)void load();});
    window.addEventListener('focus',()=>{void load();});
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')void load();
    });
    document.addEventListener('click',e=>{
      if(e.target.closest('[data-cboard-tab="favorites"],[data-cboard-tab="overview"],[data-overview-go="favorites"]')){
        void load();
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
