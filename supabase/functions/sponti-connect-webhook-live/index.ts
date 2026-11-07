import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import {createClient} from "npm:@supabase/supabase-js@2.117.2";
Deno.serve(async request=>{
 if(request.method!=="POST")return new Response("Method not allowed",{status:405});
 const key=Deno.env.get("STRIPE_CONNECT_LIVE_SECRET_KEY")||"";
 const hookSecret=Deno.env.get("STRIPE_CONNECT_LIVE_WEBHOOK_SECRET")||"";
 if(Deno.env.get("SPONTI_CONNECT_LIVE_ENABLED")!=="true"||!key.startsWith("sk_live_")||!hookSecret.startsWith("whsec_"))
   return new Response("Not configured",{status:503});
 const signature=request.headers.get("stripe-signature");
 if(!signature)return new Response("Missing signature",{status:400});
 const stripe=new Stripe(key,{apiVersion:"2024-11-20"});
 let event:Stripe.Event;
 try{event=await stripe.webhooks.constructEventAsync(await request.text(),signature,hookSecret,undefined,Stripe.createSubtleCryptoProvider());}
 catch{return new Response("Invalid signature",{status:400});}
 if(event.livemode!==true||event.type!=="account.updated")return new Response("ok",{status:200});
 const id=(event.data.object as Stripe.Account).id;
 if(!/^acct_[A-Za-z0-9]+$/.test(id||""))return new Response("Invalid account",{status:400});
 try{
  // Re-read current Stripe state instead of trusting an old/out-of-order event snapshot.
  const account=await stripe.accounts.retrieve(id);
  const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error}=await db.schema("private").from("sponti_connect_live_accounts").update({
   details_submitted:!!account.details_submitted,
   transfers_enabled:account.capabilities?.transfers==="active",
   payouts_enabled:!!account.payouts_enabled,
   requirements_due_count:(account.requirements?.currently_due||[]).length,
   requirements_past_due_count:(account.requirements?.past_due||[]).length,
   disabled_reason:account.requirements?.disabled_reason||null,
   checked_at:new Date().toISOString()
  }).eq("stripe_account_id",id);
  if(error)throw Error("Database status update failed");
  return new Response("ok",{status:200});
 }catch(e){console.error("Connect webhook refresh failed",e instanceof Error?e.message:"unknown");return new Response("retry",{status:500});}
});