import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.117.2";
// Version 2: zusätzlich account_live, free_phase_ending, course_online, course_changed, waitlist_joined (eigenes HTML).

const tokenHash="75d5d822f75aaefe45cd34b1f119fbae8d8f35a3cd0c7fcb49e67f0a460021ed";
const templates:Record<string,string>={
 booking:"sponti-provider-new-booking",
 booking_cancelled:"sponti-provider-booking-cancelled",
 list_24h:"sponti-provider-list-24h",
 list_3h:"sponti-provider-list-3h",
 course_cancelled:"sponti-provider-course-cancelled",
 review:"sponti-provider-new-review"
};
const SITE="https://www.sponti-switzerland.ch";
const BOARD=SITE+"/anbieter";
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
});
async function digest(token:string):Promise<string>{
 return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token))))
 .map(x=>x.toString(16).padStart(2,"0")).join("");
}
const esc=(value:unknown)=>String(value??"").slice(0,1800).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
function layout(body:string){
 return `<!doctype html><html lang="de-CH"><body style="margin:0;background:#f5f1e9;font-family:Arial,Helvetica,sans-serif;color:#19342d"><div style="max-width:560px;margin:0 auto;padding:32px 20px"><p style="font-size:26px;font-weight:700;color:#173e30;margin:0 0 20px">sponti<span style="color:#fa7a34">.</span></p><div style="background:#ffffff;border-radius:18px;padding:28px 24px;line-height:1.6;font-size:15px">${body}<p style="margin-top:26px">Liebe Grüsse<br>Dein Sponti-Team</p></div><p style="font-size:12px;color:#6b776f;margin-top:18px;line-height:1.6">Fragen? Antworte einfach auf diese E-Mail.<br>Sponti Switzerland · Pfisternweg 3 · 6340 Baar · info@sponti-switzerland.ch</p></div></body></html>`;
}
const button=(href:string,label:string)=>`<p style="margin:26px 0"><a href="${esc(href)}" style="display:inline-block;padding:14px 26px;border-radius:999px;background:#173e30;color:#ffffff;text-decoration:none;font-weight:700">${esc(label)}</a></p>`;
const infoBox=(rows:Array<[string,string]>)=>`<table role="presentation" style="width:100%;border-collapse:collapse;background:#f7f9f3;border-radius:14px;margin:18px 0"><tbody>${rows.map(([k,v])=>`<tr><td style="padding:10px 16px;color:#5f7067;font-size:13px;width:38%;vertical-align:top">${esc(k)}</td><td style="padding:10px 16px;font-weight:700;font-size:14px">${esc(v)}</td></tr>`).join("")}</tbody></table>`;
const note=(html:string)=>`<p style="background:#fff4e8;border:1px solid #f0c9a8;border-radius:12px;padding:12px 14px;font-size:14px;color:#3d2a17">${html}</p>`;

