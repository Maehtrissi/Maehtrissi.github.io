(()=>{
 const grid=document.getElementById('story-grid');
 const featured=document.getElementById('stories');
 if(!grid&&!featured)return;
 const make=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
 function card(row,home=false){
  const article=make('article',home?'':'story-card');
  const quote=make('div',home?'testimonial-quote':'testimonial-quote story-quote',row.review);
  quote.style.whiteSpace='pre-wrap';
  const meta=make('div','testimonial-meta'),identity=make('div','');
  const initials=String(row.name||'').trim().split(/\s+/).map(p=>p[0]).join('').slice(0,2).toUpperCase();
  identity.append(make('strong','',row.name),make('span','',row.course));
  meta.append(make('div','testimonial-avatar',initials),identity);article.append(quote,meta);
  if(row.reply){const reply=make('div','sponti-review-reply');reply.append(make('strong','','Antwort von Sponti'),make('p','',row.reply));article.append(reply);}
  return article;
 }
 async function load(){
  if(grid){grid.setAttribute('aria-busy','true');grid.replaceChildren(make('p','','Erfahrungen werden geladen …'));}
  try{
   const rows=[];
   for(let offset=0;;offset+=500){const query=new URLSearchParams({select:'id,name,course,review,created_at,reply,replied_at',status:'eq.approved',order:'created_at.desc,id.asc',limit:featured&&!grid?'1':'500',offset:String(offset)});
    const response=await fetch('https://ehifskiigrfpxeiruyxr.supabase.co/rest/v1/course_reviews?'+query,{headers:{apikey:'sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy'},cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Erfahrungen konnten nicht geladen werden.');
    const batch=await response.json();if(!Array.isArray(batch))throw Error('Ungültige Antwort.');rows.push(...batch);if(batch.length<500||!grid)break;
   }
   if(grid)grid.replaceChildren(...(rows.length?rows.map(row=>card(row)):[make('p','','Noch keine Erfahrungen veröffentlicht. Teile gerne deine Erfahrung mit Sponti.')]));
   if(featured){featured.hidden=!rows.length;if(rows.length){featured.replaceChildren(card(rows[0],true));const link=make('a','text-link testimonial-link','Alle Erfahrungen ansehen');link.href='/erfahrungen';featured.append(link);}}
  }catch{if(featured)featured.hidden=true;if(grid){const message=make('p','','Erfahrungen konnten gerade nicht geladen werden. '),retry=make('button','button','Erneut versuchen');retry.type='button';retry.addEventListener('click',load);message.append(retry);grid.replaceChildren(message);}}
  finally{grid?.removeAttribute('aria-busy');}
 }
 load();
})();