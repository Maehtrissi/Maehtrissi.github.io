import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.117.2";
// Version 9 (Warteliste): optionales Feld waitlist_token löst einen reservierten Platz ein.
const allowed=new Set(["https://sponti-switzerland.ch","https://www.sponti-switzerland.ch"]);
const json=(data:unknown,status=200,origin="")=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store","access-control-allow-origin":allowed.has(origin)?origin:"https://www.sponti-switzerland.ch","vary":"Origin","access-control-allow-headers":"content-type,apikey,authorization","access-control-allow-methods":"POST,OPTIONS"}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":allowed.has(origin)?origin:"https://www.sponti-switzerland.ch","access-control-allow-methods":"POST,OPTIONS","access-control-allow-headers":"content-type,apikey,authorization"}});
 if(req.method!=="POST")return json({error:"Method not allowed"},405,origin);
 if(!allowed.has(origin))return json({error:"Forbidden origin"},403,origin);
 const secret=Deno.env.get("STRIPE_SECRET_KEY")||"";
 if(Deno.env.get("SPONTI_PUBLIC_CHECKOUT_ENABLED")!=="true"||!secret.startsWith("sk_test_"))return json({error:"Öffentliche Testzahlungen sind noch nicht freigeschaltet."},503,origin);
 const captchaSecret=Deno.env.get("TURNSTILE_SECRET_KEY");
 if(!captchaSecret)return json({error:"Buchungsschutz noch nicht konfiguriert."},503,origin);
 if(Number(req.headers.get("content-length")||"0")>4096)return json({error:"Request too large"},413,origin);
 let body:any;try{body=await req.json()}catch{return json({error:"Ungültige Anfrage"},400,origin)}
 if(!body||!uuid.test(body.course_id)||!Number.isInteger(body.quantity)||body.quantity<1||body.quantity>10||body.accept_terms!==true||typeof body.guest_name!=="string"||typeof body.guest_email!=="string"||typeof body.guest_phone!=="string"||typeof body.turnstile_token!=="string")return json({error:"Bitte alle Buchungsangaben und die AGB prüfen."},400,origin);
 if(body.guest_name.length>200||body.guest_email.length>254||body.guest_phone.length>32||body.turnstile_token.length>2048)return json({error:"Ungültige Eingabe"},400,origin);
 if(body.waitlist_token!==undefined&&body.waitlist_token!==null&&(typeof body.waitlist_token!=="string"||!uuid.test(body.waitlist_token)))return json({error:"Ungültiger Reservierungslink."},400,origin);
 const waitlistToken:string|null=typeof body.waitlist_token==="string"?body.waitlist_token:null;
 const verify=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({secret:captchaSecret,response:body.turnstile_token}),signal:AbortSignal.timeout(8000)}).then(r=>r.json()).catch(()=>null);
 if(!verify?.success||!allowed.has("https://"+verify.hostname)||verify.action!=="sponti_checkout")return json({error:"Sicherheitsprüfung fehlgeschlagen. Bitte erneut versuchen."},403,origin);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
 // Aufteilung bei der Zahlung: der Anbieter braucht ein verbundenes Stripe-Konto, das Zahlungen empfangen darf.
 const unavailable=()=>json({error:"Für diesen Kurs ist die Online-Zahlung noch nicht freigeschaltet."},409,origin);
 const {data:connectId}=await db.rpc("sponti_checkout_connect_account",{p_course_id:body.course_id});
 const account={stripe_account_id:typeof connectId==="string"&&/^acct_[A-Za-z0-9]+$/.test(connectId)?connectId:""};
 if(!account.stripe_account_id)return unavailable();
 const acct=await fetch("https://api.stripe.com/v1/accounts/"+encodeURIComponent(account.stripe_account_id),{headers:{authorization:"Bearer "+secret},signal:AbortSignal.timeout(10000)}).then(r=>r.ok?r.json():null).catch(()=>null);
 if(!acct||acct.capabilities?.transfers!=="active"||!acct.payouts_enabled)return unavailable();
 const reserveArgs:Record<string,unknown>={p_course_id:body.course_id,p_quantity:body.quantity,p_guest_name:body.guest_name,p_guest_email:body.guest_email,p_guest_phone:body.guest_phone};
 if(waitlistToken)reserveArgs.p_waitlist_token=waitlistToken;
 const {data:reserved,error:reserveError}=await db.rpc("sponti_reserve_paid_checkout",reserveArgs);
 if(reserveError||!reserved?.length){
  const expired=waitlistToken&&/reservierte Platz|höchstens/.test(reserveError?.message||"");
  return json({error:expired?reserveError!.message:"Der Kurs ist nicht mehr verfügbar oder die Buchung konnte nicht reserviert werden."},409,origin);
 }
 const b=reserved[0];
 // Gebühr pro Buchung: 20 % bei Preis pro Platz unter CHF 20.00, sonst 15 %, in Rappen gerundet wie in der Datenbank.
 const percent=b.unit_amount_rappen<2000?20:15;
 const fee=Math.floor((b.total_amount_rappen*percent+50)/100);
 if(!(fee>0&&fee<b.total_amount_rappen)){await db.rpc("sponti_abort_unattached_checkout",{p_booking_id:b.booking_id});return json({error:"Checkout konnte nicht sicher vorbereitet werden."},503,origin)}
 const {data:marked,error:markError}=await db.rpc("sponti_mark_checkout_split",{p_booking_id:b.booking_id});
 if(markError||marked!==true){await db.rpc("sponti_abort_unattached_checkout",{p_booking_id:b.booking_id});return json({error:"Checkout konnte nicht sicher vorbereitet werden."},503,origin)}
 const {data:cancelToken,error:cancelError}=await db.rpc("sponti_issue_checkout_cancel_token",{p_booking_id:b.booking_id});
 if(cancelError||typeof cancelToken!=="string"){
  await db.rpc("sponti_abort_unattached_checkout",{p_booking_id:b.booking_id});
  return json({error:"Checkout konnte nicht sicher vorbereitet werden."},503,origin);
 }
 const params=new URLSearchParams();
 params.set("mode","payment");params.set("customer_email",body.guest_email.trim());
 params.set("line_items[0][price_data][currency]","chf");params.set("line_items[0][price_data][unit_amount]",String(b.unit_amount_rappen));params.set("line_items[0][price_data][product_data][name]",String(b.course_title).slice(0,200));params.set("line_items[0][quantity]",String(body.quantity));
 params.set("client_reference_id",b.booking_id);params.set("metadata[sponti_booking_id]",b.booking_id);params.set("metadata[sponti_course_id]",body.course_id);params.set("payment_intent_data[metadata][sponti_booking_id]",b.booking_id);params.set("payment_intent_data[metadata][sponti_commission_percent]",String(percent));
 params.set("payment_intent_data[application_fee_amount]",String(fee));params.set("payment_intent_data[transfer_data][destination]",account.stripe_account_id);
 params.set("success_url","https://www.sponti-switzerland.ch/buchung-erfolgreich.html?session_id={CHECKOUT_SESSION_ID}");
 params.set("cancel_url","https://www.sponti-switzerland.ch/buchung.html?id="+encodeURIComponent(body.course_id)+"&checkout=cancelled&booking_id="+encodeURIComponent(b.booking_id)+"&cancel_token="+encodeURIComponent(cancelToken));
 params.set("expires_at",String(Math.floor(Date.now()/1000)+1800));
 let session:any;
 try{const response=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{"authorization":"Bearer "+secret,"content-type":"application/x-www-form-urlencoded","idempotency-key":"sponti-public-"+b.booking_id},body:params.toString(),signal:AbortSignal.timeout(15000)});session=await response.json();if(!response.ok||!session?.id||!session?.url)throw Error("Stripe unavailable");}
 catch{await db.rpc("sponti_abort_unattached_checkout",{p_booking_id:b.booking_id});return json({error:"Zahlungsseite konnte nicht erstellt werden."},503,origin)}
 const {data:attached,error:attachError}=await db.rpc("sponti_attach_checkout_session",{p_booking_id:b.booking_id,p_session_id:session.id});
 if(attachError||!attached){try{const r=await fetch("https://api.stripe.com/v1/checkout/sessions/"+encodeURIComponent(session.id)+"/expire",{method:"POST",headers:{"authorization":"Bearer "+secret},signal:AbortSignal.timeout(10000)});if(r.ok)await db.rpc("sponti_abort_unattached_checkout",{p_booking_id:b.booking_id})}catch{}return json({error:"Checkout konnte nicht zugeordnet werden."},503,origin)}
 return json({checkout_url:session.url,booking_id:b.booking_id,cancel_token:cancelToken,course_id:body.course_id},200,origin);
});
