/* Sponti — Kurs zu Google, Outlook oder per .ics zum Kalender hinzufügen. */
(() => {
  'use strict';
  const root=document.querySelector('[data-sponti-calendar]');
  if(!root)return;
  const button=root.querySelector('[data-calendar-toggle]');
  const options=root.querySelector('[data-calendar-options]');
  const google=root.querySelector('[data-calendar-google]');
  const outlook=root.querySelector('[data-calendar-outlook]');
  const download=root.querySelector('[data-calendar-ics]');
  const note=root.querySelector('[data-calendar-note]');
  let event=null;
  const isoUtc=date=>date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const escapeIcs=text=>String(text??'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  function close(restoreFocus=false){
    options.hidden=true;button.setAttribute('aria-expanded','false');
    if(restoreFocus)button.focus();
  }
  function setCourse(course){
    const start=new Date(course?.starts_at);
    if(!Number.isFinite(start.getTime())){root.hidden=true;return;}
    const providedEnd=course?.ends_at?new Date(course.ends_at):null;
    const hasEnd=providedEnd&&Number.isFinite(providedEnd.getTime())&&providedEnd>start;
    const end=hasEnd?providedEnd:new Date(start.getTime()+60*60*1000);
    const name=String(course?.title||'Kurs auf Sponti').trim();
    const where=String(course?.meeting_point||course?.venue||course?.region||'').trim();
    const url=new URL('/kurs.html?id='+encodeURIComponent(String(course?.id||'')),location.origin).href;
    const description=[
      String(course?.description||'').trim(),
      hasEnd?'':'Hinweis: Die Endzeit wurde vom Anbieter nicht angegeben. Eine Stunde ist als Platzhalter im Kalender eingetragen.',
      'Kursinformationen und Buchung: '+url
    ].filter(Boolean).join('\n\n');
    event={id:String(course?.id||''),name,where,url,description,start,end};
    google.href='https://calendar.google.com/calendar/render?'+new URLSearchParams({
      action:'TEMPLATE',text:name,dates:isoUtc(start)+'/'+isoUtc(end),details:description,location:where
    });
    outlook.href='https://outlook.live.com/calendar/0/deeplink/compose?'+new URLSearchParams({
      path:'/calendar/action/compose',rru:'addevent',subject:name,
      startdt:start.toISOString(),enddt:end.toISOString(),body:description,location:where
    });
    note.textContent=hasEnd?'Der Kalendereintrag enthält den angegebenen Kurstermin.':'Keine Enduhrzeit hinterlegt: Der Kalendereintrag verwendet vorläufig 1 Stunde.';
    root.hidden=false;close();
  }
  function ics(){
    if(!event)return;
    const id=/^[0-9a-f-]{36}$/i.test(event.id)?event.id:crypto.randomUUID();
    const fields=[
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Sponti Switzerland//Kurskalender//DE',
      'CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',
      'UID:'+id+'@sponti-switzerland.ch',
      'DTSTAMP:'+isoUtc(new Date()),
      'DTSTART:'+isoUtc(event.start),
      'DTEND:'+isoUtc(event.end),
      'SUMMARY:'+escapeIcs(event.name),
      'DESCRIPTION:'+escapeIcs(event.description),
      'LOCATION:'+escapeIcs(event.where),
      'URL:'+escapeIcs(event.url),
      'END:VEVENT','END:VCALENDAR'
    ];
    // RFC 5545: lines cannot exceed 75 octets; fold without splitting a UTF-8 codepoint.
    const encoder=new TextEncoder();
    const folded=[];
    for(const line of fields){
      let part='',length=0;
      for(const char of line){
        const size=encoder.encode(char).length;
        if(length+size>75){folded.push(part);part=' '+char;length=1+size;}
        else{part+=char;length+=size;}
      }
      folded.push(part);
    }
    const blob=new Blob([folded.join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download='sponti-kurs.ics';
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    close();
  }
  button.addEventListener('click',()=>{
    if(!event)return;
    const isOpen=!options.hidden;
    options.hidden=isOpen;
    button.setAttribute('aria-expanded',String(!isOpen));
  });
  download.addEventListener('click',ics);
  for(const link of [google,outlook])link.addEventListener('click',()=>close());
  document.addEventListener('click',e=>{if(!root.contains(e.target))close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!options.hidden){e.preventDefault();close(true);}});
  window.SpontiCourseCalendar={setCourse};
})();