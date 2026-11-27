import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.117.2";
// Version 5: account_deleted mit Anbieter-Variante (event_key provider:...).
// Version 4: zusätzlich course_changed, waitlist_expired, account_deleted, newsletter_subscribed;
// booking_cancelled mit eigenem HTML in drei Varianten (rückerstattet, ohne Rückerstattung, Gratiskurs).
const tokenHash="75d5d822f75aaefe45cd34b1f119fbae8d8f35a3cd0c7fcb49e67f0a460021ed";
const alias:Record<string,string>={
 reminder_24h:"sponti-customer-reminder-24h",
 reminder_12h:"sponti-customer-reminder-12h",
 course_cancelled:"sponti-customer-course-cancelled",
 review_request:"sponti-customer-review"
};
const SITE="https://www.sponti-switzerland.ch";
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
async function sha256(str:string){return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(str)))).map(n=>n.toString(16).padStart(2,"0")).join("");}
const dateTime=(date:string|Date)=>new Intl.DateTimeFormat("de-CH",{dateStyle:"full",timeStyle:"short",timeZone:"Europe/Zurich"}).format(new Date(date))+" Uhr";
const escape=(value:unknown)=>String(value??"").slice(0,1800).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
const money=(value:unknown)=>new Intl.NumberFormat("de-CH",{style:"currency",currency:"CHF"}).format(Number(value||0));
const places=(n:number)=>n===1?"1 Platz":n+" Plätze";

function waitlistMail(kind:string,w:any,c:any){
 const name=escape(String(w.guest_name||"").trim().split(/\s+/)[0]||"liebes Sponti-Mitglied");
 const title=escape(c.title||"Kurs");
 const when=escape(dateTime(c.starts_at));
 const venue=escape(c.venue||"Wird bekanntgegeben");
 const leave=SITE+"/kurs.html?id="+encodeURIComponent(c.id)+"&warteliste_abmelden="+encodeURIComponent(w.leave_token);
 const btn=(href:string,label:string)=>`<p style="margin:26px 0"><a href="${escape(href)}" style="display:inline-block;padding:14px 26px;border-radius:999px;background:#173e30;color:#ffffff;text-decoration:none;font-weight:700">${label}</a></p>`;
 let subject="",body="";
 if(kind==="waitlist_joined"){
  subject="Deine Platzanfrage für «"+String(c.title||"Kurs").slice(0,80)+"»";
  body=`<p>Hallo ${name}</p>
<p>Danke für deine Anfrage. Der Kurs <strong>${title}</strong> am ${when} ist zurzeit ausgebucht. Du stehst jetzt auf der Warteliste für ${escape(places(w.quantity))}.</p>
<p>Wird ein Platz frei, reservieren wir ihn automatisch für dich und schicken dir eine E-Mail mit einem persönlichen Buchungslink. Erst mit der Buchung über diesen Link ist dein Platz verbindlich; bis dahin bezahlst du nichts.</p>
<p style="color:#5f7067;font-size:14px">Du brauchst den Platz nicht mehr? <a href="${escape(leave)}" style="color:#173e30">Platzanfrage löschen</a></p>`;
 }else{
  const link=SITE+"/kurs.html?id="+encodeURIComponent(c.id)+"&platz="+encodeURIComponent(w.offer_token);
  subject="Ein Platz ist frei: «"+String(c.title||"Kurs").slice(0,80)+"»";
  body=`<p>Hallo ${name}</p>
<p>Gute Nachrichten: Für <strong>${title}</strong> am ${when} (${venue}) ist ${w.held_quantity===1?"ein Platz":escape(w.held_quantity+" Plätze")} frei geworden. Wir haben ${w.held_quantity===1?"ihn":"sie"} für dich reserviert.</p>
<p><strong>Reserviert bis ${escape(dateTime(w.offer_expires_at))}.</strong> Danach geben wir den Platz an die nächste Person auf der Warteliste weiter.</p>
${btn(link,"Jetzt Platz buchen")}
<p style="color:#5f7067;font-size:14px">Es gelten die <a href="${SITE}/agb" style="color:#173e30">AGB von Sponti</a>, insbesondere die kostenlose Stornierung bis 24 Stunden vor Kursbeginn. Du möchtest den Platz nicht? <a href="${escape(leave)}" style="color:#173e30">Platz freigeben</a></p>`;
 }
 return {subject,html:layout(body)};
}

