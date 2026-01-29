-- Phase 2: Sweets Core ERP Migration

-- 1. SCENARIOS Enhancement
alter table scenarios 
add column if not exists type text check (type in ('merger_deal', 'budget_plan', 'operational_plan')) default 'merger_deal',
add column if not exists parent_scenario_id uuid references scenarios(id),
add column if not exists status text check (status in ('draft', 'active', 'archived')) default 'active';

-- 2. LOCATIONS Module (New)
create table if not exists locations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text check (type in ('factory', 'store', 'warehouse')),
  is_internal boolean default true,
  created_at timestamptz default now()
);

-- 3. ASSETS Enhancement (Link to Locations)
alter table assets 
add column if not exists location_id uuid references locations(id),
add column if not exists production_capacity_per_hour numeric default 0,
add column if not exists depreciation_years integer default 5;

-- 4. FIXED COST ITEMS (For M&A/Stickiness)
create table if not exists fixed_cost_items (
  id uuid default gen_random_uuid() primary key,
  location_id uuid references locations(id),
  name text not null,
  monthly_amount numeric not null,
  stickiness_factor numeric default 1.0, -- 1.0 = Fully Fixed, 0.0 = Fully Variable
  scenario_id uuid references scenarios(id),
  created_at timestamptz default now()
);

-- 5. PRODUCTS & MANUFACTURING (ERP Core)
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text check (type in ('raw_material', 'intermediate', 'product')), 
  unit text not null, -- 'g', 'kg', 'pcs'
  standard_cost numeric default 0,
  scenario_id uuid references scenarios(id), -- Null = Master Data
  created_at timestamptz default now()
);

create table if not exists recipes (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id), -- The output
  ingredient_id uuid references products(id), -- The input
  quantity_required numeric not null, 
  loss_rate numeric default 0.05,
  created_at timestamptz default now()
);

create table if not exists production_runs (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id),
  location_id uuid references locations(id),
  produced_quantity numeric,
  waste_quantity numeric,
  waste_reason text,
  staff_id uuid, -- Link to staff later
  scenario_id uuid references scenarios(id), -- Null = Actual Run
  created_at timestamptz default now()
);

-- 6. SUPPLY CHAIN
create table if not exists inventory_lots (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id),
  location_id uuid references locations(id),
  quantity numeric not null,
  expiration_date date,
  scenario_id uuid references scenarios(id),
  created_at timestamptz default now()
);

create table if not exists purchase_orders (
  id uuid default gen_random_uuid() primary key,
  supplier_name text,
  status text check (status in ('draft', 'ordered', 'received')),
  total_amount numeric,
  scenario_id uuid references scenarios(id),
  created_at timestamptz default now()
);

-- 7. HR & SHIFTS
create table if not exists staff (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  hourly_wage numeric not null,
  skills text[], -- ['oven', 'packing']
  default_location_id uuid references locations(id),
  created_at timestamptz default now()
);

-- Update production_runs to reference staff properly now that table exists
alter table production_runs 
add constraint fk_production_runs_staff 
foreign key (staff_id) references staff(id);

create table if not exists shifts (
  id uuid default gen_random_uuid() primary key,
  staff_id uuid references staff(id),
  location_id uuid references locations(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  role_assigned text,
  status text check (status in ('draft', 'published', 'completed')),
  scenario_id uuid references scenarios(id), -- Null = Actual Schedule
  created_at timestamptz default now()
);

-- 8. RLS Policies (Basic Update)
-- Enable RLS for all new tables
alter table locations enable row level security;
alter table fixed_cost_items enable row level security;
alter table products enable row level security; -- Note: existing 'products' table might need handling if it existed
alter table recipes enable row level security;
alter table production_runs enable row level security;
alter table inventory_lots enable row level security;
alter table purchase_orders enable row level security;
alter table staff enable row level security;
alter table shifts enable row level security;

-- Simple "Authenticated Users" policy for MVP Phase 2 (Refine later)
create policy "Enable all access for authenticated users" on locations for all to authenticated using (true);
create policy "Enable all access for authenticated users" on fixed_cost_items for all to authenticated using (true);
create policy "Enable all access for authenticated users" on products for all to authenticated using (true);
create policy "Enable all access for authenticated users" on recipes for all to authenticated using (true);
create policy "Enable all access for authenticated users" on production_runs for all to authenticated using (true);
create policy "Enable all access for authenticated users" on inventory_lots for all to authenticated using (true);
create policy "Enable all access for authenticated users" on purchase_orders for all to authenticated using (true);
create policy "Enable all access for authenticated users" on staff for all to authenticated using (true);
create policy "Enable all access for authenticated users" on shifts for all to authenticated using (true);
