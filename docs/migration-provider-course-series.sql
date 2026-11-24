-- Wiederkehrende Kurse: jeder Termin ist ein eigener Kurs, verknüpft über series_id.
alter table public.provider_courses add column if not exists series_id uuid;
create index if not exists provider_courses_series_id_idx on public.provider_courses(series_id) where series_id is not null;

-- Wird im CRM bei einem Termin ein Zahlungslink hinterlegt, erhalten alle
-- anderen Termine derselben Serie ohne eigenen Link denselben Link.
-- (Stripe ordnet die Buchung über client_reference_id = Kurs-ID dem Termin zu.)
create or replace function private.share_series_payment_link()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_series uuid;
begin
  if pg_trigger_depth() > 1 then return new; end if;
  if coalesce(new.payment_link,'') = '' or new.payment_link is not distinct from old.payment_link then
    return new;
  end if;
  select series_id into v_series from public.provider_courses where id = new.id;
  if v_series is null then return new; end if;
  update public.courses c set payment_link = new.payment_link
  from public.provider_courses pc
  where pc.series_id = v_series and c.id = pc.id and c.id <> new.id
    and coalesce(c.payment_link,'') = '';
  return new;
end $$;

drop trigger if exists share_series_payment_link on public.courses;
create trigger share_series_payment_link after update of payment_link on public.courses
for each row execute function private.share_series_payment_link();

-- Neue Termine einer Serie übernehmen einen bereits vorhandenen Zahlungslink.
create or replace function private.inherit_series_payment_link()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_link text;
begin
  if new.series_id is null then return new; end if;
  select c.payment_link into v_link
  from public.provider_courses pc join public.courses c on c.id = pc.id
  where pc.series_id = new.series_id and pc.id <> new.id and coalesce(c.payment_link,'') <> ''
  limit 1;
  if v_link is not null then
    update public.courses set payment_link = v_link where id = new.id and coalesce(payment_link,'') = '';
  end if;
  return new;
end $$;

drop trigger if exists zz_inherit_series_payment_link on public.provider_courses;
create trigger zz_inherit_series_payment_link after insert on public.provider_courses
for each row execute function private.inherit_series_payment_link();
