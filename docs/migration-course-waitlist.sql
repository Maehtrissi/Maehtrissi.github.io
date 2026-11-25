-- Sponti: Platzanfrage / Warteliste für ausgebuchte Kurse (25. November 2026)
--
-- Ablauf:
--  * Ist ein Kurs ausgebucht, können Kunden bis zum Buchungsschluss (2 h vor Beginn)
--    unverbindlich einen Platz anfragen (public.sponti_join_waitlist).
--  * Wird ein Platz frei (Stornierung, Rückerstattung, abgebrochene Zahlung, Anbieter
--    erhöht Plätze), bekommt die erste passende Anfrage automatisch ein Angebot:
--    die Plätze werden reserviert (12 h, höchstens bis Buchungsschluss) und eine
--    E-Mail mit persönlichem Buchungslink geht raus.
--  * Nicht genutzte Angebote laufen ab (Cron alle 5 Minuten), dann ist der Nächste dran.
--
-- Zusätzlich behoben: private.customer_email_outbox liess die Kunden-E-Mail-Arten
-- reminder_12h / booking_cancelled und den Status 'sending' nicht zu, und booking_id
-- zeigte auf die leere Tabelle public.bookings statt auf course_checkout_bookings.
-- Dadurch wären bestätigte Buchungen echter Kurse beim Einreihen der Erinnerungen
-- mit einem Fehler abgebrochen.

-- 1) E-Mail-Warteschlange korrigieren und erweitern -----------------------------
alter table private.customer_email_outbox drop constraint if exists customer_email_outbox_kind_check;
alter table private.customer_email_outbox add constraint customer_email_outbox_kind_check check (kind = any (array[
  'reminder_24h','reminder_12h','details_2h','review_request','booking_cancelled','course_cancelled',
  'refund_initiated','availability_alert','waitlist_joined','waitlist_offer']));
alter table private.customer_email_outbox drop constraint if exists customer_email_outbox_status_check;
alter table private.customer_email_outbox add constraint customer_email_outbox_status_check check (status = any (array[
  'pending','processing','sending','sent','failed','cancelled']));
alter table private.customer_email_outbox drop constraint if exists customer_email_outbox_booking_id_fkey;
alter table private.customer_email_outbox add constraint customer_email_outbox_booking_id_fkey
  foreign key (booking_id) references public.course_checkout_bookings(id) on delete cascade;
alter table private.customer_email_outbox add column if not exists waitlist_id uuid;

