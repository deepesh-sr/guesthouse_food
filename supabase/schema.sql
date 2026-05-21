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

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  login_id text not null unique,
  email text unique,
  role text not null check (role in ('admin', 'employee')),
  display_name text not null,
  created_at timestamptz not null default now(),
  check (user_id is not null or email is not null)
);

create table if not exists public.employee_terminal_access (
  id uuid primary key default gen_random_uuid(),
  terminal_id uuid not null references public.terminals(id) on delete cascade,
  user_id uuid,
  employee_email text,
  created_at timestamptz not null default now(),
  check (user_id is not null or employee_email is not null),
  unique (terminal_id, employee_email),
  unique (terminal_id, user_id)
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

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'materials'
      and column_name = 'category'
  ) then
    alter table public.materials alter column category drop not null;
    update public.materials
    set category = c.name
    from public.categories c
    where public.materials.category_id = c.id
      and public.materials.category is null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'materials'
      and column_name = 'unit'
  ) then
    alter table public.materials alter column unit drop not null;
    update public.materials
    set unit = u.name
    from public.units u
    where public.materials.unit_id = u.id
      and public.materials.unit is null;
  end if;
end $$;

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
create index if not exists user_profiles_user_id_idx on public.user_profiles(user_id);
create index if not exists user_profiles_email_idx on public.user_profiles(lower(email));
create index if not exists employee_terminal_access_user_id_idx on public.employee_terminal_access(user_id);
create index if not exists employee_terminal_access_email_idx on public.employee_terminal_access(lower(employee_email));

alter table public.daily_menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.terminals enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.units enable row level security;
alter table public.terminal_admins enable row level security;
alter table public.user_profiles enable row level security;
alter table public.employee_terminal_access enable row level security;
alter table public.materials enable row level security;

grant select on public.daily_menu_items to anon, authenticated;
grant insert, update, delete on public.daily_menu_items to authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;
grant insert on public.order_items to anon, authenticated;
grant select on public.order_items to authenticated;
revoke select on public.terminals from anon;
revoke select on public.materials from anon;
grant select on public.terminals to authenticated;
grant select, insert on public.categories to authenticated;
grant select, insert on public.subcategories to authenticated;
grant select, insert on public.units to authenticated;
grant select on public.terminal_admins to authenticated;
grant select on public.user_profiles to authenticated;
grant select on public.employee_terminal_access to authenticated;
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
drop policy if exists "Assigned users can read terminals" on public.terminals;
drop policy if exists "Admins can read option masters" on public.categories;
drop policy if exists "Admins can add categories" on public.categories;
drop policy if exists "Admins can read subcategories" on public.subcategories;
drop policy if exists "Admins can add subcategories" on public.subcategories;
drop policy if exists "Admins can read units" on public.units;
drop policy if exists "Admins can add units" on public.units;
drop policy if exists "Admins can read own terminal assignment" on public.terminal_admins;
drop policy if exists "Users can read own profile" on public.user_profiles;
drop policy if exists "Employees can read own terminal access" on public.employee_terminal_access;
drop policy if exists "Admins can read assigned terminal materials" on public.materials;
drop policy if exists "Employees can read assigned terminal materials" on public.materials;
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

create policy "Assigned users can read terminals"
  on public.terminals
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.employee_terminal_access eta
      where eta.terminal_id = terminals.id
        and (eta.user_id = auth.uid() or lower(eta.employee_email) = lower(auth.jwt() ->> 'email'))
    )
    or exists (
      select 1
      from public.terminal_admins ta
      where ta.terminal_id = terminals.id
        and (ta.user_id = auth.uid() or lower(ta.admin_email) = lower(auth.jwt() ->> 'email'))
    )
  );

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

create policy "Users can read own profile"
  on public.user_profiles
  for select
  to authenticated
  using (user_id = auth.uid() or lower(email) = lower(auth.jwt() ->> 'email'));

create policy "Employees can read own terminal access"
  on public.employee_terminal_access
  for select
  to authenticated
  using (user_id = auth.uid() or lower(employee_email) = lower(auth.jwt() ->> 'email'));

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

create policy "Employees can read assigned terminal materials"
  on public.materials
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.employee_terminal_access eta
      where eta.terminal_id = materials.terminal_id
        and (eta.user_id = auth.uid() or lower(eta.employee_email) = lower(auth.jwt() ->> 'email'))
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

drop function if exists public.get_terminal_materials(text);

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

insert into public.user_profiles (login_id, email, role, display_name)
values
  ('admin1', 'admin1@hpcl.test', 'admin', 'Admin 1 - Vijayawada'),
  ('admin2', 'admin2@hpcl.test', 'admin', 'Admin 2 - Ramagundam'),
  ('employee1', 'employee1@hpcl.test', 'employee', 'Employee 1'),
  ('employee2', 'employee2@hpcl.test', 'employee', 'Employee 2')
on conflict (login_id) do update
set email = excluded.email,
    role = excluded.role,
    display_name = excluded.display_name;

insert into public.terminal_admins (terminal_id, admin_email)
values
  ('11111111-1111-4111-8111-111111111979', 'admin1@hpcl.test'),
  ('11111111-1111-4111-8111-111111111915', 'admin2@hpcl.test')
on conflict (admin_email) do update set terminal_id = excluded.terminal_id;

insert into public.employee_terminal_access (terminal_id, employee_email)
values
  ('11111111-1111-4111-8111-111111111979', 'employee1@hpcl.test'),
  ('11111111-1111-4111-8111-111111111915', 'employee1@hpcl.test'),
  ('11111111-1111-4111-8111-111111111979', 'employee2@hpcl.test'),
  ('11111111-1111-4111-8111-111111111915', 'employee2@hpcl.test')
on conflict (terminal_id, employee_email) do nothing;
