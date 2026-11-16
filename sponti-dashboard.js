// Kundenboard: Begrüssung aktualisieren; Favoriten werden zentral in sponti-favorites.js verwaltet.
(()=>{
 'use strict';
 const root=document.querySelector('.sponti-dashboard-layout');
 if(!root)return;
 const authKey='sponti-customer-auth';
 const updateWelcome=()=>{
  const holder=document.getElementById('sponti-welcome-name');
  if(!holder)return;
  let user=null;
  try{user=JSON.parse(localStorage.getItem(authKey)||'null')?.user||null;}catch{}
  const first=(root.querySelector('[name="first_name"]')?.value||
    user?.user_metadata?.first_name||user?.user_metadata?.given_name||'').trim();
  holder.textContent=first?first+'!':'!';
 };
 new MutationObserver(()=>{if(!root.hidden)updateWelcome()})
   .observe(root,{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-cboard-tab="overview"]'))updateWelcome();
 });
 window.addEventListener('storage',event=>{if(event.key===authKey)updateWelcome();});
 window.setTimeout(updateWelcome,1000);
 updateWelcome();
})();