-- 2) Tabelle ------------------------------------------------------------------
create table if not exists public.course_waitlist(
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  guest_name text not null,
  guest_email text not null,
  guest_phone text not null default '',
  quantity integer not null check (quantity between 1 and 10),
  status text not null default 'waiting' check (status in ('waiting','offered','booked','expired','cancelled')),
  offer_token uuid unique,
  offered_at timestamptz,
  offer_expires_at timestamptz,
  held_quantity integer not null default 0 check (held_quantity >= 0),
  leave_token uuid not null default gen_random_uuid() unique,
  booking_id uuid references public.course_checkout_bookings(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default now()
);
comment on table public.course_waitlist is 'Platzanfragen (Warteliste) für ausgebuchte Kurse. offered = Plätze sind reserviert (held_quantity bereits von courses.seats abgezogen).';
create unique index if not exists course_waitlist_active_email on public.course_waitlist(course_id, lower(guest_email)) where status in ('waiting','offered');
create index if not exists course_waitlist_queue on public.course_waitlist(course_id, created_at) where status = 'waiting';
create index if not exists course_waitlist_offers on public.course_waitlist(offer_expires_at) where status = 'offered';
alter table public.course_waitlist enable row level security;
revoke all on public.course_waitlist from anon, authenticated;
grant select on public.course_waitlist to authenticated;
drop policy if exists course_waitlist_crm_read on public.course_waitlist;
create policy course_waitlist_crm_read on public.course_waitlist for select to authenticated using (public.crm_is_employee());

-- 3) Nächste Anfrage(n) bedienen -----------------------------------------------
create or replace function private.sponti_waitlist_offer_next(p_course_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare c record; w record; v_exp timestamptz; v_token uuid; n integer := 0;
begin
  select id, seats, status, archived_at, starts_at, booking_url into c
    from public.courses where id = p_course_id for update;
  if not found or c.status <> 'published' or c.archived_at is not null or coalesce(c.booking_url,'') <> '' then
    return 0;
  end if;
  v_exp := least(now() + interval '12 hours', c.starts_at - interval '2 hours');
  if v_exp < now() + interval '20 minutes' then return 0; end if;
  perform set_config('sponti.waitlist_busy', 'on', true);
  for w in select id, quantity, guest_email from public.course_waitlist
            where course_id = p_course_id and status = 'waiting'
            order by created_at, id for update skip locked loop
    exit when c.seats < 1;
    continue when w.quantity > c.seats;
    update public.courses set seats = seats - w.quantity where id = p_course_id;
    c.seats := c.seats - w.quantity;
    v_token := gen_random_uuid();
    update public.course_waitlist set status = 'offered', offer_token = v_token, offered_at = now(),
      offer_expires_at = v_exp, held_quantity = w.quantity, updated_at = now() where id = w.id;
    insert into private.customer_email_outbox(course_id, recipient_email, kind, event_key, scheduled_at, waitlist_id)
      values (p_course_id, lower(btrim(w.guest_email)), 'waitlist_offer', 'customer:waitlist_offer:' || w.id || ':' || v_token, now(), w.id)
      on conflict (event_key) do nothing;
    n := n + 1;
  end loop;
  perform set_config('sponti.waitlist_busy', 'off', true);
  return n;
end $$;

-- Freie Plätze (seats steigt) → Warteliste bedienen
create or replace function private.sponti_waitlist_on_seats()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('sponti.waitlist_busy', true), 'off') = 'on' then return null; end if;
  perform private.sponti_waitlist_offer_next(new.id);
  return null;
end $$;
drop trigger if exists sponti_waitlist_seats_released on public.courses;
create trigger sponti_waitlist_seats_released after update of seats on public.courses
  for each row when (new.seats > old.seats) execute function private.sponti_waitlist_on_seats();

-- Kurs abgesagt / deaktiviert → Warteliste schliessen, reservierte Plätze zurückgeben
create or replace function private.sponti_waitlist_on_course_closed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_held integer;
begin
  if (old.archived_at is null and new.archived_at is not null) or (old.status = 'published' and new.status <> 'published') then
    select coalesce(sum(held_quantity), 0) into v_held from public.course_waitlist
      where course_id = new.id and status = 'offered';
    update public.course_waitlist set status = 'cancelled', held_quantity = 0, updated_at = now()
      where course_id = new.id and status in ('waiting','offered');
    if v_held > 0 then
      perform set_config('sponti.waitlist_busy', 'on', true);
      update public.courses set seats = seats + v_held where id = new.id;
      perform set_config('sponti.waitlist_busy', 'off', true);
    end if;
  end if;
  return null;
end $$;
drop trigger if exists sponti_waitlist_course_closed on public.courses;
create trigger sponti_waitlist_course_closed after update of status, archived_at on public.courses
  for each row execute function private.sponti_waitlist_on_course_closed();

-- Abgelaufene Angebote freigeben (Cron)
create or replace function private.sponti_waitlist_expire()
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0;
begin
  for r in select id, course_id, held_quantity from public.course_waitlist
            where status = 'offered' and offer_expires_at <= now() for update skip locked loop
    update public.course_waitlist set status = 'expired', held_quantity = 0, updated_at = now() where id = r.id;
    if r.held_quantity > 0 then
      update public.courses set seats = seats + r.held_quantity where id = r.course_id; -- Trigger bietet dem Nächsten an
    end if;
    n := n + 1;
  end loop;
  update public.course_waitlist w set status = 'expired', updated_at = now()
    from public.courses c
   where c.id = w.course_id and w.status = 'waiting' and c.starts_at <= now() + interval '2 hours';
  return n;
end $$;

