// Hilfe bei der E-Mail-Bestätigung: erklärt abgelaufene Links und bietet einen neuen Link an.
(function(){
 const status=document.getElementById('account-status');
 const loginForm=document.querySelector('[data-account-form="login"]');
 if(!status||!loginForm)return;
 const SUPABASE='https://ehifskiigrfpxeiruyxr.supabase.co';
 const KEY='sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy';
 const REDIRECT=new URL('/profil.html',location.origin).href;
 let box=null,observing=false;
 function emailValue(){const f=loginForm.querySelector('input[name="email"]');return f?String(f.value||'').trim():'';}
 function show(text,isError){status.textContent=text;status.classList.toggle('is-error',!!isError);status.hidden=!text;}
 function ensureBox(){
  if(box)return box;
  box=document.createElement('div');box.className='account-resend';box.style.cssText='margin:10px 0 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center';
  const input=document.createElement('input');input.type='email';input.placeholder='Deine E-Mail-Adresse';input.autocomplete='email';input.maxLength=254;input.setAttribute('aria-label','E-Mail-Adresse für den neuen Bestätigungslink');input.style.cssText='flex:1 1 220px;min-width:0';
  const button=document.createElement('button');button.type='button';button.className='button account-secondary';button.textContent='Neuen Bestätigungslink senden';
  const result=document.createElement('p');result.style.cssText='flex:1 1 100%;margin:0;font-size:.95em';result.setAttribute('role','status');
  async function send(email,auto){
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){result.textContent='Bitte gib eine gültige E-Mail-Adresse ein.';return;}
   button.disabled=true;result.textContent='Wird gesendet …';
   try{
    const r=await fetch(SUPABASE+'/auth/v1/resend?redirect_to='+encodeURIComponent(REDIRECT),{method:'POST',headers:{'content-type':'application/json',apikey:KEY},body:JSON.stringify({type:'signup',email})});
    if(r.status===429){result.textContent=auto?'Wir haben dir gerade schon einen Link geschickt. Bitte schau in dein Postfach (auch im Spam-Ordner).':'Zu viele Versuche. Bitte warte kurz und versuche es erneut.';}
    else if(r.ok){result.textContent=(auto?'Wir haben dir automatisch einen neuen Bestätigungslink geschickt. ':'Wir haben dir einen neuen Link geschickt. ')+'Er gilt nur kurze Zeit, öffne ihn bitte direkt. Schau auch im Spam-Ordner nach.';}
    else{result.textContent='Das hat nicht geklappt. Bitte versuche es später erneut oder kontaktiere Sponti.';}
   }catch{result.textContent='Keine Verbindung. Bitte versuche es erneut.';}
   finally{button.disabled=false;}
  }
  box.send=send;
  button.addEventListener('click',()=>send(input.value.trim(),false));
  box.append(input,button,result);box.input=input;
  status.insertAdjacentElement('afterend',box);
  return box;
 }
 const autoSent=new Set();
 function offer(auto){const b=ensureBox();b.hidden=false;if(!b.input.value)b.input.value=emailValue();const email=emailValue();if(auto&&email&&!autoSent.has(email.toLowerCase())){autoSent.add(email.toLowerCase());b.send(email,true);}}
 function hideOffer(){if(box)box.hidden=true;}
 function check(){
  const text=status.textContent||'';
  if(!status.hidden&&/noch nicht bestätigt|bestätige zuerst|abgelaufen/i.test(text))offer(/noch nicht bestätigt|bestätige zuerst/i.test(text));else hideOffer();
 }
 // Abgelaufener oder schon verwendeter Link: Supabase leitet mit Fehler im Hash zurück.
 const params=new URLSearchParams(String(window.__spontiAuthHash||location.hash).replace(/^#/,''));
 if(params.get('error_code')==='otp_expired'||/expired|invalid/i.test(params.get('error_description')||'')){
  show('Dieser Bestätigungslink ist abgelaufen oder wurde schon verwendet. Bitte fordere unten einen neuen an.',true);
  try{history.replaceState(null,'',location.pathname+location.search);}catch{}
  offer();
 }
 new MutationObserver(check).observe(status,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 check();
})();
