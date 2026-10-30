// Eigene Kalender- und Zeitauswahl; bei fehlender Bibliothek bleibt die native Auswahl nutzbar.
(function(){
 const input=document.querySelector('[data-provider-form="course"] input[name="starts_at"]');
 if(!input||typeof window.flatpickr!=='function')return;
 window.flatpickr(input,{
  enableTime:true,time_24hr:true,minDate:new Date(),dateFormat:"Y-m-d\\TH:i",
  altInput:true,altFormat:"d.m.Y · H:i",minuteIncrement:15,
  allowInput:false,disableMobile:true,
  locale:window.flatpickr.l10ns.de||"default",
  onChange(){input.setCustomValidity("");},
  onReady(_dates,_date,instance){
   instance.altInput.setAttribute('aria-label','Datum und Startzeit auswählen');
   instance.altInput.setAttribute('placeholder','Datum und Uhrzeit wählen');
   instance.altInput.classList.add('provider-custom-datetime');
  }
 });
})();