export function providerHtmlMail(kind:string,v:any):{subject:string,html:string}|null{
 const hello=`<p>Hallo ${esc(v.CONTACT||v.COMPANY||"")}</p>`;
 const title=String(v.COURSE_TITLE||"Kurs");
 if(kind==="account_live"){
  return {subject:"Du bist live auf Sponti",html:layout(`${hello}<p>Super Neuigkeiten: <strong>${esc(v.COMPANY)}</strong> ist ab sofort auf Sponti sichtbar. Dein Profil ist öffentlich, und deine Kurse können jetzt gebucht werden.</p>${infoBox([["Gratisphase bis",String(v.FREE_UNTIL||"")],["Danach","Standard-Tarif CHF 15 pro Monat, nur mit deiner Zustimmung"],["Provision","20 % unter CHF 20 pro Platz, 15 % ab CHF 20"]])}<p><strong>So holst du das Meiste heraus:</strong></p><ul style="padding-left:20px;margin:8px 0 14px"><li>Veröffentliche Kurse mit freien Plätzen, gerne auch kurzfristig.</li><li>Lade schöne Bilder hoch und beschreibe, was die Teilnehmenden erwartet.</li><li>Halte Datum, Ort und freie Plätze immer aktuell.</li></ul>${button(BOARD,"Zum Anbieterboard")}`)};
 }
 if(kind==="free_phase_ending"){
  return {subject:"Deine Gratisphase bei Sponti endet am "+String(v.FREE_UNTIL||""),html:layout(`${hello}<p>Deine kostenlose Startphase bei Sponti endet am <strong>${esc(v.FREE_UNTIL)}</strong>.</p><p>Danach geht es mit dem <strong>Standard-Tarif für CHF 15 pro Monat</strong> weiter. Die Provision pro Buchung bleibt gleich.</p>${note("Wichtig: Der Standard-Tarif startet nur, wenn du ausdrücklich zustimmst. Ohne Zustimmung pausieren wir nach Ablauf der Gratisphase die Annahme neuer Buchungen. Bereits gebuchte Kurse werden normal abgewickelt.")}<p>Möchtest du weitermachen? Antworte einfach mit <strong>«Ja, ich möchte weitermachen»</strong> auf diese E-Mail. Bei Fragen melden wir uns gerne bei dir.</p><p style="color:#5f7067;font-size:14px">Details findest du in unseren <a href="${SITE}/agb#ziffer-7" style="color:#173e30">AGB (Ziffer 7)</a>.</p>`)};
 }
 if(kind==="course_online"){
  const list:Array<any>=Array.isArray(v.COURSES)?v.COURSES:[];
  const items=list.map(c=>`<li style="margin:0 0 6px"><a href="${esc(SITE+"/kurs.html?id="+encodeURIComponent(String(c.id)))}" style="color:#173e30;font-weight:700">${esc(c.title)}</a><br><span style="color:#5f7067;font-size:14px">${esc(c.when)}</span></li>`).join("");
  const one=list.length===1;
  return {subject:one?"Dein Kurs ist online: «"+String(list[0]?.title||"Kurs").slice(0,80)+"»":list.length+" Kurse sind jetzt online",html:layout(`${hello}<p>${one?"Dein Kurs ist jetzt auf Sponti online und kann gebucht werden:":"Diese Kurse sind jetzt auf Sponti online und können gebucht werden:"}</p><ul style="padding-left:20px;margin:14px 0">${items}</ul><p>Tipp: Teile den Link zu deinem Kurs auch auf Instagram oder in deinem Newsletter.</p>${button(BOARD,"Zum Anbieterboard")}`)};
 }
 if(kind==="course_changed"){
  const n=Number(v.INFORMED_BOOKINGS||0);
  return {subject:"Dein Kurs wurde geändert: «"+title.slice(0,80)+"»",html:layout(`${hello}<p>Die Änderung an deinem Kurs ist gespeichert. Das sind die aktuellen Angaben:</p>${infoBox([["Kurs",title],["Datum",String(v.COURSE_DATETIME||"")],["Ort",String(v.COURSE_VENUE||"")]])}<p>${n>0?`Wir haben die <strong>${n} ${n===1?"Person, die":"Personen, die"}</strong> bereits gebucht ${n===1?"hat":"haben"}, per E-Mail über die Änderung informiert. Wer nicht mehr teilnehmen kann, bekommt den vollen Betrag zurück.`:"Für diesen Kurs gibt es noch keine Buchungen, es mussten also keine Teilnehmenden informiert werden."}</p>${button(BOARD,"Zum Anbieterboard")}`)};
 }
 if(kind==="waitlist_joined"){
  const q=Number(v.WAITLIST_QUANTITY||1);
  return {subject:"Neue Platzanfrage für «"+title.slice(0,80)+"»",html:layout(`${hello}<p>Für deinen ausgebuchten Kurs gibt es eine neue Platzanfrage auf der Warteliste.</p>${infoBox([["Kurs",title],["Datum",String(v.COURSE_DATETIME||"")],["Anfrage von",String(v.WAITLIST_NAME||"")],["Plätze",q===1?"1 Platz":q+" Plätze"],["Insgesamt auf der Warteliste",String(v.WAITLIST_TOTAL||q)+" Plätze"]])}<p>Wird ein Platz frei, zum Beispiel durch eine Stornierung, reserviert Sponti ihn automatisch für die nächste Person. Du musst nichts tun.</p>${note("Tipp: Hast du noch Kapazität? Erhöhe einfach die Anzahl Plätze im Anbieterboard. Die Plätze gehen dann direkt an die Warteliste.")}${button(BOARD,"Zum Anbieterboard")}`)};
 }
 return null;
}

Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!/^[a-f0-9]{64}$/.test(token)||await digest(token)!==tokenHash)
  return reply({error:"Unauthorized"},401);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{
   auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const {data:apiKey,error:keyError}=await db.rpc("welcome_mail_sending_key");
  if(keyError||typeof apiKey!=="string"||!apiKey)return reply({error:"Mail service not available"},503);
  const {data:jobs,error}=await db.rpc("claim_provider_event_emails");
  if(error)throw Error("Unable to claim provider emails: "+error.code);
  let sent=0,failed=0,skipped=0;
  for(const job of (Array.isArray(jobs)?jobs:[])){
    let state="pending",reason="",messageId:null|string=null;
    try{
      const template=templates[job.kind];
      const htmlMail=template?null:providerHtmlMail(job.kind,job.variables||{});
      if((!template&&!htmlMail)||typeof job.email!=="string"||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(job.email))
        {state="cancelled";reason="Invalid template or recipient";skipped++;}
      else{
        let payload:Record<string,unknown>;
        if(template){
          const safeVars:Record<string,string>={};
          for(const [key,value] of Object.entries(job.variables||{})){
            if(!/^[A-Z_0-9]+$/.test(key)||typeof value==="object")continue;
            // Templates use plain text values in HTML nodes: neutralize markup.
            safeVars[key]=String(value??"").slice(0,18000)
             .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
             .replaceAll('"',"&quot;").replaceAll("'","&#39;");
          }
          payload={template:{id:template,variables:safeVars}};
        }else payload={subject:htmlMail!.subject,html:htmlMail!.html};
        const response=await fetch("https://api.resend.com/emails",{
          method:"POST",
          headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json",
                   "Idempotency-Key":"sponti-provider-event-v1/"+job.id},
          body:JSON.stringify({from:"Sponti <info@sponti-switzerland.ch>",
            reply_to:"info@sponti-switzerland.ch",to:[job.email],...payload}),
          signal:AbortSignal.timeout(15000)
        });
        if(response.ok){
          const data=await response.json();
          if(typeof data.id!=="string")throw Error("Missing Resend message id");
          state="sent";messageId=data.id;sent++;
        } else {
          state=(response.status===409||response.status===429||response.status>=500)?"pending":"failed";
          reason="Resend HTTP "+response.status;failed++;
        }
      }
    }catch(e){failed++;reason=e instanceof Error?e.message.slice(0,130):"Email delivery uncertainty";}
    const {data:ack,error:ackError}=await db.rpc("finish_provider_event_email",{
      p_id:job.id,p_lease_id:job.lease_id,p_state:state,
      p_resend_id:messageId,p_error:reason||null});
    if(ackError||ack!==true)throw Error("Queue acknowledgement failed");
    await new Promise(resolve=>setTimeout(resolve,650));
  }
  return reply({ok:true,processed:(jobs||[]).length,sent,failed,skipped});
 }catch(e){console.error("Provider email worker failed",e instanceof Error?e.message:"Unknown");
  return reply({error:"Temporary email queue problem"},500);}
});
