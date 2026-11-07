import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.117.2";
const origins=new Set(["https://www.sponti-switzerland.ch","https://sponti-switzerland.ch","https://ehifskiigrfpxeiruyxr.supabase.co"]);
const reply=(data:unknown,status=200,origin="")=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":origins.has(origin)?origin:"https://www.sponti-switzerland.ch","Vary":"Origin","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"}});
Deno.serve(async(req)=>{
 const origin=req.headers.get("origin")||"";
 if(req.method==="OPTIONS") return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":origins.has(origin)?origin:"https://www.sponti-switzerland.ch","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"}});
 if(req.method!=="POST")return reply({error:"Method not allowed"},405,origin);
 if(origin&&!origins.has(origin))return reply({error:"Forbidden origin"},403,origin);
 const secret=Deno.env.get("STRIPE_SECRET_KEY");
 if(Deno.env.get("SPONTI_STRIPE_CHECKOUT_ENABLED")!=="true"||!secret||!(secret.startsWith("sk_test_")||secret.startsWith("rk_test_")))return reply({error:"Stripe-Testcheckout ist noch nicht freigeschaltet"},503,origin);
 const bearer=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
 if(!bearer)return reply({error:"Testcheckout nur für berechtigte Sponti-Mitarbeitende."},401,origin);
 const supabaseAdmin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:identityError}=await supabaseAdmin.auth.getUser(bearer);
 if(identityError||!identity.user)return reply({error:"Anmeldung erforderlich"},401,origin);
 const {data:employee,error:employeeError}=await supabaseAdmin.from("crm_employees").select("active").eq("user_id",identity.user.id).eq("active",true).maybeSingle();
 if(employeeError||!employee)return reply({error:"Testcheckout nur für aktive Sponti-Mitarbeitende"},403,origin);
 const body=await req.json().catch(()=>null);
 if(!body||typeof body.course_id!=="string"||!/^[0-9a-f-]{36}$/i.test(body.course_id)||!Number.isInteger(body.quantity)||typeof body.guest_name!=="string"||typeof body.guest_email!=="string")return reply({error:"Ungültige Buchungsdaten"},400,origin);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
 const {data:reserved,error:reserveError}=await db.rpc("sponti_reserve_paid_checkout",{p_course_id:body.course_id,p_quantity:body.quantity,p_guest_name:body.guest_name,p_guest_email:body.guest_email,p_guest_phone:typeof body.guest_phone==="string"?body.guest_phone:""});
 if(reserveError||!reserved?.length)return reply({error:reserveError?.message||"Plätze konnten nicht reserviert werden"},409,origin);
 const b=reserved[0];
 const {data:course,error:lookupError}=await db.from("courses").select("provider_id").eq("id",body.course_id).maybeSingle();
 if(lookupError||!course){await db.rpc("sponti_abort_unattached_checkout",{p_booking_id:b.booking_id});return reply({error:"Kursdaten konnten nicht geprüft werden."},503,origin);}
 const params=new URLSearchParams();
 params.set("mode","payment");
 params.set("customer_email",body.guest_email.trim());
 params.set("line_items[0][price_data][currency]","chf");
 params.set("line_items[0][price_data][unit_amount]",String(b.unit_amount_rappen));
 params.set("line_items[0][price_data][product_data][name]",String(b.course_title).slice(0,200));
 params.set("line_items[0][quantity]",String(body.quantity));
 params.set("client_reference_id",b.booking_id);
 params.set("metadata[sponti_booking_id]",b.booking_id);
 params.set("metadata[sponti_course_id]",body.course_id);
 params.set("payment_intent_data[metadata][sponti_booking_id]",b.booking_id);
 params.set("payment_intent_data[metadata][sponti_course_id]",body.course_id);
 params.set("payment_intent_data[metadata][sponti_commission_percent]","13");
 params.set("payment_intent_data[transfer_group]","sponti_"+b.booking_id.replace(/-/g,""));
 if(course.provider_id){params.set("metadata[sponti_provider_id]",course.provider_id);
 params.set("payment_intent_data[metadata][sponti_provider_id]",course.provider_id);}
 params.set("success_url",body.course_id==="f909245b-bc29-49e1-838b-ca6c7bfd8b71"?"https://www.sponti-switzerland.ch/stripe-test.html?checkout=success":"https://www.sponti-switzerland.ch/?checkout=success&session_id={CHECKOUT_SESSION_ID}");
 params.set("cancel_url",body.course_id==="f909245b-bc29-49e1-838b-ca6c7bfd8b71"?"https://www.sponti-switzerland.ch/stripe-test.html?checkout=cancelled":"https://www.sponti-switzerland.ch/?checkout=cancelled");
 params.set("expires_at",String(Math.floor(Date.now()/1000)+1800));
 let session:any;
 try {
  const r=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{"Authorization":"Bearer "+secret,"Content-Type":"application/x-www-form-urlencoded","Idempotency-Key":"sponti-"+b.booking_id},body:params.toString(),signal:AbortSignal.timeout(15000)});
  session=await r.json();
  if(!r.ok||!session?.id||!session?.url){
   if(!r.ok){console.error("Stripe checkout rejection",JSON.stringify({status:r.status,type:session?.error?.type||null,code:session?.error?.code||null,param:session?.error?.param||null,message:String(session?.error?.message||"").slice(0,240)}));await db.rpc("sponti_abort_unattached_checkout",{p_booking_id:b.booking_id});}
   throw new Error("Stripe checkout unavailable");
  }
 }catch(e){console.error("Stripe session creation issue",e instanceof Error?e.message:"unknown");return reply({error:"Stripe-Zahlungsseite konnte nicht erstellt werden. Bitte später erneut versuchen."},503,origin);}
 const {data:attached,error:attachError}=await db.rpc("sponti_attach_checkout_session",{p_booking_id:b.booking_id,p_session_id:session.id});
 if(attachError||!attached){
  try{
   const expired=await fetch("https://api.stripe.com/v1/checkout/sessions/"+encodeURIComponent(session.id)+"/expire",{method:"POST",headers:{"Authorization":"Bearer "+secret},signal:AbortSignal.timeout(10000)});
   if(expired.ok)await db.rpc("sponti_abort_unattached_checkout",{p_booking_id:b.booking_id});
  }catch(e){console.error("Could not expire unattached session",e instanceof Error?e.message:"unknown");}
  return reply({error:"Checkout konnte nicht zugeordnet werden"},503,origin);
 }
 return reply({checkout_url:session.url,booking_id:b.booking_id},200,origin);
});