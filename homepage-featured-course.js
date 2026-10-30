/* Public featured course: CRM selects one published upcoming course. */
(()=>{'use strict';
const root=document.querySelector('[data-featured-course]');if(!root)return;
const title=root.querySelector('[data-featured-title]');
const eyebrow=root.querySelector('[data-featured-eyebrow]');
const link=root.querySelector('[data-featured-link]');
const base='https://ehifskiigrfpxeiruyxr.supabase.co/rest/v1/';
const key='sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy';
const fallback=()=>{eyebrow.textContent='Entdecke neue Erlebnisse';title.textContent='Schau unter «Kurse entdecken» für weitere Kurse';link.href='/kurse';link.textContent='Kurse entdecken ↗';};
async function get(path){const r=await fetch(base+path,{headers:{apikey:key,Accept:'application/json'},cache:'no-store'});if(!r.ok)throw Error('Featured course unavailable');return r.json();}
async function refresh(){try{
 const settings=await get('homepage_featured_course?select=course_id&id=eq.1&limit=1');
 const id=settings?.[0]?.course_id;
 if(!id){fallback();return;}
 const rows=await get('courses?select=id,title,starts_at,status,seats,archived_at&id=eq.'+encodeURIComponent(id)+'&limit=1');
 const c=rows?.[0];
 if(!c||c.archived_at||c.status!=='published'||Number(c.seats)<=0||new Date(c.starts_at).getTime()<=Date.now()){fallback();return;}
 eyebrow.textContent='Jetzt entdecken';
 title.textContent=c.title;
 link.href='/kurs?id='+encodeURIComponent(c.id);
 link.textContent='Details & buchen ↗';
}catch(e){fallback();console.warn('Startseiten-Kurs konnte nicht geladen werden.',e);}}
void refresh();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
})();
