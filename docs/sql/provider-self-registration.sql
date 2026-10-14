begin;
-- Preserve previously provisioned accounts which predate the CRM mapping.
create table private.provider_legacy_access(user_id uuid primary key references auth.users(id) on delete cascade);
alter table private.provider_legacy_access enable row level security;
insert into private.provider_legacy_access select p.user_id from public.provider_profiles p where not exists(select 1 from private.provider_accounts a where a.user_id=p.user_id);
revoke all on private.provider_legacy_access from public,anon,authenticated;

create function private.provider_access_allowed() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null) and (
 exists(select 1 from private.provider_accounts a join public."Kursanbieter" k on k.id=a.provider_id where a.user_id=auth.uid() and k.crm_status='Partner' and k.archived_at is null)
 or exists(select 1 from private.provider_legacy_access l where l.user_id=auth.uid()));
$$;
revoke all on function private.provider_access_allowed() from public,anon;
grant execute on function private.provider_access_allowed() to authenticated;
create function private.provider_account_open() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null) and (
 exists(select 1 from private.provider_accounts a join public."Kursanbieter" k on k.id=a.provider_id where a.user_id=auth.uid() and k.archived_at is null and k.crm_status<>'Abgelehnt')
 or exists(select 1 from private.provider_legacy_access l where l.user_id=auth.uid()));
$$;
revoke all on function private.provider_account_open() from public,anon;
grant execute on function private.provider_account_open() to authenticated;
create policy "Approved provider access" on public.provider_profiles as restrictive for all to authenticated using ((select private.provider_account_open())) with check ((select private.provider_account_open()));
create policy "Approved provider course access" on public.provider_courses as restrictive for all to authenticated using ((select private.provider_account_open())) with check ((select private.provider_account_open()) and (not active or (select private.provider_access_allowed())));
create policy "Approved provider photo access" on public.provider_photos as restrictive for all to authenticated using ((select private.provider_account_open())) with check ((select private.provider_account_open()));
-- The public enquiry endpoint must never allow callers to approve themselves.
create policy "Enquiries cannot self approve" on public."Kursanbieter" as restrictive for insert to anon,authenticated with check ((select public.crm_is_employee()) or (crm_status='Neu' and archived_at is null));

create function private.capture_provider_signup() returns trigger language plpgsql security definer set search_path='' as $$
declare d jsonb; pid uuid;
begin
 d:=new.raw_user_meta_data->'provider_application';
 if d is null then return new; end if;
 if jsonb_typeof(d)<>'object' or new.email is null or
 coalesce(length(trim(d->>'company')),0) not between 1 and 200 or
 coalesce(length(trim(d->>'contact')),0) not between 1 and 200 or
 coalesce(length(trim(d->>'location')),0) not between 1 and 300 or
 length(coalesce(d->>'phone',''))>100 or length(coalesce(d->>'message',''))>5000 or
 coalesce(d->>'offer_type','') not in ('Einzelne Kurse','Mehrere Kurse','Beides') or
 coalesce(d->>'category','') not in ('Yoga & Wellness','Kochen & Genießen','Kunst & Handwerk','Fotografie & Design','Tanz & Bewegung','Natur & Draußen','Etwas anderes')
 then raise exception 'Ungültige Anbieter-Anfrage'; end if;
 -- User-editable metadata supplies application details only, never approval.
 insert into public."Kursanbieter"(company,contact,email,phone,location,category,offer_type,message,crm_status,crm_source)
 values(trim(d->>'company'),trim(d->>'contact'),new.email,coalesce(trim(d->>'phone'),''),trim(d->>'location'),d->>'category',d->>'offer_type',coalesce(d->>'message',''),'Neu','Website') returning id into pid;
 insert into private.provider_accounts(user_id,provider_id,description,public_location,public_enabled) values(new.id,pid,'',trim(d->>'location'),false);
 insert into public.provider_profiles(user_id,company,contact_name,phone,location,category)
 values(new.id,trim(d->>'company'),trim(d->>'contact'),coalesce(trim(d->>'phone'),''),trim(d->>'location'),d->>'category');
 return new;
end $$;
revoke all on function private.capture_provider_signup() from public,anon,authenticated;
create trigger capture_provider_signup after insert on auth.users for each row execute function private.capture_provider_signup();

create function private.provision_confirmed_provider() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.crm_status='Partner' and new.archived_at is null then
 insert into public.provider_profiles(user_id,company,contact_name,phone,location,website,category)
 select a.user_id,new.company,new.contact,coalesce(new.phone,''),coalesce(new.location,''),coalesce(new.website_url,''),new.category from private.provider_accounts a where a.provider_id=new.id
 on conflict(user_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function private.provision_confirmed_provider() from public,anon,authenticated;
create trigger provision_confirmed_provider after update of crm_status,archived_at on public."Kursanbieter" for each row execute function private.provision_confirmed_provider();

create function private.provider_registration_status() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 select jsonb_build_object('status',k.crm_status,'archived',k.archived_at is not null,'approved',k.crm_status='Partner' and k.archived_at is null) into result
 from private.provider_accounts a join public."Kursanbieter" k on k.id=a.provider_id where a.user_id=auth.uid();
 if result is null and exists(select 1 from private.provider_legacy_access where user_id=auth.uid()) then return jsonb_build_object('approved',true,'status','Partner','archived',false); end if;
 return result;
end $$;
revoke all on function private.provider_registration_status() from public,anon;
grant execute on function private.provider_registration_status() to authenticated;
create function public.provider_registration_status() returns jsonb language sql stable set search_path='' as $$select private.provider_registration_status()$$;
revoke all on function public.provider_registration_status() from public,anon;
grant execute on function public.provider_registration_status() to authenticated;

-- Public listings exclude accounts whose approval has been withdrawn.
create or replace function public.list_public_providers() returns table(provider_id uuid,company text,category text,location text,website text,description text,photos text[])
language sql stable security definer set search_path='' as $$
 select p.user_id,p.company,p.category,p.location,p.website,p.description,
 coalesce((select array_agg(ph.storage_path order by ph.created_at) from public.provider_photos ph where ph.provider_id=p.user_id),array[]::text[])
 from public.provider_profiles p where nullif(trim(p.company),'') is not null and (
 exists(select 1 from private.provider_accounts a join public."Kursanbieter" k on k.id=a.provider_id where a.user_id=p.user_id and k.crm_status='Partner' and k.archived_at is null)
 or exists(select 1 from private.provider_legacy_access l where l.user_id=p.user_id));
$$;
notify pgrst,'reload schema';
commit;
