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
  add_ons text,
  staff_notes text,
  scheduled_date date,
  scheduled_time text,
  status text not null default 'pending',
  updated_at timestamptz not null default now(),
  constraint bookings_status_check check (
    status in ('new', 'pending', 'contacted', 'confirmed', 'rejected', 'completed', 'cancelled')
  )
);

alter table public.bookings add column if not exists add_ons text;
alter table public.bookings add column if not exists staff_notes text;
alter table public.bookings add column if not exists scheduled_date date;
alter table public.bookings add column if not exists scheduled_time text;
alter table public.bookings alter column customer_name drop not null;
alter table public.bookings alter column phone drop not null;
alter table public.bookings alter column job_address drop not null;
alter table public.bookings alter column suburb drop not null;
alter table public.bookings alter column service_type drop not null;
alter table public.bookings alter column property_type drop not null;
alter table public.bookings alter column status set default 'pending';
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check check (
  status in ('new', 'pending', 'contacted', 'confirmed', 'rejected', 'completed', 'cancelled')
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null,
  blocked_time time not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint blocked_times_date_time_key unique (blocked_date, blocked_time)
);

create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique references public.bookings(id) on delete cascade,
  blocked_time_id uuid unique references public.blocked_times(id) on delete cascade,
  booked_date date not null,
  booked_time time not null,
  created_at timestamptz not null default now()
);

alter table public.availability_slots alter column booking_id drop not null;
alter table public.availability_slots add column if not exists blocked_time_id uuid unique references public.blocked_times(id) on delete cascade;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'availability_slots_source_check'
  ) then
    alter table public.availability_slots add constraint availability_slots_source_check
      check ((booking_id is not null) <> (blocked_time_id is not null));
  end if;
end;
$$;

create index if not exists availability_slots_date_time_idx
on public.availability_slots (booked_date, booked_time);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
before update on public.bookings
for each row
execute function public.set_updated_at();

alter table public.bookings enable row level security;
alter table public.admin_users enable row level security;
alter table public.blocked_times enable row level security;
alter table public.availability_slots enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on public.bookings to anon, authenticated;
grant select, update on public.bookings to authenticated;
grant select on public.admin_users to authenticated;
grant select, insert, update, delete on public.blocked_times to authenticated;
grant select on public.availability_slots to anon, authenticated;
grant insert, update, delete on public.availability_slots to authenticated;

drop policy if exists "Public can read booked start times" on public.availability_slots;
create policy "Public can read booked start times"
on public.availability_slots
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can manage booked start times" on public.availability_slots;
drop policy if exists "Admins can add booked start times" on public.availability_slots;
create policy "Admins can add booked start times"
on public.availability_slots
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can update booked start times" on public.availability_slots;
create policy "Admins can update booked start times"
on public.availability_slots
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

drop policy if exists "Admins can delete booked start times" on public.availability_slots;
create policy "Admins can delete booked start times"
on public.availability_slots
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Anyone can create booking requests" on public.bookings;
drop policy if exists "Admins can create bookings" on public.bookings;
drop policy if exists "Public and admins can create bookings" on public.bookings;
create policy "Public and admins can create bookings"
on public.bookings
for insert
to public
with check (
  (
    status = 'pending'
    and scheduled_date is null
    and scheduled_time is null
    and staff_notes is null
  )
  or exists (
      select 1
      from public.admin_users
      where admin_users.user_id = (select auth.uid())
    )
);

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

drop policy if exists "Admins can read blocked times" on public.blocked_times;
create policy "Admins can read blocked times"
on public.blocked_times
for select
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can add blocked times" on public.blocked_times;
create policy "Admins can add blocked times"
on public.blocked_times
for insert
to authenticated
with check (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can update blocked times" on public.blocked_times;
create policy "Admins can update blocked times"
on public.blocked_times
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

drop policy if exists "Admins can delete blocked times" on public.blocked_times;
create policy "Admins can delete blocked times"
on public.blocked_times
for delete
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

create or replace function public.sync_booking_availability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.availability_slots where booking_id = new.id;

  if new.status = 'confirmed'
    and coalesce(new.scheduled_date, new.preferred_date) is not null
    and coalesce(new.scheduled_time, new.preferred_time) ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  then
    insert into public.availability_slots (booking_id, booked_date, booked_time)
    values (
      new.id,
      coalesce(new.scheduled_date, new.preferred_date),
      coalesce(new.scheduled_time, new.preferred_time)::time
    )
    on conflict (booking_id) do update
    set booked_date = excluded.booked_date,
        booked_time = excluded.booked_time;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_booking_availability() from public, anon, authenticated;

drop trigger if exists sync_booking_availability on public.bookings;
create trigger sync_booking_availability
after insert or update of status, preferred_date, preferred_time, scheduled_date, scheduled_time on public.bookings
for each row
execute function public.sync_booking_availability();

create or replace function public.sync_blocked_time_availability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.availability_slots where blocked_time_id = old.id;
    return old;
  end if;

  delete from public.availability_slots where blocked_time_id = new.id;
  insert into public.availability_slots (blocked_time_id, booked_date, booked_time)
  values (new.id, new.blocked_date, new.blocked_time);
  return new;
end;
$$;

revoke all on function public.sync_blocked_time_availability() from public, anon, authenticated;

drop trigger if exists sync_blocked_time_availability on public.blocked_times;
create trigger sync_blocked_time_availability
after insert or update of blocked_date, blocked_time or delete on public.blocked_times
for each row
execute function public.sync_blocked_time_availability();
