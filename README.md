# NPCL Material Inventory

Mobile-friendly material stock dashboard for `NPCL : NOIDA POWER COMPANY LIMITED`.

## Features

- Public no-login dashboard for material availability.
- Search and filter by material, category, location, and stock status.
- Admin dashboard with Supabase email/password login.
- Add, inline edit, and delete material records.
- Stock badges for `In stock`, `Low stock`, and `Out of stock`.
- Excel `.xlsx` export for visible inventory records.

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

Public dashboard: `http://localhost:3000`

Admin dashboard: `http://localhost:3000/admin`
