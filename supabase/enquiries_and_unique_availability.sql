create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  customer_name text not null,
  phone text not null,
  email text,
  suburb text not null,
  service_type text not null,
  details text,
  status text not null default 'new',
  admin_notes text,
  constraint enquiries_status_check check (status in ('new', 'contacted', 'closed'))
);

create unique index if not exists availability_slots_unique_date_time
on public.availability_slots (booked_date, booked_time);

drop trigger if exists set_enquiries_updated_at on public.enquiries;
create trigger set_enquiries_updated_at
before update on public.enquiries
for each row
execute function public.set_updated_at();

alter table public.enquiries enable row level security;

grant insert on public.enquiries to anon, authenticated;
grant select, update on public.enquiries to authenticated;

drop policy if exists "Anyone can create enquiries" on public.enquiries;
create policy "Anyone can create enquiries"
on public.enquiries
for insert
to anon, authenticated
with check (
  status = 'new'
  and admin_notes is null
);

drop policy if exists "Admins can read enquiries" on public.enquiries;
create policy "Admins can read enquiries"
on public.enquiries
for select
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can update enquiries" on public.enquiries;
create policy "Admins can update enquiries"
on public.enquiries
for update
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);
