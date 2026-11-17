/* Freie Texteingabe für "Etwas anderes" / "Andere" in Sponti-Auswahllisten. */
(()=>{
'use strict';
const otherRe=/^(?:etwas anderes|andere|sonstiges|sonstige)$/i;
function initSelect(select){
 if(select.dataset.spontiOtherInitialized)return;
 const other=[...select.options].find(o=>otherRe.test(o.textContent.trim()));
 if(!other||!select.closest('form'))return;
 const label=select.closest('label');
 if(!label)return;
 select.dataset.spontiOtherInitialized='true';
 const wrap=document.createElement('span');wrap.className='sponti-custom-choice';wrap.hidden=true;
 const prompt=document.createElement('span');prompt.className='sponti-custom-choice-title';prompt.textContent=other.textContent.trim()==='Andere'?'Welche Region möchtest du angeben?':'Was möchtest du stattdessen angeben?';
 const input=document.createElement('input');input.type='text';input.maxLength=120;input.autocomplete='off';input.placeholder='Eigene Angabe eingeben';input.setAttribute('aria-label',prompt.textContent);
 wrap.append(prompt,input);select.after(wrap);
 let customOption=null;
 const isCustom=o=>o===other||o?.dataset.spontiCustomValue==='true';
 const update=()=>{
  const custom=isCustom(select.selectedOptions[0]);
  wrap.hidden=!custom;
  input.required=custom&&select.required;
  if(custom&&select.selectedOptions[0]===customOption&&input.value.trim()!==customOption.value)input.value=customOption.value;
  if(!custom){input.required=false;input.value='';}
 };
 input.addEventListener('input',()=>{
  const value=input.value.trim();
  if(value){
   if(!customOption){customOption=document.createElement('option');customOption.dataset.spontiCustomValue='true';select.add(customOption);}
   customOption.value=value;customOption.textContent=value;select.value=value;
  }else{
   customOption?.remove();customOption=null;select.value=other.value;
  }
 });
 select.addEventListener('change',update);
 select.spontiSetOtherValue=value=>{
  const text=String(value??'').trim();
  if(!text){select.value='';update();return;}
  const known=[...select.options].find(o=>o!==customOption&&o.value===text);
  if(known){select.value=text;customOption?.remove();customOption=null;update();return;}
  if(!customOption){customOption=document.createElement('option');customOption.dataset.spontiCustomValue='true';select.add(customOption);}
  customOption.value=text;customOption.textContent=text;select.value=text;input.value=text;update();
 };
 update();
}
function initOtherRegionCheckbox(){
 const checkbox=document.querySelector('form[data-account-form="preferences"] input[name="regions"][value="andere"]');
 if(!checkbox||checkbox.dataset.spontiOtherInitialized)return;
 checkbox.dataset.spontiOtherInitialized='true';
 const holder=document.createElement('label');holder.className='sponti-custom-region-label';holder.hidden=true;
 holder.textContent='Welche weiteren Regionen?';
 const input=document.createElement('input');input.type='text';input.name='other_regions';input.maxLength=200;input.placeholder='z. B. Basel, Bern';input.autocomplete='off';
 holder.append(input);checkbox.closest('label')?.after(holder);
 const update=()=>{holder.hidden=!checkbox.checked;input.required=checkbox.checked;};
 checkbox.addEventListener('change',update);
 const group=checkbox.closest('fieldset');
 group?.addEventListener('change',()=>queueMicrotask(update));
 window.SpontiOtherOptions._syncOtherRegions=update;
 update();
}
function run(){document.querySelectorAll('form select').forEach(initSelect);initOtherRegionCheckbox();}
window.SpontiOtherOptions={setValue:(select,value)=>{if(!select)return;initSelect(select);if(typeof select.spontiSetOtherValue==='function')select.spontiSetOtherValue(value);else select.value=value??'';},refresh:run};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
else run();
})();