const UNSUB="https://ehifskiigrfpxeiruyxr.supabase.co/functions/v1/sponti-email-unsubscribe";
function layout(body:string,footerExtra=""){
 return `<!doctype html><html lang="de-CH"><body style="margin:0;background:#f5f1e9;font-family:Arial,Helvetica,sans-serif;color:#19342d"><div style="max-width:560px;margin:0 auto;padding:32px 20px"><p style="font-size:26px;font-weight:700;color:#173e30;margin:0 0 20px">sponti<span style="color:#fa7a34">.</span></p><div style="background:#ffffff;border-radius:18px;padding:28px 24px;line-height:1.6;font-size:15px">${body}<p style="margin-top:26px">Liebe Grüsse<br>Dein Sponti-Team</p></div><p style="font-size:12px;color:#6b776f;margin-top:18px;line-height:1.6">Fragen? Antworte einfach auf diese E-Mail oder schau in unsere <a href="${SITE}/hilfe" style="color:#173e30">Hilfe &amp; FAQ</a>.<br>Sponti Switzerland · Pfisternweg 3 · 6340 Baar · info@sponti-switzerland.ch${footerExtra}</p></div></body></html>`;
}
const button=(href:string,label:string)=>`<p style="margin:26px 0"><a href="${escape(href)}" style="display:inline-block;padding:14px 26px;border-radius:999px;background:#173e30;color:#ffffff;text-decoration:none;font-weight:700">${escape(label)}</a></p>`;
const infoBox=(rows:Array<[string,string]>)=>`<table role="presentation" style="width:100%;border-collapse:collapse;background:#f7f9f3;border-radius:14px;margin:18px 0"><tbody>${rows.map(([k,v])=>`<tr><td style="padding:10px 16px;color:#5f7067;font-size:13px;width:38%;vertical-align:top">${escape(k)}</td><td style="padding:10px 16px;font-weight:700;font-size:14px">${escape(v)}</td></tr>`).join("")}</tbody></table>`;
const note=(text:string)=>`<p style="background:#fff4e8;border:1px solid #f0c9a8;border-radius:12px;padding:12px 14px;font-size:14px;color:#3d2a17">${text}</p>`;
const firstName=(v:unknown)=>escape(String(v||"").trim().split(/\s+/)[0]||"liebes Sponti-Mitglied");

