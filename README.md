# 4 Sons Cleaning

Booking website for 4 Sons Cleaning with a Supabase-backed private workspace.

## What is included

- Customer booking request form
- Private workspace for reviewing and updating booking status
- Supabase schema with row level security
- GitHub Pages-ready Vite setup

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Add your Supabase project URL and publishable key in `.env.local`:

   ```bash
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

4. In Supabase, open the SQL editor and run:

   ```sql
   -- supabase/schema.sql
   ```

   Use the full contents of `supabase/schema.sql`.

5. Start the site:

   ```bash
   npm run dev
   ```

## Admin setup

The private workspace uses Supabase Auth email login. After the admin email has signed in once, add that user as an admin in Supabase:

```sql
insert into public.admin_users (user_id, email)
select id, email
from auth.users
where email = 'admin@example.com';
```

Replace `admin@example.com` with the real admin email.

## GitHub Pages setup

If using GitHub Pages, add these repository secrets before running the deploy workflow:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The Supabase key must be a publishable/anon key, not a service role key.
