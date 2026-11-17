/* Anbieter-Kurserstellung: progressive, booking-style three-step editor. */
(()=>{
'use strict';
const form=document.querySelector('[data-course-editor] form[data-provider-form="course"]');
if(!form)return;
const steps=[...form.querySelectorAll('[data-course-wizard-step]')];
if(steps.length!==3)return;
form.noValidate=true;
let active=0,unlocked=0;
const reduceMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function show(index,scroll=true){
 if(index<0||index>2||index>unlocked)return;
 active=index;
 steps.forEach((step,i)=>{
  const current=i===index;
  const body=step.querySelector('.provider-course-wizard-body');
  const toggle=step.querySelector('[data-course-wizard-toggle]');
  step.classList.toggle('is-current',current);
  toggle.disabled=i>unlocked;
  toggle.setAttribute('aria-expanded',String(current));
  if(current){
   const wasHidden=body.hidden;
   body.hidden=false;
   if(wasHidden&&!reduceMotion()){
    body.classList.remove('is-revealing');
    void body.offsetWidth;
    body.classList.add('is-revealing');
    window.setTimeout(()=>body.classList.remove('is-revealing'),500);
   }
  }else{
   body.hidden=true;
   body.classList.remove('is-revealing');
  }
 });
 if(scroll)steps[index].scrollIntoView({behavior:reduceMotion()?'auto':'smooth',block:'start'});
}
function invalidInStep(i){
 const inputs=steps[i].querySelectorAll('input,select,textarea');
 for(const input of inputs){
  if(input.disabled||input.type==='hidden')continue;
  if(!input.checkValidity())return input;
 }
 return null;
}
function validateStep(i){
 const invalid=invalidInStep(i);
 if(!invalid)return true;
 unlocked=Math.max(unlocked,i);
 show(i,false);
 const accord=invalid.closest('[data-course-accordion]');
 if(accord)accord.open=true;
 invalid.reportValidity();
 invalid.focus();
 invalid.scrollIntoView({behavior:'smooth',block:'center'});
 return false;
}
function next(i){
 if(!validateStep(i))return;
 unlocked=Math.max(unlocked,i+1);
 show(i+1);
}
steps.forEach((step,i)=>{
 step.querySelector('[data-course-wizard-toggle]').addEventListener('click',()=>{if(i<=unlocked)show(i);});
 step.querySelector('[data-course-wizard-next]')?.addEventListener('click',()=>next(i));
 step.querySelector('[data-course-wizard-back]')?.addEventListener('click',()=>show(i-1));
});
form.addEventListener('submit',event=>{
 if(form.getAttribute('aria-busy')==='true'){event.preventDefault();event.stopImmediatePropagation();return;}
 if(active<2){
  event.preventDefault();
  event.stopImmediatePropagation();
  next(active);
  return;
 }
 for(let i=0;i<steps.length;i++){
  if(!validateStep(i)){
   event.preventDefault();
   event.stopImmediatePropagation();
   return;
  }
 }
},true);
form.addEventListener('reset',()=>{
 active=0;unlocked=0;show(0,false);
});
show(0,false);
})();
