create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null,
  phone text not null,
  email text,
  job_address text not null,
  suburb text not null,
  service_type text not null,
  property_type text not null,
  preferred_date date,
  preferred_time text,
  customer_notes text,
  status text not null default 'new',
  updated_at timestamptz not null default now(),
  constraint bookings_status_check check (
    status in ('new', 'contacted', 'confirmed', 'completed', 'cancelled')
  )
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
before update on public.bookings
for each row
execute function public.set_updated_at();

alter table public.bookings enable row level security;
alter table public.admin_users enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on public.bookings to anon, authenticated;
grant select, update on public.bookings to authenticated;
grant select on public.admin_users to authenticated;

drop policy if exists "Anyone can create booking requests" on public.bookings;
create policy "Anyone can create booking requests"
on public.bookings
for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins can read booking requests" on public.bookings;
create policy "Admins can read booking requests"
on public.bookings
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can update booking status" on public.bookings;
create policy "Admins can update booking status"
on public.bookings
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can read own admin row" on public.admin_users;
create policy "Admins can read own admin row"
on public.admin_users
for select
to authenticated
using (user_id = (select auth.uid()));
