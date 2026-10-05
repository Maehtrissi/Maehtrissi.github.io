import {createClient} from '@supabase/supabase-js';
const client=createClient('https://ehifskiigrfpxeiruyxr.supabase.co','sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy',{auth:{storageKey:'sponti-customer-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}});
const root=document.querySelector('[data-customer-account]');
const links=[...document.querySelectorAll('[data-customer-profile-link]')];
const redirectTo=new URL('/profil.html',location.origin).href;
const status=document.getElementById('account-status');
let user=null,profile=null,busy=false,loadingSequence=0,recovery=false;
const forms=[...document.querySelectorAll('[data-account-form]')];
const message=(text,error=false)=>{if(!status)return;status.textContent=text;status.classList.toggle('is-error',error);status.hidden=!text;};
function friendly(error){if(error?.status===429)return 'Zu viele Versuche. Bitte warte etwas und versuche es erneut.';if(/Email not confirmed/i.test(error?.message||''))return 'Bitte bestätige zuerst deine E-Mail-Adresse über die Nachricht in deinem Postfach.';if(/Invalid login credentials/i.test(error?.message||''))return 'E-Mail oder Passwort stimmen nicht.';if(/authorized|smtp|sending.*email/i.test(error?.message||''))return 'Die Bestätigungs-E-Mail konnte gerade nicht versendet werden. Bitte versuche es später erneut oder kontaktiere Sponti.';return error?.message||'Das hat gerade nicht geklappt. Bitte versuche es erneut.';}
function phoneValid(value){const digits=value.replace(/\D/g,'').length;return /^[+0-9 ()/.\-]+$/.test(value)&&digits>=7&&digits<=15&&(!value.includes('+')||value.indexOf('+')===0&&value.lastIndexOf('+')===0);}
function getProfile(form){const data=new FormData(form);const value={name:String(data.get('name')||'').trim(),phone:String(data.get('phone')||'').trim(),interest:String(data.get('interest')??profile?.interest??'').trim(),channel:String(data.get('channel')??profile?.channel??'')};if(!value.name||!phoneValid(value.phone)||!['WhatsApp','E-Mail','Beides','Keine'].includes(value.channel))throw new Error('Bitte prüfe deinen Namen, deine Telefonnummer und den gewünschten Kontaktkanal.');return value;}
function draw(){
 links.forEach(link=>{link.textContent=user?'Mein Profil':'Anmelden';link.setAttribute('aria-label',user?'Mein Kundenprofil öffnen':'Zum Kundenkonto anmelden');});
 if(!root)return;
 root.querySelector('[data-account-loading]').hidden=true;
 root.querySelector('[data-account-guest]').hidden=!!user;
 root.querySelector('[data-account-member]').hidden=!user;
 if(user){root.querySelector('[data-account-name]').textContent=profile?.name?`Hallo, ${profile.name.split(' ')[0]}.`:'Dein Profil.';root.querySelector('[data-account-email]').textContent=user.email||'';}
 const recoveryBox=root.querySelector('[data-account-recovery]');if(recoveryBox)recoveryBox.hidden=!user||!recovery;
}
function fillProfile(value){const form=document.querySelector('[data-account-form="profile"]');if(!form)return;for(const key of ['name','phone','interest','channel']){const field=form.elements.namedItem(key);if(field)field.value=value?.[key]||'';}form.querySelector('button[type="submit"]').disabled=false;}
async function loadUser(){
 const sequence=++loadingSequence;
 const result=await client.auth.getUser();if(sequence!==loadingSequence)return;
 user=result.data.user;profile=null;
 if(result.error&&user)throw result.error;
 if(user&&root){const r=await client.rpc('customer_profile');if(sequence!==loadingSequence)return;if(r.error){fillProfile(null);document.querySelector('[data-account-form="profile"] button[type="submit"]').disabled=true;draw();throw r.error;}profile=r.data;
  // Initial preferences were explicitly submitted at account registration.
  if(!profile.saved&&profile.name&&phoneValid(profile.phone)&&['WhatsApp','E-Mail','Beides','Keine'].includes(profile.channel)){
   const saved=await client.rpc('customer_profile',{profile:{name:profile.name,phone:profile.phone,interest:profile.interest||'',channel:profile.channel}});if(sequence!==loadingSequence)return;if(saved.error)throw saved.error;profile=saved.data;
  }
  fillProfile(profile);
 }
 draw();
 if(user&&root)await loadSections(sequence,user.id);
}
function sectionMessage(selector,text,error=false){const el=root?.querySelector(selector);if(el){el.textContent=text;el.classList.toggle('is-error',error);}}
function preferencesControls(disabled){root?.querySelectorAll('[data-account-form="preferences"] input,[data-account-form="preferences"] select,[data-account-form="preferences"] button').forEach(el=>el.disabled=disabled);}
function fillPreferences(value){
 const form=root.querySelector('[data-account-form="preferences"]');
 form.reset();form.elements.namedItem('channel').value=profile?.channel||'Keine';form.elements.namedItem('interest').value=profile?.interest||'';
 for(const key of ['region','locality','radius_km'])form.elements.namedItem(key).value=value?.[key]??'';
 for(const key of ['categories','preferred_days','preferred_times'])form.querySelectorAll('input[name="'+key+'"]').forEach(input=>input.checked=(value?.[key]||[]).includes(input.value));
}
async function loadSections(sequence,userId){
 preferencesControls(true);
 sectionMessage('[data-preferences-status]','Deine Wünsche werden geladen …');
 root.querySelector('[data-bookings-list]').replaceChildren();
 root.querySelector('[data-bookings-empty]').hidden=true;
 sectionMessage('[data-bookings-status]','Buchungen werden geladen …');
 await Promise.all([
  (async()=>{try{
   const r=await client.from('customer_preferences').select('region,locality,radius_km,categories,preferred_days,preferred_times').eq('user_id',userId).maybeSingle();
   if(sequence!==loadingSequence)return;if(r.error)throw r.error;
   fillPreferences(r.data);preferencesControls(false);
   sectionMessage('[data-preferences-status]','');
  }catch(error){if(sequence===loadingSequence)sectionMessage('[data-preferences-status]','Deine Wünsche konnten nicht geladen werden. Bitte lade die Seite erneut.',true);}})(),
  (async()=>{try{
   const rows=[];let offset=0;
   for(;;){const r=await client.from('bookings').select('id,course_title,starts_at,venue,price,quantity,status').eq('user_id',userId).order('starts_at',{ascending:false}).order('id').range(offset,offset+499);
    if(sequence!==loadingSequence)return;if(r.error)throw r.error;rows.push(...r.data);if(r.data.length<500)break;offset+=500;
   }
   renderBookings(rows);sectionMessage('[data-bookings-status]','');
  }catch(error){if(sequence===loadingSequence)sectionMessage('[data-bookings-status]','Deine Buchungen konnten nicht geladen werden. Bitte lade die Seite erneut.',true);}})()
 ]);
}
function renderBookings(rows){
 const container=root.querySelector('[data-bookings-list]');container.replaceChildren();
 root.querySelector('[data-bookings-empty]').hidden=rows.length>0;
 const now=Date.now(),upcoming=rows.filter(row=>new Date(row.starts_at).getTime()>=now).reverse(),past=rows.filter(row=>new Date(row.starts_at).getTime()<now);
 const date=new Intl.DateTimeFormat('de-CH',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Zurich'});
 const money=new Intl.NumberFormat('de-CH',{style:'currency',currency:'CHF'});
 for(const [title,items] of [['Kommende Buchungen',upcoming],['Vergangene Buchungen',past]]){
  if(!items.length)continue;
  const heading=document.createElement('h3');heading.textContent=title;container.append(heading);
  const list=document.createElement('ul');list.className='account-bookings';container.append(list);
  for(const row of items){
   const item=document.createElement('li'),name=document.createElement('h4'),info=document.createElement('p'),state=document.createElement('span');
   name.textContent=row.course_title;
   info.textContent=date.format(new Date(row.starts_at))+' Uhr (Schweizer Zeit)'+(row.venue?' · '+row.venue:'')+' · '+row.quantity+(row.quantity===1?' Platz':' Plätze')+' · '+money.format(Number(row.price)*row.quantity)+' gesamt';
   state.className='booking-state booking-state-'+row.status;state.textContent={pending:'Angefragt',confirmed:'Bestätigt',cancelled:'Storniert'}[row.status]||row.status;
   item.append(name,state,info);list.append(item);
  }
 }
}
async function act(form,action){if(busy)return;busy=true;message('');const controls=[...form.querySelectorAll('button,input,select,textarea')];controls.forEach(el=>el.disabled=true);form.setAttribute('aria-busy','true');try{await action();}catch(error){message(friendly(error),true);}finally{busy=false;controls.forEach(el=>el.disabled=false);form.removeAttribute('aria-busy');}}
// Auth event callbacks avoid calling Supabase inside its storage lock.
client.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY')recovery=true;if(event==='SIGNED_OUT'){loadingSequence++;user=null;profile=null;forms.forEach(form=>form.reset());draw();message('Du bist abgemeldet.');return;}if(event==='SIGNED_IN'&&user&&profile)return;if(['SIGNED_IN','PASSWORD_RECOVERY','USER_UPDATED'].includes(event))setTimeout(()=>loadUser().catch(error=>message(friendly(error),true)),0);});
if(root){
 forms.forEach(form=>form.addEventListener('submit',event=>{
  event.preventDefault();if(!form.reportValidity()||busy)return;
  const type=form.dataset.accountForm;
  // Read form values before controls are disabled (disabled inputs are absent from FormData).
  const data=new FormData(form);let fields=null;
  try{if(type==='register'||type==='profile')fields=getProfile(form);}catch(error){message(friendly(error),true);return;}
  const email=String(data.get('email')||'').trim(),password=String(data.get('password')||'');
  act(form,async()=>{
   if(type==='login'){const r=await client.auth.signInWithPassword({email,password});if(r.error)throw r.error;form.reset();await loadUser();message('Du bist angemeldet. Hier kannst du deine Einstellungen ändern.');}
   if(type==='register'){const r=await client.auth.signUp({email,password,options:{emailRedirectTo:redirectTo,data:fields}});if(r.error)throw r.error;form.reset();if(r.data.session){await loadUser();message('Willkommen bei Sponti. Dein Profil ist eingerichtet.');}else{message('Prüfe dein E-Mail-Postfach und bestätige dein Konto. Danach kannst du dich hier anmelden. Falls du bereits ein Konto hast, melde dich damit an.');setMode('login');}}
   if(type==='profile'){const r=await client.rpc('customer_profile',{profile:fields});if(r.error)throw r.error;profile=r.data;draw();message('Deine Einstellungen wurden gespeichert.');}
   if(type==='preferences'){
    const radius=String(data.get('radius_km')||''),locality=String(data.get('locality')||'').trim();
    if(radius&&!locality)throw new Error('Bitte gib einen Ausgangsort oder eine PLZ für deinen Umkreis an.');
    const values={channel:String(data.get('channel')||''),interest:String(data.get('interest')||'').trim(),categories:data.getAll('categories').map(String),region:String(data.get('region')||''),locality,radius_km:radius?Number(radius):null,preferred_days:data.getAll('preferred_days').map(String),preferred_times:data.getAll('preferred_times').map(String)};
    const r=await client.rpc('save_course_preferences',{settings:values});
    if(r.error)throw r.error;profile={...profile,interest:values.interest,channel:values.channel};sectionMessage('[data-preferences-status]','Deine Kursinfos-Einstellungen wurden gespeichert.');message('Deine Auswahl wurde gespeichert.');
   }
   if(type==='password'){if(password!==String(data.get('confirm')||''))throw new Error('Die Passwörter stimmen nicht überein.');const r=await client.auth.updateUser({password});if(r.error)throw r.error;form.reset();recovery=false;draw();message('Dein Passwort wurde geändert.');}
   if(type==='reset'){const r=await client.auth.resetPasswordForEmail(email,{redirectTo});if(r.error)throw r.error;message('Falls ein Konto mit dieser E-Mail-Adresse besteht, bekommst du einen Link zum Zurücksetzen.');}
  });
 }));
 function setMode(mode){root.querySelectorAll('[data-account-panel]').forEach(panel=>panel.hidden=panel.dataset.accountPanel!==mode);root.querySelectorAll('[data-account-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.accountMode===mode)));message(status?.textContent||'');}
 root.querySelectorAll('[data-account-mode]').forEach(button=>button.addEventListener('click',()=>{message('');setMode(button.dataset.accountMode);root.querySelector(`[data-account-panel="${button.dataset.accountMode}"] input`)?.focus();}));
 if(new URLSearchParams(location.search).get('mode')==='register')setMode('register');
 root.querySelector('[data-account-logout]').addEventListener('click',async()=>{if(busy)return;try{const r=await client.auth.signOut({scope:'local'});if(r.error)throw r.error;}catch(error){message(friendly(error),true);}});
}
loadUser().catch(error=>{draw();message(friendly(error),true);});