-- Reservierten Platz einlösen (innerhalb einer Buchungs-Transaktion)
create or replace function private.sponti_waitlist_claim(p_token uuid, p_course_id uuid, p_quantity integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare w record;
begin
  select id, held_quantity, status, offer_expires_at into w from public.course_waitlist
   where offer_token = p_token and course_id = p_course_id for update;
  if not found or w.status <> 'offered' or w.offer_expires_at <= now() then
    raise exception 'Dein reservierter Platz ist leider nicht mehr gültig.' using errcode = 'P0001';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > w.held_quantity then
    raise exception 'Du kannst höchstens % aus deiner Anfrage buchen.',
      case when w.held_quantity = 1 then '1 Platz' else w.held_quantity || ' Plätze' end using errcode = '22023';
  end if;
  perform set_config('sponti.waitlist_busy', 'on', true);
  update public.courses set seats = seats + w.held_quantity where id = p_course_id;
  update public.course_waitlist set status = 'booked', held_quantity = 0, updated_at = now() where id = w.id;
  return w.id;
end $$;

create or replace function private.sponti_waitlist_finish_claim(p_waitlist_id uuid, p_course_id uuid, p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('sponti.waitlist_busy', 'off', true);
  update public.course_waitlist set booking_id = p_booking_id, updated_at = now() where id = p_waitlist_id;
  perform private.sponti_waitlist_offer_next(p_course_id); -- nicht gebuchte Restplätze weitergeben
end $$;

-- 4) Öffentliche Funktionen -----------------------------------------------------
create or replace function public.sponti_join_waitlist(p_course_id uuid, p_name text, p_email text,
  p_phone text default '', p_quantity integer default 1, p_accept_terms boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c record; e text := lower(btrim(coalesce(p_email,''))); n text := btrim(coalesce(p_name,''));
  ph text := btrim(coalesce(p_phone,'')); v_id uuid; v_created timestamptz; v_pos integer; v_recent integer;
begin
  if p_accept_terms is distinct from true then
    raise exception 'Bitte bestätige die AGB und die Datenschutzerklärung.' using errcode = '22023';
  end if;
  if length(n) < 2 or length(n) > 200 or length(e) > 254 or e !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     or length(ph) > 32 or p_quantity is null or p_quantity not between 1 and 10 then
    raise exception 'Bitte prüfe Namen, E-Mail, Telefonnummer und Anzahl Personen.' using errcode = '22023';
  end if;
  select id, seats, status, archived_at, starts_at, booking_url into c from public.courses where id = p_course_id for update;
  if not found or c.status <> 'published' or c.archived_at is not null or coalesce(c.booking_url,'') <> ''
     or c.starts_at <= now() + interval '2 hours' then
    raise exception 'Für diesen Kurs ist keine Platzanfrage mehr möglich.' using errcode = 'P0001';
  end if;
  if c.seats >= p_quantity then
    raise exception 'Für diesen Kurs sind noch genügend Plätze frei. Du kannst direkt buchen.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.course_checkout_bookings b where b.course_id = p_course_id
              and lower(btrim(b.guest_email)) = e and b.booking_status in ('pending_payment','confirmed')) then
    raise exception 'Für diese E-Mail besteht bereits eine Buchung für diesen Kurs.' using errcode = '23505';
  end if;
  if exists (select 1 from public.course_waitlist w where w.course_id = p_course_id
              and lower(w.guest_email) = e and w.status in ('waiting','offered')) then
    raise exception 'Du hast für diesen Kurs bereits einen Platz angefragt.' using errcode = '23505';
  end if;
  select count(*) into v_recent from public.course_waitlist where lower(guest_email) = e and created_at > now() - interval '24 hours';
  if v_recent >= 5 then
    raise exception 'Zu viele Anfragen innerhalb von 24 Stunden. Bitte versuche es später erneut.' using errcode = 'P0001';
  end if;
  insert into public.course_waitlist(course_id, guest_name, guest_email, guest_phone, quantity)
    values (p_course_id, n, e, ph, p_quantity) returning id, created_at into v_id, v_created;
  select count(*) into v_pos from public.course_waitlist
   where course_id = p_course_id and status = 'waiting' and (created_at, id) <= (v_created, v_id);
  insert into private.customer_email_outbox(course_id, recipient_email, kind, event_key, scheduled_at, waitlist_id)
    values (p_course_id, e, 'waitlist_joined', 'customer:waitlist_joined:' || v_id, now(), v_id)
    on conflict (event_key) do nothing;
  return jsonb_build_object('ok', true, 'position', v_pos,
    'message', 'Deine Platzanfrage ist eingegangen. Sobald ein Platz frei wird, schicken wir dir eine E-Mail mit einem reservierten Buchungslink.');
end $$;

create or replace function public.sponti_waitlist_offer(p_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('course_id', w.course_id, 'quantity', w.held_quantity, 'expires_at', w.offer_expires_at,
    'name', w.guest_name, 'email', w.guest_email, 'phone', w.guest_phone,
    'valid', w.status = 'offered' and w.offer_expires_at > now())
  from public.course_waitlist w where w.offer_token = p_token;
$$;

create or replace function public.sponti_leave_waitlist(p_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare w record;
begin
  select id, course_id, status, held_quantity into w from public.course_waitlist
   where leave_token = p_token and status in ('waiting','offered') for update;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Diese Platzanfrage ist nicht mehr aktiv.');
  end if;
  update public.course_waitlist set status = 'cancelled', held_quantity = 0, updated_at = now() where id = w.id;
  if w.held_quantity > 0 then
    update public.courses set seats = seats + w.held_quantity where id = w.course_id; -- Nächster ist dran
  end if;
  return jsonb_build_object('ok', true, 'message', 'Deine Platzanfrage wurde gelöscht.');
end $$;

create or replace function public.provider_course_waitlist_counts()
returns table(course_id uuid, waiting integer, offered integer)
language sql stable security definer set search_path = '' as $$
  select w.course_id, (count(*) filter (where w.status = 'waiting'))::int,
         (count(*) filter (where w.status = 'offered'))::int
  from public.course_waitlist w join public.courses c on c.id = w.course_id
  where auth.uid() is not null and w.status in ('waiting','offered')
    and (exists (select 1 from public.provider_courses pc where pc.id = w.course_id and pc.provider_id = auth.uid())
         or c.provider_id = (select pa.provider_id from private.provider_accounts pa where pa.user_id = auth.uid() limit 1))
  group by w.course_id;
$$;

-- 5) Buchungswege mit reserviertem Platz ----------------------------------------
create or replace function public.sponti_reserve_paid_checkout(p_course_id uuid, p_quantity integer,
  p_guest_name text, p_guest_email text, p_guest_phone text, p_waitlist_token uuid)
returns table(booking_id uuid, course_title text, unit_amount_rappen integer, total_amount_rappen integer)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare v_w uuid; r record;
begin
  v_w := private.sponti_waitlist_claim(p_waitlist_token, p_course_id, p_quantity);
  select * into r from public.sponti_reserve_paid_checkout(p_course_id, p_quantity, p_guest_name, p_guest_email, p_guest_phone) x limit 1;
  perform private.sponti_waitlist_finish_claim(v_w, p_course_id, r.booking_id);
  return query select r.booking_id, r.course_title, r.unit_amount_rappen, r.total_amount_rappen;
end $$;

create or replace function public.book_free_course_with_terms(p_course_id uuid, p_name text, p_email text,
  p_phone text, p_quantity integer, p_accept_terms boolean, p_waitlist_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_w uuid; result jsonb;
begin
  if p_accept_terms is distinct from true then
    raise exception 'Bitte bestätige vor der Buchung die AGB und die angezeigten Kursbedingungen.' using errcode = '22023';
  end if;
  v_w := private.sponti_waitlist_claim(p_waitlist_token, p_course_id, p_quantity);
  result := public.book_free_course_with_terms(p_course_id, p_name, p_email, p_phone, p_quantity, p_accept_terms);
  perform private.sponti_waitlist_finish_claim(v_w, p_course_id, (result->>'booking_id')::uuid);
  return result;
end $$;

-- Zahlungslink-Kurse: reservierten Platz anhand der E-Mail einlösen
create or replace function public.sponti_record_payment_link_booking(p_session_id text, p_course_id uuid, p_quantity integer, p_amount_total bigint, p_currency text, p_name text, p_email text, p_phone text)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare c record; v_id uuid; v_note text:=''; v_name text; v_email text; w record; v_wait uuid;
begin
  if p_currency is distinct from 'chf' then raise exception 'Invalid currency'; end if;
  if exists(select 1 from private.payment_link_events where session_id=p_session_id) then
    return jsonb_build_object('status','duplicate');
  end if;
  v_email:=lower(btrim(coalesce(p_email,'')));
  v_name:=left(coalesce(nullif(btrim(coalesce(p_name,'')),''),v_email),200);
  if p_quantity is null or p_quantity<1 or p_quantity>10 or v_email='' or p_amount_total is null or p_amount_total<=0 then
    insert into private.payment_link_events(session_id,course_id,quantity,amount_rappen,status,note)
    values(p_session_id,p_course_id,p_quantity,p_amount_total,'needs_review','Menge ausserhalb 1–10 oder Angaben unvollständig. Bitte manuell prüfen.');
    return jsonb_build_object('status','needs_review');
  end if;
  select id,price,seats into c from public.courses where id=p_course_id for update;
  if not found then
    insert into private.payment_link_events(session_id,course_id,quantity,amount_rappen,status,note)
    values(p_session_id,p_course_id,p_quantity,p_amount_total,'needs_review','Kurs nicht gefunden.');
    return jsonb_build_object('status','needs_review');
  end if;
  -- Reservierter Warteliste-Platz derselben E-Mail wird für diese Zahlung verwendet.
  select id,held_quantity into w from public.course_waitlist
   where course_id=p_course_id and status='offered' and lower(guest_email)=v_email for update;
  if found then
    perform set_config('sponti.waitlist_busy','on',true);
    update public.courses set seats=seats+w.held_quantity where id=p_course_id;
    update public.course_waitlist set status='booked',held_quantity=0,updated_at=now() where id=w.id;
    c.seats:=c.seats+w.held_quantity; v_wait:=w.id;
  end if;
  if p_amount_total<>round(c.price*100*p_quantity)::bigint then
    v_note:='Bezahlter Betrag weicht vom Kurspreis ab. ';
  end if;
  if c.seats<p_quantity then v_note:=v_note||'Nicht genug freie Plätze (überbucht). '; end if;
  insert into public.course_checkout_bookings(course_id,guest_name,guest_email,guest_phone,quantity,unit_price_chf,total_chf,
    booking_status,payment_provider,payment_status,payment_reference,duplicate_guard_enabled)
  values(p_course_id,v_name,v_email,left(coalesce(p_phone,''),32),p_quantity,round(p_amount_total/100.0/p_quantity,2),p_amount_total/100.0,
    'pending_payment','stripe','pending',p_session_id,false)
  returning id into v_id;
  update public.courses set seats=greatest(seats-p_quantity,0) where id=p_course_id;
  update public.course_checkout_bookings set booking_status='confirmed',payment_status='paid' where id=v_id;
  -- Die Aufteilung auf den Anbieter erfolgt im Stripe-Zahlungslink selbst. Keine zweite automatische Auszahlung.
  delete from private.sponti_transfer_ledger where booking_id=v_id;
  insert into private.payment_link_events(session_id,course_id,quantity,amount_rappen,status,note,booking_id)
  values(p_session_id,p_course_id,p_quantity,p_amount_total,case when v_note='' then 'booked' else 'needs_review' end,btrim(v_note),v_id);
  if v_wait is not null then perform private.sponti_waitlist_finish_claim(v_wait,p_course_id,v_id); end if;
  return jsonb_build_object('status','booked','booking_id',v_id,'note',btrim(v_note));
end $function$;

-- 6) E-Mail-Versand für die neuen Arten -----------------------------------------
create or replace function public.claim_customer_event_emails()
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare result jsonb;
begin
 if auth.role()<>'service_role' then raise exception 'Not authorized' using errcode='42501'; end if;
 update private.customer_email_outbox set status='failed',last_error='Retry window exhausted'
 where status in ('pending','sending') and kind in
 ('reminder_24h','reminder_12h','review_request','booking_cancelled','course_cancelled','waitlist_joined','waitlist_offer')
 and (attempts>=7 or first_attempt_at<now()-interval '20 hours')
 and (lease_until is null or lease_until<now());
 with candidates as (
  select id from private.customer_email_outbox
  where status in ('pending','sending')
   and kind in ('reminder_24h','reminder_12h','review_request','booking_cancelled','course_cancelled','waitlist_joined','waitlist_offer')
   and scheduled_at<=now() and next_attempt_at<=now()
   and (lease_until is null or lease_until<now())
   and attempts<7
  order by scheduled_at,id for update skip locked limit 8
 ), claimed as (
  update private.customer_email_outbox q
  set status='sending',attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()),
    lease_until=now()+interval '3 minutes',lease_id=gen_random_uuid()
  from candidates c where q.id=c.id
  returning q.id,q.kind,q.booking_id,q.course_id,q.recipient_email,q.event_key,q.lease_id,q.created_at,q.scheduled_at,q.waitlist_id
 ) select coalesce(jsonb_agg(to_jsonb(claimed)),'[]'::jsonb) into result from claimed;
 return result;
end $function$;

create or replace function private.dispatch_customer_event_emails()
returns bigint language plpgsql security definer set search_path = '' as $function$
declare rid bigint; token text;
begin
 if not exists (select 1 from private.customer_email_outbox
  where status in ('pending','sending') and kind in
  ('reminder_24h','reminder_12h','review_request','booking_cancelled','course_cancelled','waitlist_joined','waitlist_offer')
  and scheduled_at<=now() and next_attempt_at<=now() and (lease_until is null or lease_until<now()) and attempts<7)
 then return null; end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='welcome_worker_token';
 if token is null then raise warning 'Customer email worker credential not available'; return null; end if;
 select net.http_post(
  url:='https://ehifskiigrfpxeiruyxr.supabase.co/functions/v1/send-customer-events',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),
  body:='{}'::jsonb,timeout_milliseconds:=60000
 ) into rid;
 return rid;
