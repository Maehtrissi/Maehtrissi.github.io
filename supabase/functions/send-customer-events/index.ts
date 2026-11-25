import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.117.2";
// Version 3 (Warteliste): zusätzlich waitlist_joined und waitlist_offer (eigenes HTML, keine Resend-Vorlage nötig).
const tokenHash="75d5d822f75aaefe45cd34b1f119fbae8d8f35a3cd0c7fcb49e67f0a460021ed";
const alias:Record<string,string>={
 reminder_24h:"sponti-customer-reminder-24h",
 reminder_12h:"sponti-customer-reminder-12h",
 booking_cancelled:"sponti-customer-cancellation",
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
 const html=`<!doctype html><html lang="de-CH"><body style="margin:0;background:#f5f7f0;font-family:Arial,Helvetica,sans-serif;color:#19342d"><div style="max-width:560px;margin:0 auto;padding:32px 24px"><p style="font-size:22px;font-weight:700;color:#173e30;margin:0 0 20px">Sponti</p><div style="background:#ffffff;border-radius:18px;padding:26px 24px;line-height:1.6;font-size:15px">${body}<p>Liebe Grüsse<br>Dein Sponti-Team</p></div><p style="font-size:12px;color:#6b776f;margin-top:18px">Sponti Switzerland · Pfisternweg 3 · 6340 Baar · info@sponti-switzerland.ch</p></div></body></html>`;
 return {subject,html};
}

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
    if(job.kind==="waitlist_joined"||job.kind==="waitlist_offer"){
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
    } else if(job.kind==="booking_cancelled"){
      allowed=allowed&&Boolean(b)&&["cancelled","refunded"].includes(b.booking_status)
       &&c.archived_at===null&&c.status==="published";
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
