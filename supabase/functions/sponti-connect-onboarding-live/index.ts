import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
// Sponti Connect Express. Live mode remains disabled until explicit production configuration.
const origins = new Set(["https://sponti-switzerland.ch","https://www.sponti-switzerland.ch"]);
const base = "https://www.sponti-switzerland.ch/anbieter";
const json = (body:unknown,status=200,origin="")=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store","vary":"Origin","access-control-allow-origin":origins.has(origin)?origin:"https://www.sponti-switzerland.ch","access-control-allow-methods":"POST,OPTIONS","access-control-allow-headers":"authorization,apikey,content-type"}});
async function stripe(path:string,key:string,body?:URLSearchParams,idem?:string){
 const headers:Record<string,string>={"authorization":"Bearer "+key};
 if(body)headers["content-type"]="application/x-www-form-urlencoded";
 if(idem)headers["Idempotency-Key"]=idem;
 const r=await fetch("https://api.stripe.com/v1/"+path,{method:body?"POST":"GET",headers,body:body?.toString(),signal:AbortSignal.timeout(12000)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error("stripe:"+String(data?.error?.code||r.status));
 return data;
}
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":origins.has(origin)?origin:"https://www.sponti-switzerland.ch","access-control-allow-headers":"authorization,apikey,content-type","access-control-allow-methods":"POST,OPTIONS","vary":"Origin"}});
 if(req.method!=="POST")return json({error:"Method not allowed"},405,origin);
 if(origin&&!origins.has(origin))return json({error:"Forbidden origin"},403,origin);
 const jwt=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();
 if(!jwt)return json({error:"Anmeldung erforderlich"},401,origin);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await db.auth.getUser(jwt);
 if(authError||!user?.id||!user.email_confirmed_at)return json({error:"Bestätigte Anmeldung erforderlich"},401,origin);
 const request=await req.json().catch(()=>({}));
 if(request?.action!=="status"&&request?.action!=="onboard")return json({error:"Ungültige Aktion"},400,origin);
 const {data:account,error:providerError}=await db.schema("private").from("provider_accounts").select("provider_id").eq("user_id",user.id).maybeSingle();
 if(providerError||!account?.provider_id)return json({error:"Anbieterkonto fehlt"},403,origin);
 const {data:provider,error:crmError}=await db.from("Kursanbieter").select("id,crm_status,archived_at").eq("id",account.provider_id).maybeSingle();
 if(crmError||!provider)return json({error:"Anbieterstatus nicht verfügbar"},503,origin);
 const crmApproved=provider.crm_status==="Partner"&&!provider.archived_at;
 if(!crmApproved)return json({connected:false,ready:false,crm_approved:false,error:"Bitte zuerst von Sponti im CRM freischalten lassen."},request.action==="status"?200:403,origin);
 const key=Deno.env.get("STRIPE_CONNECT_LIVE_SECRET_KEY")||"";
 const liveEnabled=Deno.env.get("SPONTI_CONNECT_LIVE_ENABLED")==="true"&&key.startsWith("sk_live_");
 if(!liveEnabled)return json({connected:false,ready:false,crm_approved:true,live_enabled:false,
   error:"Stripe Connect Live-Onboarding ist noch nicht aktiviert."},request.action==="status"?200:503,origin);
 try{
  const {data:existing,error:lookupError}=await db.schema("private").from("sponti_connect_live_accounts").select("stripe_account_id").eq("provider_id",account.provider_id).eq("user_id",user.id).maybeSingle();
  if(lookupError)throw Error("mapping_lookup_failed");
  let stripeId=existing?.stripe_account_id;
  if(!stripeId&&request.action==="status")return json({connected:false,ready:false,crm_approved:true,live_enabled:true},200,origin);
  if(!stripeId){
   const params=new URLSearchParams({type:"express",country:"CH",email:user.email||""});
   params.set("capabilities[transfers][requested]","true");
   params.set("metadata[sponti_provider_id]",account.provider_id);
   const created=await stripe("accounts",key,params,"sponti-live-connect-"+account.provider_id);
   if(!/^acct_[A-Za-z0-9]+$/.test(created?.id||""))throw Error("invalid_account_id");
   const {error:saveError}=await db.schema("private").from("sponti_connect_live_accounts").insert({provider_id:account.provider_id,user_id:user.id,stripe_account_id:created.id});
   if(saveError){
    const {data:retry}=await db.schema("private").from("sponti_connect_live_accounts").select("stripe_account_id").eq("provider_id",account.provider_id).eq("user_id",user.id).maybeSingle();
    if(!retry?.stripe_account_id)throw Error("mapping_save_failed");
    stripeId=retry.stripe_account_id;
   }else stripeId=created.id;
  }
  const a=await stripe("accounts/"+encodeURIComponent(stripeId),key);
  const due=(a.requirements?.currently_due||[]).length;
  const past=(a.requirements?.past_due||[]).length;
  const status={details_submitted:!!a.details_submitted,transfers_enabled:a.capabilities?.transfers==="active",payouts_enabled:!!a.payouts_enabled,
    requirements_due_count:due,requirements_past_due_count:past,disabled_reason:a.requirements?.disabled_reason||null,checked_at:new Date().toISOString()};
  const {error:syncError}=await db.schema("private").from("sponti_connect_live_accounts").update(status).eq("provider_id",account.provider_id).eq("user_id",user.id).eq("stripe_account_id",stripeId);
  if(syncError)throw Error("status_update_failed");
  const ready=status.details_submitted&&status.transfers_enabled&&status.payouts_enabled&&due===0&&past===0&&!status.disabled_reason;
  if(request.action==="status")return json({crm_approved:true,live_enabled:true,connected:true,ready,details_submitted:status.details_submitted,
    transfers_enabled:status.transfers_enabled,payouts_enabled:status.payouts_enabled,requirements_due:due,requirements_past_due:past},200,origin);
  const params=new URLSearchParams({account:stripeId,type:"account_onboarding",return_url:base+"?stripe_connect=returned",refresh_url:base+"?stripe_connect=retry"});
  const link=await stripe("account_links",key,params);
  if(!link.url||!link.url.startsWith("https://connect.stripe.com/"))throw Error("invalid_onboarding_url");
  return json({onboarding_url:link.url,crm_approved:true,connected:true,ready},200,origin);
 }catch(e){console.error("Connect live handler",e instanceof Error?e.message:"unknown");return json({error:"Stripe Connect derzeit nicht verfügbar. Bitte später erneut versuchen."},503,origin)}
});
