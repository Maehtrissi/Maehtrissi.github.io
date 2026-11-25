-- Sponti Warteliste: abgebrochene Zahlung aus einem Platzangebot (25. November 2026)
-- Bricht jemand die Stripe-Zahlung ab (oder läuft die Stripe-Sitzung ab), bleibt der
-- reservierte Platz bis zum Ende der Reservierung für dieselbe Person bestehen,
-- statt sofort an die nächste Anfrage zu gehen.
create or replace function private.sponti_waitlist_on_booking_aborted()
returns trigger language plpgsql security definer set search_path = '' as $$
declare w record;
begin
  select id, offer_expires_at into w from public.course_waitlist
   where booking_id = new.id and status = 'booked' for update;
  if found and w.offer_expires_at > now() + interval '5 minutes' then
    update public.course_waitlist set status = 'offered', held_quantity = new.quantity, booking_id = null, updated_at = now()
     where id = w.id;
    -- Die Buchungsfunktion gibt die Plätze gleich danach frei; der Sitzplatz-Trigger hält sie dann wieder zurück.
    perform set_config('sponti.waitlist_rehold', new.course_id::text || ':' || new.quantity, true);
  end if;
  return null;
end $$;
drop trigger if exists sponti_waitlist_booking_aborted on public.course_checkout_bookings;
create trigger sponti_waitlist_booking_aborted after update of booking_status on public.course_checkout_bookings
  for each row when (old.booking_status = 'pending_payment' and new.booking_status = 'cancelled')
  execute function private.sponti_waitlist_on_booking_aborted();

create or replace function private.sponti_waitlist_on_seats()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v text; q integer;
begin
  if coalesce(current_setting('sponti.waitlist_busy', true), 'off') = 'on' then return null; end if;
  v := coalesce(current_setting('sponti.waitlist_rehold', true), '');
  if v like new.id::text || ':%' then
    q := least(split_part(v, ':', 2)::integer, new.seats);
    perform set_config('sponti.waitlist_rehold', '', true);
    perform set_config('sponti.waitlist_busy', 'on', true);
    update public.courses set seats = seats - q where id = new.id;
    perform set_config('sponti.waitlist_busy', 'off', true);
  end if;
  perform private.sponti_waitlist_offer_next(new.id);
  return null;
end $$;
revoke all on function private.sponti_waitlist_on_booking_aborted(), private.sponti_waitlist_on_seats() from public, anon, authenticated;
