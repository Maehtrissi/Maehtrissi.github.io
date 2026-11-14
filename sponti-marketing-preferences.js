import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const section=document.querySelector('[data-sponti-marketing-settings]');
if(section){
 const status=section.querySelector('[data-marketing-status]');
 const weekly=section.querySelector('[data-marketing-weekly]');
 const newsletter=section.querySelector('[data-marketing-newsletter]');
 const categories=[...section.querySelectorAll('input[data-marketing-category]')];
 const save=section.querySelector('[data-marketing-save]');
 const client=createClient(
  'https://ehifskiigrfpxeiruyxr.supabase.co',
  'sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy',
  {auth:{storageKey:'sponti-customer-auth',persistSession:true,autoRefreshToken:true,
  detectSessionInUrl:true,flowType:'implicit'}}
 );
 let busy=false;
 const message=(text,error=false)=>{
  status.textContent=text;
  status.style.color=error?'#9A3D2F':'#1A5A41';
 };
 async function load(){
  if(busy)return;
  try{
   const {data:{user}}=await client.auth.getUser();
   if(!user){section.hidden=true;return;}
   section.hidden=false;
   const {data,error}=await client.rpc('sponti_marketing_preferences');
   if(error)throw error;
   weekly.checked=Boolean(data?.weekly_courses);
   newsletter.checked=Boolean(data?.newsletter);
   const selected=new Set(Array.isArray(data?.categories)?data.categories:[]);
   for(const item of categories)item.checked=selected.has(item.value);
   message('Du kannst diese Werbe-E-Mails jederzeit einzeln abbestellen.');
  }catch(e){message('Die E-Mail-Einstellungen konnten gerade nicht geladen werden.',true);}
 }
 save.addEventListener('click',async()=>{
  if(busy)return;
  const chosen=categories.filter(input=>input.checked).map(input=>input.value);
  if(weekly.checked&&!chosen.length){
   message('Bitte wähle mindestens eine Kurskategorie für die wöchentlichen Kurstipps.',true);
   return;
  }
  busy=true;save.disabled=true;message('Einstellungen werden gespeichert …');
  try{
   const {data:{user}}=await client.auth.getUser();
   if(!user)throw Error('Bitte melde dich zuerst an.');
   const {data,error}=await client.rpc('sponti_marketing_preferences',{
    p_settings:{weekly_courses:weekly.checked,newsletter:newsletter.checked,categories:chosen}
   });
   if(error)throw error;
   weekly.checked=Boolean(data.weekly_courses);
   newsletter.checked=Boolean(data.newsletter);
   message('Deine Auswahl wurde gespeichert. Du kannst sie jederzeit ändern.');
  }catch(e){message(e?.message||'Speichern fehlgeschlagen. Bitte versuche es erneut.',true);}
  finally{busy=false;save.disabled=false;}
 });
 client.auth.onAuthStateChange(()=>{setTimeout(load,0);});
 await load();
}