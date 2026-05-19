create extension if not exists "pgcrypto";

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

alter table public.materials enable row level security;

grant select on public.materials to anon, authenticated;
grant insert, update, delete on public.materials to authenticated;

drop policy if exists "Anyone can read materials" on public.materials;
drop policy if exists "Admins can manage materials" on public.materials;

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
