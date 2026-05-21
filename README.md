# HPCL Material Inventory

Mobile-friendly material stock dashboard for `HPCL : HINDUSTAN PETROLEUM CORPORATION LIMITED`.

## Features

- Employee login dashboard for assigned terminal material availability.
- Search and filter by material, category, location, and stock status.
- Admin dashboard with terminal-scoped Supabase login.
- Add, inline edit, and delete material records.
- Shared category, sub-category, and unit option masters.
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

4. Create these Supabase Auth users. Use the email form shown here; the app login accepts the short ID.

   | App login ID | Supabase Auth email | Password | Access |
   | --- | --- | --- | --- |
   | `admin1` | `admin1@hpcl.test` | `admin1234` | `1979 - HPCL Vijayawada Terminal` |
   | `admin2` | `admin2@hpcl.test` | `admin1234` | `1915 - HPCL Ramagundam IRD` |
   | `employee1` | `employee1@hpcl.test` | `employee1234` | Both terminals |
   | `employee2` | `employee2@hpcl.test` | `employee1234` | Both terminals |

5. Start the app:

   ```bash
   pnpm dev
   ```

Employee dashboard: `http://localhost:3000`

Admin dashboard: `http://localhost:3000/hpcl/admin`