end $function$;

-- 7) Rechte und Zeitplan ----------------------------------------------------------
revoke all on function private.sponti_waitlist_offer_next(uuid), private.sponti_waitlist_expire(),
  private.sponti_waitlist_claim(uuid, uuid, integer), private.sponti_waitlist_finish_claim(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.sponti_join_waitlist(uuid, text, text, text, integer, boolean),
  public.sponti_waitlist_offer(uuid), public.sponti_leave_waitlist(uuid),
  public.provider_course_waitlist_counts(),
  public.sponti_reserve_paid_checkout(uuid, integer, text, text, text, uuid),
  public.book_free_course_with_terms(uuid, text, text, text, integer, boolean, uuid) from public;
grant execute on function public.sponti_join_waitlist(uuid, text, text, text, integer, boolean),
  public.sponti_waitlist_offer(uuid), public.sponti_leave_waitlist(uuid),
  public.book_free_course_with_terms(uuid, text, text, text, integer, boolean, uuid) to anon, authenticated;
grant execute on function public.provider_course_waitlist_counts() to authenticated;
revoke all on function public.sponti_reserve_paid_checkout(uuid, integer, text, text, text, uuid) from anon, authenticated;
revoke all on function public.provider_course_waitlist_counts() from anon;
grant execute on function public.sponti_reserve_paid_checkout(uuid, integer, text, text, text, uuid) to service_role;

select cron.unschedule(jobid) from cron.job where jobname = 'sponti-waitlist-expire';
select cron.schedule('sponti-waitlist-expire', '*/5 * * * *', 'select private.sponti_waitlist_expire();');