function cancellationMail(b:any,c:any){
 const name=firstName(b.guest_name);const title=String(c.title||"Kurs");
 const rows:Array<[string,string]>=[["Kurs",title],["Datum",dateTime(c.starts_at)],["Ort",String(c.venue||"Wird bekanntgegeben")],["Plätze",places(Number(b.quantity||1))],["Buchungsnummer",String(b.id)]];
 const free=Number(b.total_chf||0)<=0;
 const refunded=b.payment_status==="refunded"||b.booking_status==="refunded";
 if(free){
  return {subject:"Deine Buchung wurde storniert: «"+title.slice(0,80)+"»",html:layout(`<p>Hallo ${name}</p><p>Deine Buchung wurde storniert. Der Kurs war kostenlos, es fallen also keine Kosten an.</p>${infoBox(rows)}<p>Vielleicht passt ja ein anderer Termin?</p>${button(SITE+"/kurse","Weitere Kurse entdecken")}`)};
 }
 if(refunded){
  return {subject:"Storniert und rückerstattet: «"+title.slice(0,80)+"»",html:layout(`<p>Hallo ${name}</p><p>Deine Buchung wurde storniert. Wir haben dir den vollen Betrag von <strong>${escape(money(b.total_chf))}</strong> zurückerstattet.</p>${infoBox(rows)}${note("Die Rückerstattung geht auf das Zahlungsmittel, mit dem du bezahlt hast. Je nach Bank oder Kartenherausgeber dauert es ein paar Tage, bis du den Betrag siehst.")}<p>Vielleicht passt ja ein anderer Termin?</p>${button(SITE+"/kurse","Weitere Kurse entdecken")}`)};
 }
 return {subject:"Deine Buchung wurde storniert: «"+title.slice(0,80)+"»",html:layout(`<p>Hallo ${name}</p><p>Deine Buchung wurde storniert.</p>${infoBox(rows)}${note("Da die Stornierung weniger als 24 Stunden vor Kursbeginn erfolgt ist, gibt es gemäss unseren <a href=\""+SITE+"/agb#ziffer-4\" style=\"color:#173e30\">AGB</a> leider keine Rückerstattung. Dein Platz wird wieder freigegeben und kann von jemand anderem gebucht werden.")}<p>Hast du Fragen dazu? Antworte einfach auf diese E-Mail.</p>`)};
}
function courseChangedMail(b:any,c:any){
 const name=firstName(b.guest_name);const title=String(c.title||"Kurs");
 return {subject:"Änderung bei deinem Kurs «"+title.slice(0,80)+"»",html:layout(`<p>Hallo ${name}</p><p>Bei deinem gebuchten Kurs <strong>${escape(title)}</strong> hat sich etwas geändert. Bitte prüfe die neuen Angaben:</p>${infoBox([["Neues Datum",dateTime(c.starts_at)],["Ort",String(c.venue||"Wird bekanntgegeben")],["Treffpunkt",String(c.meeting_point||c.venue||"Siehe Kursbeschreibung")],["Plätze",places(Number(b.quantity||1))],["Buchungsnummer",String(b.id)]])}<p><strong>Passt dir der neue Termin oder Ort nicht?</strong> Dann antworte einfach auf diese E-Mail. Du bekommst den vollen Betrag zurück.</p>${button(SITE+"/kurs.html?id="+encodeURIComponent(c.id),"Kurs ansehen")}`)};
}
function waitlistExpiredMail(w:any,c:any){
 const name=firstName(w.guest_name);const title=String(c.title||"Kurs");
 return {subject:"Deine Reservierung ist abgelaufen: «"+title.slice(0,80)+"»",html:layout(`<p>Hallo ${name}</p><p>Der für dich reservierte Platz bei <strong>${escape(title)}</strong> am ${escape(dateTime(c.starts_at))} wurde nicht rechtzeitig gebucht. Deshalb haben wir ihn an die nächste Person auf der Warteliste weitergegeben.</p><p>Wenn du doch noch mitmachen möchtest, schau auf der Kursseite nach. Vielleicht ist wieder etwas frei, oder du stellst eine neue Platzanfrage.</p>${button(SITE+"/kurs.html?id="+encodeURIComponent(c.id),"Zum Kurs")}`)};
}
function accountDeletedMail(provider=false){
 return {subject:provider?"Dein Sponti-Anbieterkonto wurde gelöscht":"Dein Sponti-Konto wurde gelöscht",html:layout(`<p>Hallo</p><p>${provider?"Wie gewünscht haben wir dein Anbieterkonto bei Sponti gelöscht. Dein Profil und deine Kurse sind nicht mehr öffentlich sichtbar. Bereits bezahlte Buchungen und offene Auszahlungen werden ordnungsgemäss abgewickelt.":"Wie gewünscht haben wir dein Sponti-Konto gelöscht. Deine Profilangaben, Favoriten und Benachrichtigungen sind entfernt."}</p>${note("Buchungs- und Zahlungsbelege müssen wir aus gesetzlichen Gründen noch eine Zeit lang aufbewahren. Mehr dazu in unserer <a href=\""+SITE+"/datenschutz\" style=\"color:#173e30\">Datenschutzerklärung</a>.")}<p>Schade, dass du gehst. Du kannst jederzeit wieder ein neues Konto erstellen oder als Gast buchen.</p><p style="color:#5f7067;font-size:14px">Du hast die Löschung nicht selbst veranlasst? Dann melde dich bitte sofort unter info@sponti-switzerland.ch.</p>`)};
}
function newsletterMail(m:any){
 const both=m.newsletter&&m.weekly_courses;
 const what=both?"den Sponti Newsletter und die wöchentlichen Kurstipps":m.newsletter?"den Sponti Newsletter":"die wöchentlichen Kurstipps";
 const links:Array<string>=[];
 if(m.newsletter)links.push(`<a href="${escape(UNSUB+"?token="+encodeURIComponent(m.unsubscribe_token)+"&kind=newsletter")}" style="color:#6b776f">Newsletter abbestellen</a>`);
 if(m.weekly_courses)links.push(`<a href="${escape(UNSUB+"?token="+encodeURIComponent(m.unsubscribe_token)+"&kind=weekly_courses")}" style="color:#6b776f">Kurstipps abbestellen</a>`);
 return {subject:"Schön, dass du dabei bist: Sponti-News",html:layout(`<p>Hallo</p><p>Danke! Du hast ${what} abonniert.</p><ul style="padding-left:20px;margin:14px 0">${m.weekly_courses?"<li>Einmal pro Woche passende Kurse aus deinen Lieblingskategorien</li>":""}${m.newsletter?"<li>Neuigkeiten, besondere Aktionen und Kursideen von Sponti</li>":""}</ul><p>Welche Kursarten dich interessieren, kannst du jederzeit in deinem Konto unter «Benachrichtigungen» anpassen.</p>${button(SITE+"/profil","Einstellungen ansehen")}`,"<br>"+links.join(" · "))};
}
async function sendHtml(key:string,jobId:string,to:string,mail:{subject:string,html:string},extraHeaders?:Record<string,string>){
 const r=await fetch("https://api.resend.com/emails",{method:"POST",
  headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json","Idempotency-Key":"sponti-customer-event-v1/"+jobId},
  body:JSON.stringify({from:"Sponti <info@sponti-switzerland.ch>",reply_to:"info@sponti-switzerland.ch",to:[to],subject:mail.subject,html:mail.html,...(extraHeaders?{headers:extraHeaders}:{})}),
  signal:AbortSignal.timeout(15000)});
 if(r.ok){const result=await r.json();if(typeof result.id!=="string")throw Error("Missing delivery id");return {state:"sent",id:result.id as string,reason:""};}
 return {state:([409,429].includes(r.status)||r.status>=500)?"pending":"failed",id:null,reason:"Resend HTTP "+r.status};
}
const validEmail=(v:unknown)=>typeof v==="string"&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 const token=(req.headers.get("Authorization")||"").replace(/^Bearer /i,"").trim();
 if(!/^[a-f0-9]{64}$/.test(token)||await sha256(token)!==tokenHash)return reply({error:"Unauthorized"},401);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const {data:key,error:keyError}=await db.rpc("welcome_mail_sending_key");
  if(keyError||typeof key!=="string"||!key)return reply({error:"Email service unavailable"},503);
  const {data:jobs,error:claimError}=await db.rpc("claim_customer_event_emails");
  if(claimError)throw Error("Claim failed: "+claimError.code);
  let sent=0,failed=0,skipped=0;
  for(const job of (Array.isArray(jobs)?jobs:[])){
   let state="pending",reason="",mailId:null|string=null;
   try{
    if(job.kind==="account_deleted"){
     if(!validEmail(job.recipient_email)){state="cancelled";reason="Invalid recipient";skipped++;}
     else{const res=await sendHtml(key,job.id,job.recipient_email,accountDeletedMail(String(job.event_key||"").startsWith("provider:")));state=res.state;mailId=res.id;reason=res.reason;res.state==="sent"?sent++:failed++;}
    }else if(job.kind==="newsletter_subscribed"){
     const {data:m,error:mErr}=await db.schema("private").from("sponti_customer_marketing_preferences")
      .select("email,newsletter,weekly_courses,unsubscribe_token").eq("user_id",job.user_id).maybeSingle();
     const ok=Boolean(m&&!mErr&&(m.newsletter||m.weekly_courses)&&validEmail(job.recipient_email)
      &&String(m.email||"").trim().toLowerCase()===job.recipient_email.trim().toLowerCase()&&m.unsubscribe_token);
     if(!ok){state="cancelled";reason="Subscription no longer active";skipped++;}
     else{const res=await sendHtml(key,job.id,job.recipient_email,newsletterMail(m));state=res.state;mailId=res.id;reason=res.reason;res.state==="sent"?sent++:failed++;}
    }else if(job.kind==="waitlist_expired"){
     const {data:w}=await db.from("course_waitlist").select("id,course_id,guest_name,guest_email,status").eq("id",job.waitlist_id).maybeSingle();
     const {data:c}=await db.from("courses").select("id,title,starts_at,status,archived_at").eq("id",job.course_id).maybeSingle();
     const ok=Boolean(w&&c&&w.course_id===c.id&&w.status==="expired"&&c.archived_at===null&&c.status==="published"
      &&new Date(c.starts_at).getTime()>Date.now()&&validEmail(job.recipient_email)
      &&job.recipient_email.trim().toLowerCase()===String(w.guest_email||"").trim().toLowerCase());
     if(!ok){state="cancelled";reason="Waitlist entry no longer eligible";skipped++;}
     else{const res=await sendHtml(key,job.id,job.recipient_email,waitlistExpiredMail(w,c));state=res.state;mailId=res.id;reason=res.reason;res.state==="sent"?sent++:failed++;}
    }else if(job.kind==="booking_cancelled"||job.kind==="course_changed"){
     const {data:b}=await db.from("course_checkout_bookings")
      .select("id,course_id,guest_name,guest_email,quantity,total_chf,booking_status,payment_status").eq("id",job.booking_id).maybeSingle();
     const {data:c}=await db.from("courses")
      .select("id,title,starts_at,venue,meeting_point,status,archived_at").eq("id",job.course_id).maybeSingle();
     const {data:qa}=await db.schema("private").from("sponti_stripe_qa_courses").select("course_id").eq("course_id",job.course_id).limit(1);
     let ok=Boolean(b&&c&&b.course_id===c.id&&validEmail(job.recipient_email)&&(!qa||qa.length===0)
      &&job.recipient_email.trim().toLowerCase()===String(b.guest_email||"").trim().toLowerCase()
      &&c.archived_at===null&&c.status==="published");
     if(job.kind==="booking_cancelled")ok=ok&&["cancelled","refunded"].includes(b.booking_status);
     else{
      const key2=":"+Math.floor(new Date(c.starts_at).getTime()/1000)+":";
      ok=ok&&b.booking_status==="confirmed"&&["paid","not_required"].includes(b.payment_status)
        &&new Date(c.starts_at).getTime()>Date.now()&&String(job.event_key||"").includes(key2);
     }
     if(!ok){state="cancelled";reason="Booking no longer eligible";skipped++;}
     else{const mail=job.kind==="booking_cancelled"?cancellationMail(b,c):courseChangedMail(b,c);
      const res=await sendHtml(key,job.id,job.recipient_email,mail);state=res.state;mailId=res.id;reason=res.reason;res.state==="sent"?sent++:failed++;}
    }else if(job.kind==="waitlist_joined"||job.kind==="waitlist_offer"){
     const {data:w,error:wErr}=await db.from("course_waitlist")
      .select("id,course_id,guest_name,guest_email,quantity,status,offer_token,offer_expires_at,held_quantity,leave_token")
      .eq("id",job.waitlist_id).maybeSingle();
     const {data:c,error:cErr}=await db.from("courses")
      .select("id,title,starts_at,venue,status,archived_at").eq("id",job.course_id).maybeSingle();
     let ok=Boolean(w&&c&&!wErr&&!cErr&&w.course_id===c.id&&c.archived_at===null&&c.status==="published"
      &&typeof job.recipient_email==="string"&&job.recipient_email.trim().toLowerCase()===String(w.guest_email||"").trim().toLowerCase()
      &&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(job.recipient_email));
     if(job.kind==="waitlist_joined")ok=ok&&w.status==="waiting";
     else ok=ok&&w.status==="offered"&&typeof w.offer_token==="string"&&new Date(w.offer_expires_at).getTime()>Date.now()+5*60000
       &&String(job.event_key||"").endsWith(":"+w.offer_token);
     if(!ok){state="cancelled";reason="Waitlist entry no longer eligible";skipped++;}
     else{
      const mail=waitlistMail(job.kind,w,c);
      const r=await fetch("https://api.resend.com/emails",{method:"POST",
       headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json","Idempotency-Key":"sponti-customer-event-v1/"+job.id},
       body:JSON.stringify({from:"Sponti <info@sponti-switzerland.ch>",reply_to:"info@sponti-switzerland.ch",to:[job.recipient_email],subject:mail.subject,html:mail.html}),
       signal:AbortSignal.timeout(15000)});
      if(r.ok){const result=await r.json();if(typeof result.id!=="string")throw Error("Missing delivery id");state="sent";mailId=result.id;sent++;}
      else{state=([409,429].includes(r.status)||r.status>=500)?"pending":"failed";reason="Resend HTTP "+r.status;failed++;}
     }
    }else{
    const template=alias[job.kind];
    const {data:b,error:bookingError}=await db.from("course_checkout_bookings")
     .select("id,course_id,guest_name,guest_email,quantity,total_chf,booking_status,payment_status")
     .eq("id",job.booking_id).maybeSingle();
    const {data:c,error:courseError}=await db.from("courses")
     .select("id,title,starts_at,ends_at,venue,meeting_point,additional_info,status,archived_at")
     .eq("id",job.course_id).maybeSingle();
    const {data:qa}=await db.schema("private").from("sponti_stripe_qa_courses")
     .select("course_id").eq("course_id",job.course_id).limit(1);
    let allowed=Boolean(template&&b&&c&&!bookingError&&!courseError
     &&b.course_id===c.id&&typeof job.recipient_email==="string"
     &&job.recipient_email.trim().toLowerCase()===String(b.guest_email||"").trim().toLowerCase()
     &&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(job.recipient_email)&&(!qa||qa.length===0));
    const active=b&&b.booking_status==="confirmed"&&["paid","not_required"].includes(b.payment_status);
    const start=c?new Date(c.starts_at).getTime():0;
    const end=c?new Date(c.ends_at||new Date(start+2*3600000)).getTime():0;
    const current=Date.now(),scheduled=new Date(job.scheduled_at).getTime();
    if(job.kind==="reminder_24h"||job.kind==="reminder_12h"){
      const hours=job.kind==="reminder_24h"?24:12;
      allowed=allowed&&Boolean(active)&&c.archived_at===null&&c.status==="published"
       &&start>current&&Math.abs(scheduled-(start-hours*3600000))<=300000
       &&current-scheduled<900000;
    } else if(job.kind==="review_request"){
      allowed=allowed&&Boolean(active)&&c.archived_at===null&&c.status==="published"
       &&end+24*3600000<=current&&current<end+48*3600000;
    } else if(job.kind==="course_cancelled"){
      allowed=allowed&&Boolean(c)&&(c.archived_at!==null||c.status!=="published");
    } else allowed=false;
    if(!allowed){state="cancelled";reason="Booking no longer eligible or schedule changed";skipped++;}
    else{
     const fullName=String(b.guest_name||"").trim();
     const name=fullName.split(/\s+/)[0]||"liebes Sponti-Mitglied";
     const deadline=new Date(start-24*3600000);
     const refund=b.total_chf<=0
      ?"Der Kurs war kostenlos. Es ist daher keine Rückerstattung erforderlich."
      :b.payment_status==="refunded"
      ?"Die Zahlung ist im Buchungssystem als rückerstattet erfasst. Die Gutschrift auf dein Zahlungsmittel kann je nach Zahlungsanbieter etwas Zeit benötigen."
      :"Eine Rückerstattung ist durch diese Nachricht noch nicht bestätigt. Sponti prüft den Vorgang und informiert dich über den weiteren Ablauf. Bei Fragen wende dich bitte an info@sponti-switzerland.ch.";
     // Persönlicher Bewertungslink (nur für review_request); Fallback: Erfahrungen-Seite
     let reviewUrl="https://sponti-switzerland.ch/erfahrungen#review-form";
     if(job.kind==="review_request"){
      const {data:tok,error:tokErr}=await db.rpc("sponti_issue_review_token",{p_booking_id:b.id});
      if(tokErr||typeof tok!=="string"||!/^[0-9a-f]{48}$/.test(tok))throw Error("Review token failed");
      reviewUrl="https://sponti-switzerland.ch/bewerten?t="+tok;
     }
     const vars={
       CUSTOMER_NAME:name,COURSE_TITLE:String(c.title||"Kurs"),
       COURSE_DATETIME:dateTime(c.starts_at),COURSE_VENUE:String(c.venue||"Wird bekanntgegeben"),
       MEETING_POINT:String(c.meeting_point||c.venue||"Bitte beim Anbieter nachfragen"),
       ADDITIONAL_INFO:String(c.additional_info||"Keine zusätzlichen Angaben hinterlegt"),
       QUANTITY:String(b.quantity||1),BOOKING_NUMBER:String(b.id),
       TOTAL_PRICE:money(b.total_chf),PAYMENT_LABEL:b.payment_status==="paid"?"Zahlung bestätigt":"Keine Zahlung erforderlich",
       CANCEL_DEADLINE:dateTime(deadline),REFUND_MESSAGE:refund,CANCELLED_AT:dateTime(job.created_at),
       REVIEW_URL:reviewUrl
     };
     const safeVars:Record<string,string>={};
     for(const [k,v] of Object.entries(vars))safeVars[k]=escape(v);
     const r=await fetch("https://api.resend.com/emails",{
      method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json",
        "Idempotency-Key":"sponti-customer-event-v1/"+job.id},
      body:JSON.stringify({from:"Sponti <info@sponti-switzerland.ch>",
       reply_to:"info@sponti-switzerland.ch",to:[job.recipient_email],
       template:{id:template,variables:safeVars}}),
      signal:AbortSignal.timeout(15000)
     });
     if(r.ok){const result=await r.json();if(typeof result.id!=="string")throw Error("Missing delivery id");
      state="sent";mailId=result.id;sent++;
     }else{state=([409,429].includes(r.status)||r.status>=500)?"pending":"failed";reason="Resend HTTP "+r.status;failed++;}
    }
    }
   }catch(e){reason=e instanceof Error?e.message.slice(0,150):"Temporary email failure";failed++;}
   const {data:done,error:ackError}=await db.rpc("finish_customer_event_email",{
     p_id:job.id,p_lease_id:job.lease_id,p_status:state,p_resend_id:mailId,p_error:reason||null});
   if(ackError||done!==true)throw Error("Queue acknowledgement failed");
   await new Promise(resolve=>setTimeout(resolve,650));
  }
  return reply({ok:true,processed:(jobs||[]).length,sent,failed,skipped});
 }catch(e){console.error("Customer email worker issue",e instanceof Error?e.message:"Unknown");
  return reply({error:"Temporary customer email queue problem"},500);}
});
