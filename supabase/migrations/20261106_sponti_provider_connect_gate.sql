-- Sponti: fail-closed provider creation gates. Does not enable Stripe payments/transfers.
create table if not exists private.sponti_connect_live_accounts (
 provider_id uuid primary key references public."Kursanbieter"(id) on delete restrict,
 user_id uuid not null unique references auth.users(id) on delete restrict,
 stripe_account_id text not null unique check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
 details_submitted boolean not null default false,
 transfers_enabled boolean not null default false,
 payouts_enabled boolean not null default false,
 requirements_due_count integer not null default 1 check (requirements_due_count >= 0),
 requirements_past_due_count integer not null default 0 check (requirements_past_due_count >= 0),
 disabled_reason text,
 checked_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table private.sponti_connect_live_accounts enable row level security;
revoke all on private.sponti_connect_live_accounts from public, anon, authenticated;

create or replace function private.sponti_provider_live_ready(p_provider_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select p_provider_id is not null and exists (
   select 1 from private.sponti_connect_live_accounts l
   join private.provider_accounts a on a.provider_id=l.provider_id and a.user_id=l.user_id
   join public."Kursanbieter" p on p.id=l.provider_id
   where l.provider_id=p_provider_id
     and p.crm_status='Partner' and p.archived_at is null
     and l.details_submitted and l.transfers_enabled and l.payouts_enabled
     and l.requirements_due_count=0 and l.requirements_past_due_count=0
     and l.disabled_reason is null
     and l.checked_at > now() - interval '24 hours'
 );
$$;
create or replace function private.sponti_provider_can_create()
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null
 and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 and exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null)
 and exists(select 1 from private.provider_accounts a where a.user_id=auth.uid()
 and private.sponti_provider_live_ready(a.provider_id));
$$;
revoke all on function private.sponti_provider_live_ready(uuid) from public, anon;
revoke all on function private.sponti_provider_can_create() from public, anon;
grant execute on function private.sponti_provider_live_ready(uuid) to authenticated;
grant execute on function private.sponti_provider_can_create() to authenticated;

create or replace function public.provider_course_readiness()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_provider uuid; v_status text; v_archived boolean;
 v_linked boolean := false; v_ready boolean := false;
begin
 if v_user is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 then raise insufficient_privilege using message='Anmeldung erforderlich.'; end if;
 select a.provider_id,p.crm_status,(p.archived_at is not null) into v_provider,v_status,v_archived
 from private.provider_accounts a join public."Kursanbieter" p on p.id=a.provider_id
 where a.user_id=v_user;
 if v_provider is not null then
   select exists(select 1 from private.sponti_connect_live_accounts l
     where l.provider_id=v_provider and l.user_id=v_user) into v_linked;
   v_ready := private.sponti_provider_live_ready(v_provider);
 end if;
 return jsonb_build_object(
  'registered',v_provider is not null,
  'crm_approved',coalesce(v_status='Partner' and not v_archived,false),
  'stripe_live_connected',v_linked,
  'stripe_live_ready',v_ready,
  'can_create_courses',v_ready,
  'status',coalesce(v_status,'Nicht registriert'));
end;
$$;
revoke all on function public.provider_course_readiness() from public, anon;
grant execute on function public.provider_course_readiness() to authenticated;

-- Existing OR-combined ALL policies allowed bypass through authenticated requests.
drop policy if exists "Approved provider course access" on public.provider_courses;
drop policy if exists "Providers manage own courses" on public.provider_courses;
create policy "Provider read own courses" on public.provider_courses for select to authenticated
 using ((select auth.uid())=provider_id);
create policy "Provider insert after CRM and live Connect" on public.provider_courses for insert to authenticated
 with check ((select auth.uid())=provider_id and (select private.sponti_provider_can_create()));
create policy "Provider update own courses after Connect" on public.provider_courses for update to authenticated
 using ((select auth.uid())=provider_id)
 with check ((select auth.uid())=provider_id and (not active or (select private.sponti_provider_can_create())));
create policy "Provider delete own courses" on public.provider_courses for delete to authenticated
 using ((select auth.uid())=provider_id);

-- Provider RPC is SECURITY DEFINER and bypasses RLS, so it needs the same guard.
do $guard$
declare v_before text; v_after text;
begin
 select pg_get_functiondef(p.oid) into v_before
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='private' and p.proname='provider_courses'
 and pg_get_function_identity_arguments(p.oid)='course jsonb';
 if v_before is null or position(' if course is not null then' in v_before)=0
 then raise exception 'Could not safely locate provider_courses mutation path'; end if;
 v_after := replace(v_before,
 ' if course is not null then',
 ' if course is not null then
   if not private.sponti_provider_can_create()
     and not coalesce((course->>''archive'')::boolean,false)
   then raise insufficient_privilege using message=''Kursanlage und Änderungen sind erst nach CRM-Freigabe und verifiziertem Stripe Connect möglich.''; end if;');
 execute v_after;
end $guard$;
