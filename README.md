# Guest House Food

Mobile-first food ordering and records app for a colony guest house.

## Features

- Resident order page with employee code, name, daily menu, cart, and pending order submission.
- Admin dashboard with Supabase email/password login.
- Daily menu management by date.
- Order approval flow: `pending`, `approved`, `rejected`, `cancelled`.
- Manual payment tracking: `paid` / `unpaid` and payment mode.
- Excel `.xlsx` export for filtered records.

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.

3. Create `.env.local`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

4. Create an admin user in Supabase Auth using email/password.

5. Start the app:

   ```bash
   pnpm dev
   ```

Resident app: `http://localhost:3000`

Admin dashboard: `http://localhost:3000/admin`
