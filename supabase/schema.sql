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

create table if not exists public.terminals (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (category_id, name)
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.terminal_admins (
  id uuid primary key default gen_random_uuid(),
  terminal_id uuid not null references public.terminals(id) on delete cascade,
  user_id uuid unique,
  admin_email text unique,
  created_at timestamptz not null default now(),
  check (user_id is not null or admin_email is not null)
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  terminal_id uuid references public.terminals(id) on delete cascade,
  name text not null,
  category_id uuid references public.categories(id),
  subcategory_id uuid references public.subcategories(id),
  unit_id uuid references public.units(id),
  quantity integer not null default 0 check (quantity >= 0),
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  location text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

insert into public.terminals (id, code, name)
values
  ('11111111-1111-4111-8111-111111111979', '1979', 'HPCL Vijayawada Terminal'),
  ('11111111-1111-4111-8111-111111111915', '1915', 'HPCL Ramagundam IRD')
on conflict (code) do update set name = excluded.name;

insert into public.categories (id, name)
values
  ('22222222-2222-4222-8222-000000000001', 'Fasteners'),
  ('22222222-2222-4222-8222-000000000002', 'Cable Accessories'),
  ('22222222-2222-4222-8222-000000000003', 'Electrical'),
  ('22222222-2222-4222-8222-000000000004', 'Protection'),
  ('22222222-2222-4222-8222-000000000005', 'Distribution'),
  ('22222222-2222-4222-8222-000000000006', 'Tools')
on conflict (name) do nothing;

insert into public.subcategories (id, category_id, name)
values
  ('33333333-3333-4333-8333-000000000001', '22222222-2222-4222-8222-000000000001', 'Bolts and Nuts'),
  ('33333333-3333-4333-8333-000000000002', '22222222-2222-4222-8222-000000000002', 'Cable Rolls'),
  ('33333333-3333-4333-8333-000000000003', '22222222-2222-4222-8222-000000000003', 'Lugs'),
  ('33333333-3333-4333-8333-000000000004', '22222222-2222-4222-8222-000000000004', 'Insulation'),
  ('33333333-3333-4333-8333-000000000005', '22222222-2222-4222-8222-000000000005', 'Junction Boxes'),
  ('33333333-3333-4333-8333-000000000006', '22222222-2222-4222-8222-000000000006', 'Maintenance Tools')
on conflict (category_id, name) do nothing;

insert into public.units (id, name)
values
  ('44444444-4444-4444-8444-000000000001', 'pcs'),
  ('44444444-4444-4444-8444-000000000002', 'm'),
  ('44444444-4444-4444-8444-000000000003', 'rolls'),
  ('44444444-4444-4444-8444-000000000004', 'sets')
on conflict (name) do nothing;

alter table public.materials add column if not exists terminal_id uuid references public.terminals(id) on delete cascade;
alter table public.materials add column if not exists category_id uuid references public.categories(id);
alter table public.materials add column if not exists subcategory_id uuid references public.subcategories(id);
alter table public.materials add column if not exists unit_id uuid references public.units(id);

update public.materials
set terminal_id = '11111111-1111-4111-8111-111111111979'
where terminal_id is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'materials'
      and column_name = 'category'
  ) then
    update public.materials
    set category_id = c.id
    from public.categories c
    where public.materials.category_id is null
      and public.materials.category = c.name;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'materials'
      and column_name = 'unit'
  ) then
    update public.materials
    set unit_id = u.id
    from public.units u
    where public.materials.unit_id is null
      and public.materials.unit = u.name;
  end if;
end $$;

update public.materials
set category_id = '22222222-2222-4222-8222-000000000001'
where category_id is null;

update public.materials
set unit_id = '44444444-4444-4444-8444-000000000001'
where unit_id is null;

update public.materials
set subcategory_id = s.id
from public.subcategories s
where public.materials.subcategory_id is null
  and public.materials.category_id = s.category_id;

alter table public.materials alter column terminal_id set not null;
alter table public.materials alter column category_id set not null;
alter table public.materials alter column subcategory_id set not null;
alter table public.materials alter column unit_id set not null;

alter table public.materials drop constraint if exists materials_name_key;
create unique index if not exists materials_terminal_name_idx on public.materials(terminal_id, name);

