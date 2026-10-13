/* Homepage news are read-only here; publishing is managed through employee-only CRM. */
(function () {
  'use strict';
  const board=document.querySelector('.hero-news-board');
  if(!board)return;
  const list=board.querySelector('[data-home-news-list]');
  const pager=board.querySelector('[data-home-news-pager]');
  const counter=board.querySelector('[data-home-news-count]');
  const prev=board.querySelector('[data-home-news-prev]');
  const next=board.querySelector('[data-home-news-next]');
  const apiUrl='https://ehifskiigrfpxeiruyxr.supabase.co/rest/v1/homepage_news?select=id,title,body,label,link_url&status=eq.published&order=priority.desc,created_at.desc&limit=20';
  const publicKey='sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy';
  const pageSize=2;
  let items=[];
  let page=0;

  function safeLink(value){
    if(typeof value!=='string'||!value)return '';
    if(value.startsWith('//'))return '';
    try{
      const url=new URL(value,location.origin);
      return url.protocol==='https:'||url.protocol==='http:'&&url.origin===location.origin ? url.href : '';
    }catch{return '';}
  }
  function elt(tag,className,text){
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=String(text);
    return node;
  }
  function render(){
    const total=Math.ceil(items.length/pageSize);
    page=Math.max(0,Math.min(page,Math.max(0,total-1)));
    list.replaceChildren();
    if(items.length===0){
      list.append(elt('p','hero-news-empty','Hier findest du bald Neuigkeiten von Sponti.'));
      pager.hidden=true;
      return;
    }
    items.slice(page*pageSize,(page+1)*pageSize).forEach(item=>{
      const url=safeLink(item.link_url);
      const entry=elt(url?'a':'article','hero-news-entry');
      if(url){
        entry.href=url;
        if(new URL(url).origin!==location.origin){entry.target='_blank';entry.rel='noopener noreferrer';}
      }
      entry.append(elt('span','hero-news-entry-label',item.label||'Neu'));
      const heading=elt('strong','hero-news-entry-title',item.title||'Neu bei Sponti');
      if(url){const arrow=elt('span','hero-news-entry-arrow','↗');arrow.setAttribute('aria-hidden','true');heading.append(arrow);}
      entry.append(heading);
      if(item.body)entry.append(elt('p','hero-news-entry-text',item.body));
      list.append(entry);
    });
    pager.hidden=total<=1;
    counter.textContent=(page+1)+' / '+total;
    prev.disabled=page===0;
    next.disabled=page>=total-1;
  }
  prev.addEventListener('click',()=>{page--;render();});
  next.addEventListener('click',()=>{page++;render();});

  async function refresh(){
    try{
      const response=await fetch(apiUrl,{
        headers:{apikey:publicKey,Accept:'application/json'},
        cache:'no-store'
      });
      if(!response.ok)throw new Error('News unavailable');
      const rows=await response.json();
      if(!Array.isArray(rows))throw new Error('Invalid news response');
      items=rows.filter(row=>row&&typeof row.title==='string');
      render();
    }catch(error){
      // Preserve previously loaded entries during temporary network failures.
      if(!items.length)render();
      console.warn('Sponti News konnten nicht geladen werden.',error);
    }
  }
  void refresh();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
  window.setInterval(()=>{if(!document.hidden)void refresh();},90000);
})();
