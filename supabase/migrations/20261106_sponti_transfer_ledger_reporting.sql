-- Sponti: recorded provider shares and internal CRM finance summary.
-- The ledger does not send Stripe transfers. No automatic payouts are enabled.
create table if not exists private.sponti_transfer_ledger (
 booking_id uuid primary key references public.course_checkout_bookings(id) on delete restrict,
 provider_id uuid not null references public."Kursanbieter"(id) on delete restrict,
 stripe_mode text not null default 'test' check (stripe_mode in ('test','live')),
 status text not null default 'held' check (status in ('held','awaiting_end_time','ready','transferring','transferred','failed','refund_review','reversed')),
 gross_rappen bigint not null check (gross_rappen>0),
 commission_rappen bigint not null check (commission_rappen>=0),
 provider_rappen bigint not null check (provider_rappen>=0),
 stripe_fee_rappen bigint,
 stripe_charge_id text,
 stripe_transfer_id text unique,
 stripe_payment_intent_id text,
 eligible_after timestamptz,
 transferred_at timestamptz,
 last_error text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint share_reconciles check (gross_rappen=commission_rappen+provider_rappen)
);
alter table private.sponti_transfer_ledger enable row level security;
revoke all on private.sponti_transfer_ledger from public, anon, authenticated;

create or replace function private.sponti_record_provider_share()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_course record; v_gross bigint; v_commission bigint; v_provider bigint;
begin
 if new.booking_status <> 'confirmed' or new.payment_status <> 'paid' then return new; end if;
 if tg_op = 'UPDATE' and old.booking_status='confirmed' and old.payment_status='paid' then return new; end if;
 select provider_id,ends_at from public.courses into v_course where id=new.course_id;
 if v_course.provider_id is null then return new; end if;
 v_gross:=round(new.total_chf*100)::bigint;
 v_commission:=round(coalesce(new.commission_chf,round(new.total_chf*0.13,2))*100)::bigint;
 v_provider:=v_gross-v_commission;
 if v_gross<=0 or v_commission<0 or v_provider<0 then
   raise exception 'Provider share reconciliation failed';
 end if;
 insert into private.sponti_transfer_ledger(
 booking_id,provider_id,stripe_mode,status,gross_rappen,commission_rappen,provider_rappen,eligible_after)
 values(new.id,v_course.provider_id,
 case when new.payment_reference like 'cs_live_%' then 'live' else 'test' end,
 case when v_course.ends_at is null then 'awaiting_end_time' else 'held' end,
 v_gross,v_commission,v_provider,v_course.ends_at)
 on conflict (booking_id) do nothing;
 return new;
end;
$$;
drop trigger if exists sponti_record_provider_share on public.course_checkout_bookings;
create trigger sponti_record_provider_share
after insert or update of booking_status,payment_status on public.course_checkout_bookings
for each row execute function private.sponti_record_provider_share();

create or replace function public.crm_sponti_finance_summary(p_from timestamptz default now()-interval '30 days', p_to timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
 if not (auth.role()='service_role' or (select public.crm_is_employee())) then
   raise insufficient_privilege using message='Only authorized Sponti employees may view finance data';
 end if;
 if p_to<=p_from or p_to>p_from+interval '370 days' then raise exception 'Invalid reporting period'; end if;
 select jsonb_build_object(
  'period_from',p_from,
  'period_to',p_to,
  'confirmed_paid_bookings',count(*) filter (where booking_status='confirmed' and payment_status='paid'),
  'gross_paid_chf',coalesce(sum(total_chf) filter (where booking_status='confirmed' and payment_status='paid'),0),
  'sponti_commission_chf',coalesce(sum(commission_chf) filter (where booking_status='confirmed' and payment_status='paid'),0),
  'provider_share_before_fees_chf',coalesce(sum(provider_amount_before_adjustments_chf) filter (where booking_status='confirmed' and payment_status='paid'),0),
  'stripe_test_paid_count',count(*) filter (where payment_reference like 'cs_test_%' and booking_status='confirmed' and payment_status='paid'),
  'stripe_live_paid_count',count(*) filter (where payment_reference like 'cs_live_%' and booking_status='confirmed' and payment_status='paid'),
  'total_checkout_attempts',count(*)
 ) into v_result
 from public.course_checkout_bookings where created_at>=p_from and created_at<p_to;
 return v_result;
end;$$;
revoke all on function public.crm_sponti_finance_summary(timestamptz,timestamptz) from public,anon;
grant execute on function public.crm_sponti_finance_summary(timestamptz,timestamptz) to authenticated,service_role;
