create extension if not exists "pgcrypto";

do $$
begin
  create type public.order_status as enum ('pending', 'approved', 'rejected', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status as enum ('paid', 'unpaid');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.daily_menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_date date not null,
  name text not null,
  description text,
  price numeric(10, 2) not null check (price > 0),
  available_quantity integer check (available_quantity is null or available_quantity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
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

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.daily_menu_items(id) on delete set null,
  item_name text not null,
  unit_price numeric(10, 2) not null check (unit_price > 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(10, 2) not null check (line_total >= 0)
);

create index if not exists daily_menu_items_menu_date_idx on public.daily_menu_items(menu_date);
create index if not exists orders_order_date_idx on public.orders(order_date);
create index if not exists orders_employee_code_idx on public.orders(employee_code);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  unit text not null,
  quantity integer not null default 0 check (quantity >= 0),
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  location text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists materials_category_idx on public.materials(category);
create index if not exists materials_location_idx on public.materials(location);
create index if not exists materials_quantity_idx on public.materials(quantity);

alter table public.daily_menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.materials enable row level security;

grant select on public.daily_menu_items to anon, authenticated;
grant insert, update, delete on public.daily_menu_items to authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;
grant insert on public.order_items to anon, authenticated;
grant select on public.order_items to authenticated;
grant select on public.materials to anon, authenticated;
grant insert, update, delete on public.materials to authenticated;

drop policy if exists "Anyone can read active menu" on public.daily_menu_items;
drop policy if exists "Admins can manage menu" on public.daily_menu_items;
drop policy if exists "Residents can create orders" on public.orders;
drop policy if exists "Admins can read orders" on public.orders;
drop policy if exists "Admins can update orders" on public.orders;
drop policy if exists "Residents can create order items" on public.order_items;
drop policy if exists "Admins can read order items" on public.order_items;
drop policy if exists "Anyone can read materials" on public.materials;
drop policy if exists "Admins can manage materials" on public.materials;

create policy "Anyone can read active menu"
  on public.daily_menu_items
  for select
  to anon, authenticated
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

create policy "Anyone can read materials"
  on public.materials
  for select
  to anon, authenticated
  using (true);

create policy "Admins can manage materials"
  on public.materials
  for all
  to authenticated
  using (true)
  with check (true);

insert into public.materials (name, category, unit, quantity, minimum_stock, location)
values
  ('Bolts M12', 'Fasteners', 'pcs', 240, 60, 'Central Store'),
  ('Nuts M12', 'Fasteners', 'pcs', 320, 75, 'Central Store'),
  ('Flat Washers M12', 'Fasteners', 'pcs', 0, 80, 'Central Store'),
  ('LT Cable Roll 16 sq mm', 'Cable Accessories', 'm', 180, 50, 'Cable Yard'),
  ('GI Clamps 50 mm', 'Distribution', 'pcs', 42, 40, 'Line Maintenance Rack'),
  ('Copper Cable Lugs 35 sq mm', 'Electrical', 'pcs', 28, 30, 'Electrical Store'),
  ('Insulation Tape', 'Protection', 'rolls', 96, 25, 'Tool Room'),
  ('Junction Box 4 Way', 'Distribution', 'pcs', 14, 10, 'Panel Store')
on conflict (name) do nothing;