create index if not exists daily_menu_items_menu_date_idx on public.daily_menu_items(menu_date);
create index if not exists orders_order_date_idx on public.orders(order_date);
create index if not exists orders_employee_code_idx on public.orders(employee_code);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists materials_terminal_idx on public.materials(terminal_id);
create index if not exists materials_category_idx on public.materials(category_id);
create index if not exists materials_subcategory_idx on public.materials(subcategory_id);
create index if not exists materials_unit_idx on public.materials(unit_id);
create index if not exists materials_location_idx on public.materials(location);
create index if not exists materials_quantity_idx on public.materials(quantity);
create index if not exists terminal_admins_user_id_idx on public.terminal_admins(user_id);
create index if not exists terminal_admins_admin_email_idx on public.terminal_admins(lower(admin_email));

alter table public.daily_menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.terminals enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.units enable row level security;
alter table public.terminal_admins enable row level security;
alter table public.materials enable row level security;

grant select on public.daily_menu_items to anon, authenticated;
grant insert, update, delete on public.daily_menu_items to authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;
grant insert on public.order_items to anon, authenticated;
grant select on public.order_items to authenticated;
grant select on public.terminals to anon, authenticated;
grant select, insert on public.categories to authenticated;
grant select, insert on public.subcategories to authenticated;
grant select, insert on public.units to authenticated;
grant select on public.terminal_admins to authenticated;
grant select, insert, update, delete on public.materials to authenticated;

drop policy if exists "Anyone can read active menu" on public.daily_menu_items;
drop policy if exists "Admins can manage menu" on public.daily_menu_items;
drop policy if exists "Residents can create orders" on public.orders;
drop policy if exists "Admins can read orders" on public.orders;
drop policy if exists "Admins can update orders" on public.orders;
drop policy if exists "Residents can create order items" on public.order_items;
drop policy if exists "Admins can read order items" on public.order_items;
drop policy if exists "Anyone can read materials" on public.materials;
drop policy if exists "Admins can manage materials" on public.materials;
drop policy if exists "Anyone can read terminals" on public.terminals;
drop policy if exists "Admins can read option masters" on public.categories;
drop policy if exists "Admins can add categories" on public.categories;
drop policy if exists "Admins can read subcategories" on public.subcategories;
drop policy if exists "Admins can add subcategories" on public.subcategories;
drop policy if exists "Admins can read units" on public.units;
drop policy if exists "Admins can add units" on public.units;
drop policy if exists "Admins can read own terminal assignment" on public.terminal_admins;
drop policy if exists "Admins can read assigned terminal materials" on public.materials;
drop policy if exists "Admins can insert assigned terminal materials" on public.materials;
drop policy if exists "Admins can update assigned terminal materials" on public.materials;
drop policy if exists "Admins can delete assigned terminal materials" on public.materials;

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

create policy "Anyone can read terminals"
  on public.terminals
  for select
  to anon, authenticated
  using (true);

create policy "Admins can read option masters"
  on public.categories
  for select
  to authenticated
  using (true);

create policy "Admins can add categories"
  on public.categories
  for insert
  to authenticated
  with check (true);

create policy "Admins can read subcategories"
  on public.subcategories
  for select
  to authenticated
  using (true);

create policy "Admins can add subcategories"
  on public.subcategories
  for insert
  to authenticated
  with check (true);

create policy "Admins can read units"
  on public.units
  for select
  to authenticated
  using (true);

create policy "Admins can add units"
  on public.units
  for insert
  to authenticated
  with check (true);

create policy "Admins can read own terminal assignment"
  on public.terminal_admins
  for select
  to authenticated
  using (user_id = auth.uid() or lower(admin_email) = lower(auth.jwt() ->> 'email'));

create policy "Admins can read assigned terminal materials"
  on public.materials
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.terminal_admins ta
      where ta.terminal_id = materials.terminal_id
        and (ta.user_id = auth.uid() or lower(ta.admin_email) = lower(auth.jwt() ->> 'email'))
    )
  );

create policy "Admins can insert assigned terminal materials"
  on public.materials
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.terminal_admins ta
      where ta.terminal_id = materials.terminal_id
        and (ta.user_id = auth.uid() or lower(ta.admin_email) = lower(auth.jwt() ->> 'email'))
    )
  );

create policy "Admins can update assigned terminal materials"
  on public.materials
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.terminal_admins ta
      where ta.terminal_id = materials.terminal_id
        and (ta.user_id = auth.uid() or lower(ta.admin_email) = lower(auth.jwt() ->> 'email'))
    )
  )
  with check (
    exists (
      select 1
      from public.terminal_admins ta
      where ta.terminal_id = materials.terminal_id
        and (ta.user_id = auth.uid() or lower(ta.admin_email) = lower(auth.jwt() ->> 'email'))
    )
  );

