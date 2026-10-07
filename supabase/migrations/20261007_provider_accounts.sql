begin;

create table if not exists public.provider_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company text not null default '',
  contact_name text not null default '',
  phone text not null default '',
  location text not null default '',
  website text not null default '',
  category text not null default '',
  description text not null default '',
  booking_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.provider_profiles enable row level security;
grant select, insert, update on public.provider_profiles to authenticated;
create policy "Providers read own profile" on public.provider_profiles for select to authenticated using (auth.uid() = user_id);
create policy "Providers create own profile" on public.provider_profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "Providers update own profile" on public.provider_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
notify pgrst, 'reload schema';
commit;
