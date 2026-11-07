-- Ensure mirrored provider courses preserve the canonical CRM provider ID.
create or replace function private.sync_provider_course_to_public()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_category text; v_provider_id uuid; v_publish boolean;
begin
 if tg_op='DELETE' then
   update public.courses set status='draft',archived_at=coalesce(archived_at,now()) where id=old.id;
   return old;
 end if;
 select provider_id into v_provider_id from private.provider_accounts where user_id=new.provider_id;
 v_category:=case lower(trim(new.category))
   when 'yoga & wellness' then 'yoga-wellness'
   when 'kochen & geniessen' then 'kochen-geniessen'
   when 'kochen & genießen' then 'kochen-geniessen'
   when 'kunst & handwerk' then 'kunst-handwerk'
   when 'fotografie & design' then 'fotografie-design'
   when 'tanz & bewegung' then 'tanz-bewegung'
   when 'natur & draussen' then 'natur-draussen'
   when 'natur & draußen' then 'natur-draussen'
   else null end;
 v_publish := new.active and v_category is not null and
   private.sponti_provider_live_ready(v_provider_id);
 insert into public.courses(id,provider_id,title,description,category,region,venue,starts_at,ends_at,price,seats,booking_url,status,archived_at)
 values(new.id,v_provider_id,new.title,coalesce(new.description,''),coalesce(v_category,'kunst-handwerk'),new.region,new.venue,
   new.starts_at,new.ends_at,new.price,new.seats,coalesce(new.booking_url,''),
   case when v_publish then 'published' else 'draft' end,null)
 on conflict(id) do update set
   provider_id=coalesce(public.courses.provider_id,excluded.provider_id),
   title=excluded.title,description=excluded.description,category=excluded.category,
   region=excluded.region,venue=excluded.venue,starts_at=excluded.starts_at,ends_at=excluded.ends_at,
   price=excluded.price,seats=excluded.seats,booking_url=excluded.booking_url,
   status=excluded.status,archived_at=null
 where public.courses.provider_id is null or public.courses.provider_id=excluded.provider_id;
 return new;
end; $$;
-- Only backfill draft mirrors. Do not publish or change any booking amounts.
update public.courses c set provider_id=a.provider_id
from public.provider_courses pc join private.provider_accounts a on a.user_id=pc.provider_id
where c.id=pc.id and c.status='draft' and c.provider_id is null;
