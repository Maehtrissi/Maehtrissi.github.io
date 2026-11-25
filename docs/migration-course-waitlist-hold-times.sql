-- Sponti Warteliste: gestaffelte Reservierungsdauer (25. November 2026)
-- >3 Tage vor Kursbeginn 6 h, 1–3 Tage 3 h, <24 h 1 h.
-- Nachtschutz: Angebote zwischen 22 und 7 Uhr (Zürich) gelten mindestens bis 9 Uhr.
-- Immer höchstens bis Buchungsschluss (2 h vor Kursbeginn).
create or replace function private.sponti_waitlist_hold_until(p_starts_at timestamptz, p_now timestamptz default now())
returns timestamptz language plpgsql stable set search_path = '' as $$
declare v_exp timestamptz; v_local timestamp; v_morning timestamptz;
begin
  v_exp := p_now + case when p_starts_at - p_now > interval '3 days' then interval '6 hours'
                        when p_starts_at - p_now > interval '24 hours' then interval '3 hours'
                        else interval '1 hour' end;
  v_local := p_now at time zone 'Europe/Zurich';
  if extract(hour from v_local) >= 22 then
    v_morning := ((v_local::date + 1) + time '09:00') at time zone 'Europe/Zurich';
  elsif extract(hour from v_local) < 7 then
    v_morning := (v_local::date + time '09:00') at time zone 'Europe/Zurich';
  end if;
  if v_morning is not null then v_exp := greatest(v_exp, v_morning); end if;
  return least(v_exp, p_starts_at - interval '2 hours');
end $$;
-- private.sponti_waitlist_offer_next verwendet jetzt:
--   v_exp := private.sponti_waitlist_hold_until(c.starts_at);
-- (sonst unverändert gegenüber migration-course-waitlist.sql)
revoke all on function private.sponti_waitlist_hold_until(timestamptz, timestamptz) from public, anon, authenticated;
