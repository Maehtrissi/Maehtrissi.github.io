-- Separate storage for provider enquiries from the homepage and provider popup.
begin;

create table public."Kursanbieter" (
  id uuid primary key default gen_random_uuid(),
  company text not null check (length(trim(company)) between 1 and 200),
  contact text not null check (length(trim(contact)) between 1 and 200),
  email text not null check (length(trim(email)) between 3 and 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  category text not null check (category in ('Yoga & Wellness', 'Kochen & Genießen', 'Kunst & Handwerk', 'Fotografie & Design', 'Tanz & Bewegung', 'Natur & Draußen', 'Etwas anderes')),
  message text not null default '' check (length(message) <= 5000),
  created_at timestamptz not null default now()
);

alter table public."Kursanbieter" enable row level security;
revoke all on table public."Kursanbieter" from anon, authenticated;
grant insert (company, contact, email, category, message) on table public."Kursanbieter" to anon, authenticated;
grant all on table public."Kursanbieter" to service_role;

create policy "Submit provider enquiry"
  on public."Kursanbieter"
  for insert
  to anon, authenticated
  with check (true);

notify pgrst, 'reload schema';
commit;
