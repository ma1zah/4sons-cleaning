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