create policy "Admins can delete assigned terminal materials"
  on public.materials
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.terminal_admins ta
      where ta.terminal_id = materials.terminal_id
        and (ta.user_id = auth.uid() or lower(ta.admin_email) = lower(auth.jwt() ->> 'email'))
    )
  );

create or replace function public.get_terminal_materials(input_terminal_code text)
returns table (
  id uuid,
  terminal_id uuid,
  terminal_code text,
  terminal_name text,
  name text,
  category_id uuid,
  category text,
  subcategory_id uuid,
  subcategory text,
  unit_id uuid,
  unit text,
  quantity integer,
  minimum_stock integer,
  location text,
  updated_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    m.id,
    m.terminal_id,
    t.code as terminal_code,
    t.name as terminal_name,
    m.name,
    m.category_id,
    c.name as category,
    m.subcategory_id,
    s.name as subcategory,
    m.unit_id,
    u.name as unit,
    m.quantity,
    m.minimum_stock,
    m.location,
    m.updated_at,
    m.created_at
  from public.materials m
  join public.terminals t on t.id = m.terminal_id
  join public.categories c on c.id = m.category_id
  join public.subcategories s on s.id = m.subcategory_id
  join public.units u on u.id = m.unit_id
  where t.code = trim(input_terminal_code)
  order by c.name, m.name;
$$;

revoke all on function public.get_terminal_materials(text) from public;
grant execute on function public.get_terminal_materials(text) to anon, authenticated;

insert into public.materials (terminal_id, name, category_id, subcategory_id, unit_id, quantity, minimum_stock, location)
values
  ('11111111-1111-4111-8111-111111111979', 'Bolts M12', '22222222-2222-4222-8222-000000000001', '33333333-3333-4333-8333-000000000001', '44444444-4444-4444-8444-000000000001', 240, 60, 'Vijayawada Central Store'),
  ('11111111-1111-4111-8111-111111111979', 'Nuts M12', '22222222-2222-4222-8222-000000000001', '33333333-3333-4333-8333-000000000001', '44444444-4444-4444-8444-000000000001', 320, 75, 'Vijayawada Central Store'),
  ('11111111-1111-4111-8111-111111111979', 'LT Cable Roll 16 sq mm', '22222222-2222-4222-8222-000000000002', '33333333-3333-4333-8333-000000000002', '44444444-4444-4444-8444-000000000002', 180, 50, 'Vijayawada Cable Yard'),
  ('11111111-1111-4111-8111-111111111979', 'Insulation Tape', '22222222-2222-4222-8222-000000000004', '33333333-3333-4333-8333-000000000004', '44444444-4444-4444-8444-000000000003', 96, 25, 'Vijayawada Tool Room'),
  ('11111111-1111-4111-8111-111111111915', 'Flat Washers M12', '22222222-2222-4222-8222-000000000001', '33333333-3333-4333-8333-000000000001', '44444444-4444-4444-8444-000000000001', 0, 80, 'Ramagundam Central Store'),
  ('11111111-1111-4111-8111-111111111915', 'GI Clamps 50 mm', '22222222-2222-4222-8222-000000000005', '33333333-3333-4333-8333-000000000005', '44444444-4444-4444-8444-000000000001', 42, 40, 'Ramagundam Line Rack'),
  ('11111111-1111-4111-8111-111111111915', 'Copper Cable Lugs 35 sq mm', '22222222-2222-4222-8222-000000000003', '33333333-3333-4333-8333-000000000003', '44444444-4444-4444-8444-000000000001', 28, 30, 'Ramagundam Electrical Store'),
  ('11111111-1111-4111-8111-111111111915', 'Junction Box 4 Way', '22222222-2222-4222-8222-000000000005', '33333333-3333-4333-8333-000000000005', '44444444-4444-4444-8444-000000000001', 14, 10, 'Ramagundam Panel Store')
on conflict (terminal_id, name) do nothing;

-- Replace these emails with the actual Supabase Auth admin emails after creating users.
insert into public.terminal_admins (terminal_id, admin_email)
values
  ('11111111-1111-4111-8111-111111111979', 'vijayawada.admin@example.com'),
  ('11111111-1111-4111-8111-111111111915', 'ramagundam.admin@example.com')
on conflict (admin_email) do update set terminal_id = excluded.terminal_id;
