create extension if not exists "pgcrypto";

create type public.order_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.payment_status as enum ('paid', 'unpaid');

create table public.daily_menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_date date not null,
  name text not null,
  description text,
  price numeric(10, 2) not null check (price > 0),
  available_quantity integer check (available_quantity is null or available_quantity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null,
  employee_name text not null,
  order_date date not null,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  payment_mode text,
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  admin_note text,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.daily_menu_items(id) on delete set null,
  item_name text not null,
  unit_price numeric(10, 2) not null check (unit_price > 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(10, 2) not null check (line_total >= 0)
);

create index daily_menu_items_menu_date_idx on public.daily_menu_items(menu_date);
create index orders_order_date_idx on public.orders(order_date);
create index orders_employee_code_idx on public.orders(employee_code);
create index order_items_order_id_idx on public.order_items(order_id);

alter table public.daily_menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Anyone can read active menu"
  on public.daily_menu_items
  for select
  using (is_active = true or auth.role() = 'authenticated');

create policy "Admins can manage menu"
  on public.daily_menu_items
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Residents can create orders"
  on public.orders
  for insert
  to anon, authenticated
  with check (status = 'pending' and payment_status = 'unpaid');

create policy "Admins can read orders"
  on public.orders
  for select
  to authenticated
  using (true);

create policy "Admins can update orders"
  on public.orders
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Residents can create order items"
  on public.order_items
  for insert
  to anon, authenticated
  with check (true);

create policy "Admins can read order items"
  on public.order_items
  for select
  to authenticated
  using (true);
