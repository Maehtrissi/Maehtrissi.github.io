// Kursort bei neuen Kursen aus dem gespeicherten Anbieterprofil vorbelegen.
// Bei bestehenden Kursen bleiben individuell gespeicherte Angaben erhalten.
(function(){
 const root=document.querySelector('[data-provider-account]');
 const profile=root?.querySelector('[data-provider-form="profile"]');
 const course=root?.querySelector('[data-provider-form="course"]');
 const create=root?.querySelector('[data-new-course]');
 if(!profile||!course||!create)return;
 function regionFor(location){
  const value=location.toLocaleLowerCase('de-CH').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const rules=[
   ['zug',/\b(zug|baar|cham|steinhausen|hunenberg|rotkreuz|risch|unterageri|oberageri|walchwil|morgarten)\b/],
   ['zuerich',/\b(zurich|winterthur|uster|dietikon|dubendorf|kloten|wadenswil|horgen|bulach|adliswil)\b/],
   ['luzern',/\b(luzern|lucerne|emmen|kriens|horw|sursee|ebikon|hochdorf)\b/],
   ['schwyz',/\b(schwyz|einsiedeln|arth|goldau|brunnen|kussnacht|freibach|pfaffikon sz|lachen sz)\b/],
   ['aargau',/\b(aargau|aarau|baden|wohlen|muri|brugg|wettingen|lenzburg|spreitenbach|bremgarten|zofingen)\b/]
  ];
  const matches=rules.filter(([,rx])=>rx.test(value));
  return matches.length===1?matches[0][0]:'';
 }
 create.addEventListener('click',()=>{
  // Event-Handler des bestehenden Kurseditors zuerst ausführen lassen.
  queueMicrotask(()=>{
   if(course.elements.id?.value)return;
   const location=profile.elements.location?.value.trim()||'';
   if(!location)return;
   course.elements.venue.value=location;
   const region=regionFor(location);
   if(region)course.elements.region.value=region;
  });
 });
})();