import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const root=document.querySelector('[data-provider-account]');
const input=root?.querySelector('[data-gallery-input]');
const list=root?.querySelector('[data-gallery-list]');
const message=root?.querySelector('[data-gallery-message]');
const client=createClient('https://ehifskiigrfpxeiruyxr.supabase.co','sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy',{auth:{storageKey:'sponti-provider-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const bucket='provider-gallery';
let currentUser=null,photos=[];
const notify=(text)=>{if(message)message.textContent=text;};
async function refresh(){
 const {data:{user}}=await client.auth.getUser();currentUser=user;
 if(!user){photos=[];list?.replaceChildren();return;}
 const {data,error}=await client.from('provider_photos').select('id,storage_path').eq('provider_id',user.id).order('created_at',{ascending:true});
 if(error){notify('Bilder konnten nicht geladen werden: '+error.message);return;}
 photos=data||[];render();
}
function render(){
 list.replaceChildren();
 for(const photo of photos){
  const card=document.createElement('div');card.className='provider-gallery-item';
  const image=document.createElement('img');image.alt='Anbieterfoto';image.loading='lazy';
  image.src=client.storage.from(bucket).getPublicUrl(photo.storage_path).data.publicUrl;
  const remove=document.createElement('button');remove.type='button';remove.textContent='Foto entfernen';remove.className='account-secondary';
  remove.onclick=async()=>{remove.disabled=true;const del=await client.from('provider_photos').delete().eq('id',photo.id).eq('provider_id',currentUser.id);
   if(del.error){notify(del.error.message);remove.disabled=false;return;}
   const storage=await client.storage.from(bucket).remove([photo.storage_path]);
   if(storage.error)notify('Bildzuordnung entfernt, Speicherbereinigung fehlgeschlagen.');
   await refresh();};
  card.append(image,remove);list.append(card);
 }
}
input?.addEventListener('change',async()=>{
 const files=[...input.files];input.value='';
 await refresh();if(!currentUser){notify('Bitte zuerst als Anbieter anmelden.');return;}
 if(files.length+photos.length>5){notify('Maximal fünf Fotos pro Anbieterprofil.');return;}
 input.disabled=true;
 try{
  for(const file of files){
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){notify('Nur JPG, PNG oder WebP bis 5 MB erlaubt.');continue;}
   const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
   const path=currentUser.id+'/'+crypto.randomUUID()+'.'+ext;
   const up=await client.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});
   if(up.error){notify('Upload fehlgeschlagen: '+up.error.message);continue;}
   const ins=await client.from('provider_photos').insert({provider_id:currentUser.id,storage_path:path});
   if(ins.error){await client.storage.from(bucket).remove([path]);notify('Bild konnte nicht gespeichert werden: '+ins.error.message);continue;}
   notify('Foto hochgeladen.');
  }
  await refresh();
 }finally{input.disabled=false;}
});
client.auth.onAuthStateChange(()=>{setTimeout(refresh,0);});
refresh();
