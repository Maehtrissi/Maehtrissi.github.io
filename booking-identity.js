// Buchungsidentität: Gast oder bestehendes Sponti-Kundenkonto.
// Das Zahlungs- und Reservierungsverfahren bleibt für beide Optionen gleich.
(() => {
  const form=document.getElementById('booking-form');
  const chooser=document.getElementById('booking-identity-choice');
  const loginBox=document.getElementById('booking-identity-login');
  const loginForm=document.getElementById('booking-login-form');
  const selected=document.getElementById('booking-identity-selected');
  const selectedText=document.getElementById('booking-identity-selected-text');
  const status=document.getElementById('booking-identity-status');
  const loginError=document.getElementById('booking-login-error');
  const loginButton=document.getElementById('booking-login-button');
  const guestButton=document.getElementById('booking-as-guest');
  const accountButton=document.getElementById('booking-with-account');
  const changeButton=document.getElementById('booking-change-identity');
  const backButton=document.getElementById('booking-login-back');
  const signup=document.getElementById('booking-create-account');
  const recover=document.getElementById('booking-recover-password');
  if(!form||!chooser||!loginBox||!loginForm||!selected||!guestButton||!accountButton)return;

  const project='https://ehifskiigrfpxeiruyxr.supabase.co';
  const publishable='sb_publishable_ne8xIO5aoko5eW4ONLfBRQ_uyfBBhYy';
  const courseId=new URLSearchParams(location.search).get('id')||'';
  const courseQuery=/^[0-9a-f-]{36}$/i.test(courseId)?'&course='+encodeURIComponent(courseId):'';
  signup.href='/profil?mode=register'+courseQuery;
  recover.href='/profil?mode=reset'+courseQuery;

  const personal=['first_name','last_name','email','phone'];
  let clientPromise=null;
  let mode=null;
  let cachedUser=null;
  const setStatus=(message='',error=false)=>{
    status.textContent=message;
    status.classList.toggle('is-error',error);
  };
  const client=()=>{
    if(!clientPromise)clientPromise=import('https://esm.sh/@supabase/supabase-js@2.57.0')
      .then(({createClient})=>createClient(project,publishable,{
        auth:{storageKey:'sponti-customer-auth',persistSession:true,
          autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}
      }));
    return clientPromise;
  };
  const switchView=view=>{
    chooser.hidden=view!=='choice';
    loginBox.hidden=view!=='login';
    selected.hidden=view!=='selected';
    form.hidden=view!=='selected';
    if(view!=='selected'){
      delete form.dataset.checkoutMode;
      form.elements.email.readOnly=false;
    }
  };
  const scrollToContact=()=>document.getElementById('step-contact')?.scrollIntoView({
    behavior:'smooth',block:'start'
  });
  const showGuest=()=>{
    mode='guest';
    cachedUser=null;
    personal.forEach(key=>form.elements[key].value='');
    form.elements.email.readOnly=false;
    form.dataset.checkoutMode='guest';
    selectedText.textContent='Du buchst als Gast – ohne Kundenkonto. Bitte gib deine Kontaktdaten ein.';
    document.getElementById('prefill-status').textContent='Für diese Buchung werden nur die benötigten Kontaktdaten verwendet.';
    setStatus('');
    switchView('selected');
    form.dataset.checkoutMode='guest';
    form.elements.first_name.focus({preventScroll:true});
  };
  const fillAccount=async (user)=>{
    if(!user||user.is_anonymous||!user.email||!user.email_confirmed_at)throw Error('Bitte bestätige zuerst die E-Mail-Adresse deines Kundenkontos.');
    const db=await client();
    let profile=null;
    try{
      const result=await db.rpc('customer_profile');
      if(!result.error)profile=result.data;
    }catch{/* Kontodaten bleiben auch ohne ausgefülltes Profil nutzbar. */}
    const metadata=user.user_metadata||{};
    const fullName=String(profile?.name||metadata.name||metadata.full_name||
      [metadata.first_name,metadata.last_name].filter(Boolean).join(' ')||'').trim();
    const names=fullName.split(/\s+/).filter(Boolean);
    const first=String(metadata.first_name||names[0]||'').trim();
    const last=String(metadata.last_name||names.slice(1).join(' ')||'').trim();
    form.elements.first_name.value=first.slice(0,100);
    form.elements.last_name.value=last.slice(0,100);
    form.elements.email.value=user.email;
    form.elements.email.readOnly=true;
    form.elements.phone.value=String(profile?.phone||metadata.phone||'').trim().slice(0,32);
    mode='account';
    cachedUser=user;
    switchView('selected');
    form.dataset.checkoutMode='account';
    form.elements.email.readOnly=true;
    selectedText.textContent='Du buchst mit deinem Sponti-Kundenkonto ('+user.email+').';
    document.getElementById('prefill-status').textContent=
      'Deine Kontaktdaten wurden soweit vorhanden ausgefüllt. Bitte ergänze fehlende Angaben und prüfe alles vor der Buchung.';
    setStatus('');
    if(!first)form.elements.first_name.focus({preventScroll:true});
    else if(!last)form.elements.last_name.focus({preventScroll:true});
    else if(!form.elements.phone.value)form.elements.phone.focus({preventScroll:true});
  };

  guestButton.addEventListener('click',showGuest);
  accountButton.addEventListener('click',async()=>{
    setStatus('Kundenkonto wird geprüft …');
    accountButton.disabled=true;
    try{
      const db=await client();
      const {data:{user},error}=await db.auth.getUser();
      if(error)throw error;
      if(user&&!user.is_anonymous){
        await fillAccount(user);
        return;
      }
      switchView('login');
      loginError.textContent='';
      setStatus('');
      loginForm.elements.email.focus({preventScroll:true});
    }catch{
      switchView('login');
      loginError.textContent='Falls du bereits ein Kundenkonto hast, melde dich mit E-Mail und Passwort an.';
      setStatus('');
    }finally{accountButton.disabled=false;}
  });
  loginForm.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!loginForm.reportValidity())return;
    loginButton.disabled=true;
    loginButton.textContent='Anmeldung läuft …';
    loginError.textContent='';
    try{
      const db=await client();
      const email=loginForm.elements.email.value.trim();
      const password=loginForm.elements.password.value;
      const {data,error}=await db.auth.signInWithPassword({email,password});
      if(error)throw error;
      if(!data.user)throw Error('Anmeldung nicht abgeschlossen.');
      await fillAccount(data.user);
      loginForm.elements.password.value='';
      scrollToContact();
    }catch(e){
      const msg=String(e?.message||'').toLowerCase();
      loginError.textContent=msg.includes('email not confirmed')
        ? 'Bitte bestätige zuerst deine E-Mail-Adresse.'
        :msg.includes('invalid login credentials')
          ? 'E-Mail oder Passwort stimmen nicht.'
          :'Anmeldung derzeit nicht möglich. Bitte versuche es erneut oder buche als Gast.';
    }finally{
      loginButton.disabled=false;
      loginButton.textContent='Anmelden und Daten übernehmen';
    }
  });
  const back=()=>{
    mode=null;
    switchView('choice');
    loginForm.elements.password.value='';
    loginError.textContent='';
    setStatus('Wähle, wie du buchen möchtest.');
  };
  backButton.addEventListener('click',back);
  changeButton.addEventListener('click',back);
  form.addEventListener('submit',event=>{
    if(!form.dataset.checkoutMode){
      event.preventDefault();
      switchView('choice');
      setStatus('Bitte wähle zuerst «Als Gast buchen» oder «Mit Kundenkonto anmelden».',true);
      scrollToContact();
    }
  },true);
  // Die anonyme Buchung bleibt jederzeit nutzbar, auch wenn die Auth-Bibliothek nicht lädt.
  switchView('choice');
  setStatus('Wähle aus, wie du buchen möchtest.');
  client().then(db=>db.auth.getUser()).then(async ({data:{user},error})=>{
    if(error||!user||user.is_anonymous||mode!==null)return;
    await fillAccount(user);
  }).catch(()=>{
    if(mode===null)setStatus('Du kannst als Gast buchen oder dich mit deinem Kundenkonto anmelden.');
  });
})();
