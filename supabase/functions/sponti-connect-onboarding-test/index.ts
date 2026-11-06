import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.117.2";
const ORIGINS=new Set(["https://sponti-switzerland.ch","https://www.sponti-switzerland.ch"]);
const BASE="https://www.sponti-switzerland.ch/anbieter";
function respond(data:unknown,status=200,origin=""){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","access-control-allow-origin":ORIGINS.has(origin)?origin:"https://www.sponti-switzerland.ch","access-control-allow-headers":"authorization,apikey,content-type","access-control-allow-methods":"POST, OPTIONS","vary":"Origin","cache-control":"no-store"}})}
async function stripe(path:string,key:string,form?:URLSearchParams,idempotency?:string){
 const headers:Record<string,string>={"authorization":"Bearer "+key};
 if(form)headers["content-type"]="application/x-www-form-urlencoded";
 if(idempotency)headers["idempotency-key"]=idempotency;
 const response=await fetch("https://api.stripe.com/v1/"+path,{method:form?"POST":"GET",headers,body:form?.toString(),signal:AbortSignal.timeout(12000)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error("Stripe request failed: "+(data?.error?.code||response.status));
 return data;
}
Deno.serve(async request=>{
 const origin=request.headers.get("origin")||"";
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":ORIGINS.has(origin)?origin:"https://www.sponti-switzerland.ch","access-control-allow-headers":"authorization,apikey,content-type","access-control-allow-methods":"POST, OPTIONS"}});
 if(request.method!=="POST")return respond({error:"Method not allowed"},405,origin);
 if(origin&&!ORIGINS.has(origin))return respond({error:"Forbidden origin"},403,origin);
 const secret=Deno.env.get("STRIPE_SECRET_KEY")||"";
 if(!secret.startsWith("sk_test_"))return respond({error:"Stripe Connect ist derzeit nur im Testmodus verfügbar."},503,origin);
 const bearer=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();
 if(!bearer)return respond({error:"Anbieteranmeldung erforderlich"},401,origin);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:userError}=await db.auth.getUser(bearer);
 if(userError||!user)return respond({error:"Anmeldung ungültig"},401,origin);
 const {data:provider,error:providerError}=await db.schema("private").from("provider_accounts").select("provider_id").eq("user_id",user.id).maybeSingle();
 if(providerError||!provider)return respond({error:"Kein verifiziertes Sponti-Anbieterkonto gefunden"},403,origin);
 const {data:crm,error:crmError}=await db.from("Kursanbieter").select("crm_status,archived_at").eq("id",provider.provider_id).maybeSingle();
 if(crmError||!crm||crm.crm_status!=="Partner"||crm.archived_at)
   return respond({error:"Bitte zuerst die Freischaltung durch Sponti im CRM abwarten."},403,origin);
 const body=await request.json().catch(()=>({}));
 if(body?.action!=="status"&&body?.action!=="onboard")return respond({error:"Ungültige Aktion"},400,origin);
 const {data:existing,error:mappingError}=await db.schema("private").from("sponti_connect_accounts").select("stripe_account_id").eq("provider_id",provider.provider_id).eq("user_id",user.id).maybeSingle();
 if(mappingError)return respond({error:"Verbindung derzeit nicht verfügbar"},503,origin);
 try{
 let accountId=existing?.stripe_account_id;
 if(!accountId && body.action==="status")return respond({connected:false,onboarding_complete:false,transfers_enabled:false,mode:"test"},200,origin);
 if(!accountId){
  const f=new URLSearchParams({type:"express",country:"CH",email:user.email||""});
  f.set("capabilities[transfers][requested]","true");
  const a=await stripe("accounts",secret,f,"sponti-connect-sandbox-"+provider.provider_id);
  if(!a.id||!/^acct_[A-Za-z0-9]+$/.test(a.id))throw new Error("Stripe did not return account");
  const {error:saveError}=await db.schema("private").from("sponti_connect_accounts").insert({provider_id:provider.provider_id,user_id:user.id,stripe_account_id:a.id});
  if(saveError){
   const {data:again}=await db.schema("private").from("sponti_connect_accounts").select("stripe_account_id").eq("provider_id",provider.provider_id).eq("user_id",user.id).maybeSingle();
   if(!again?.stripe_account_id)throw new Error("Could not store account mapping");
   accountId=again.stripe_account_id;
  }else accountId=a.id;
 }
 const a=await stripe("accounts/"+encodeURIComponent(accountId),secret);
 const onboardingComplete=!!a.details_submitted;
 const transfersEnabled=a.capabilities?.transfers==="active";
 if(body.action==="status")return respond({connected:true,onboarding_complete:onboardingComplete,transfers_enabled:transfersEnabled,requirements_due:(a.requirements?.currently_due||[]).length,mode:"test"},200,origin);
 const f=new URLSearchParams({account:accountId,type:"account_onboarding",return_url:BASE+"?stripe_connect=returned",refresh_url:BASE+"?stripe_connect=retry"});
 const link=await stripe("account_links",secret,f);
 if(!link.url||!link.url.startsWith("https://connect.stripe.com/"))throw new Error("Unexpected onboarding URL");
 return respond({onboarding_url:link.url,mode:"test"},200,origin);
 }catch(err){console.error("Connect sandbox action failed",err instanceof Error?err.message:"unknown");return respond({error:"Stripe Connect ist derzeit nicht verfügbar. Bitte später erneut versuchen."},503,origin)}
});
