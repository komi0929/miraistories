-- ============================================
-- SWEETS CORE ERP - PHASE 2 MIGRATION
-- Version: 2.0
-- Date: 2026-01-22
-- Description: Expand Phase 1 M&A tool to full ERP
-- ============================================

-- ============================================
-- SECTION 1: ENHANCE EXISTING TABLES
-- ============================================

-- 1.1 Enhance scenarios table for ERP modes
ALTER TABLE scenarios 
ADD COLUMN IF NOT EXISTS type text 
  CHECK (type IN ('merger_deal', 'budget_plan', 'operational_plan')) 
  DEFAULT 'merger_deal',
ADD COLUMN IF NOT EXISTS parent_scenario_id uuid REFERENCES scenarios,
ADD COLUMN IF NOT EXISTS status text 
  CHECK (status IN ('draft', 'active', 'archived')) 
  DEFAULT 'active';

-- ============================================
-- SECTION 2: NEW ORGANIZATIONAL TABLES
-- ============================================

-- 2.1 Locations (Stores, Factories, Warehouses)
CREATE TABLE IF NOT EXISTS locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text CHECK (type IN ('factory', 'store', 'warehouse')) NOT NULL,
  is_internal boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2.2 Add location reference and production fields to assets
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations,
ADD COLUMN IF NOT EXISTS production_capacity_per_hour numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS depreciation_years integer DEFAULT 5;

-- 2.3 Fixed Cost Items (for M&A Cost Stickiness Analysis)
CREATE TABLE IF NOT EXISTS fixed_cost_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id uuid REFERENCES locations,
  name text NOT NULL,
  monthly_amount numeric NOT NULL,
  stickiness_factor numeric DEFAULT 1.0 CHECK (stickiness_factor >= 0 AND stickiness_factor <= 1),
  scenario_id uuid REFERENCES scenarios,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- SECTION 3: PRODUCTS & MANUFACTURING
-- ============================================

-- 3.1 Evolve products table from Phase 1 prep to full ERP
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('raw_material', 'intermediate', 'product')),
ADD COLUMN IF NOT EXISTS unit text DEFAULT 'pcs',
ADD COLUMN IF NOT EXISTS standard_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS scenario_id uuid REFERENCES scenarios;

-- 3.2 Recipes (BOM - Bill of Materials, Recursive Structure)
CREATE TABLE IF NOT EXISTS recipes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products NOT NULL,
  ingredient_id uuid REFERENCES products NOT NULL,
  quantity_required numeric NOT NULL,
  loss_rate numeric DEFAULT 0.05,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, ingredient_id)
);

-- 3.3 Production Runs (Manufacturing Logs with Waste Tracking)
CREATE TABLE IF NOT EXISTS production_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products NOT NULL,
  location_id uuid REFERENCES locations NOT NULL,
  produced_quantity numeric NOT NULL,
  waste_quantity numeric DEFAULT 0,
  waste_reason text,
  staff_id uuid, -- FK added after staff table created
  scenario_id uuid REFERENCES scenarios,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- SECTION 4: SUPPLY CHAIN
-- ============================================

-- 4.1 Inventory Lots (with Expiration Tracking)
CREATE TABLE IF NOT EXISTS inventory_lots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products NOT NULL,
  location_id uuid REFERENCES locations NOT NULL,
  quantity numeric NOT NULL,
  expiration_date date,
  scenario_id uuid REFERENCES scenarios,
  created_at timestamptz DEFAULT now()
);

-- 4.2 Purchase Orders (AI-Generated Drafts)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_name text,
  status text CHECK (status IN ('draft', 'ordered', 'received')) DEFAULT 'draft',
  total_amount numeric DEFAULT 0,
  notes text,
  scenario_id uuid REFERENCES scenarios,
  created_at timestamptz DEFAULT now()
);

-- 4.3 Purchase Order Lines
CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id uuid REFERENCES purchase_orders ON DELETE CASCADE,
  product_id uuid REFERENCES products NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- SECTION 5: HR & SHIFTS
-- ============================================

-- 5.1 Staff (Employee Master)
CREATE TABLE IF NOT EXISTS staff (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  hourly_wage numeric NOT NULL,
  skills text[] DEFAULT '{}',
  default_location_id uuid REFERENCES locations,
  created_at timestamptz DEFAULT now()
);

-- 5.2 Add staff FK to production_runs (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'production_runs_staff_id_fkey'
  ) THEN
    ALTER TABLE production_runs
    ADD CONSTRAINT production_runs_staff_id_fkey 
    FOREIGN KEY (staff_id) REFERENCES staff(id);
  END IF;
END $$;

-- 5.3 Shifts (with AI Draft Status)
CREATE TABLE IF NOT EXISTS shifts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid REFERENCES staff NOT NULL,
  location_id uuid REFERENCES locations NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  role_assigned text,
  status text CHECK (status IN ('draft', 'published', 'completed')) DEFAULT 'draft',
  scenario_id uuid REFERENCES scenarios,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- SECTION 6: ENABLE RLS FOR NEW TABLES
-- ============================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_cost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECTION 7: RLS POLICIES
-- ============================================

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Locations
CREATE POLICY "locations_select_authenticated" ON locations 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "locations_admin_all" ON locations 
  FOR ALL USING (is_admin());

-- Fixed Cost Items
CREATE POLICY "fixed_cost_items_select_authenticated" ON fixed_cost_items 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "fixed_cost_items_admin_all" ON fixed_cost_items 
  FOR ALL USING (is_admin());

-- Recipes
CREATE POLICY "recipes_select_authenticated" ON recipes 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "recipes_admin_all" ON recipes 
  FOR ALL USING (is_admin());

-- Production Runs
CREATE POLICY "production_runs_select_authenticated" ON production_runs 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "production_runs_admin_all" ON production_runs 
  FOR ALL USING (is_admin());

-- Inventory Lots
CREATE POLICY "inventory_lots_select_authenticated" ON inventory_lots 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "inventory_lots_admin_all" ON inventory_lots 
  FOR ALL USING (is_admin());

-- Purchase Orders
CREATE POLICY "purchase_orders_select_authenticated" ON purchase_orders 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchase_orders_admin_all" ON purchase_orders 
  FOR ALL USING (is_admin());

-- Purchase Order Lines
CREATE POLICY "purchase_order_lines_select_authenticated" ON purchase_order_lines 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchase_order_lines_admin_all" ON purchase_order_lines 
  FOR ALL USING (is_admin());

-- Staff
CREATE POLICY "staff_select_authenticated" ON staff 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_admin_all" ON staff 
  FOR ALL USING (is_admin());

-- Shifts
CREATE POLICY "shifts_select_authenticated" ON shifts 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "shifts_admin_all" ON shifts 
  FOR ALL USING (is_admin());

-- ============================================
-- SECTION 8: INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_inventory_lots_product ON inventory_lots(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_lots_location ON inventory_lots(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_lots_expiration ON inventory_lots(expiration_date);
CREATE INDEX IF NOT EXISTS idx_shifts_staff ON shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_shifts_location ON shifts(location_id);
CREATE INDEX IF NOT EXISTS idx_shifts_time ON shifts(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_production_runs_product ON production_runs(product_id);
CREATE INDEX IF NOT EXISTS idx_production_runs_location ON production_runs(location_id);
CREATE INDEX IF NOT EXISTS idx_recipes_product ON recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_ingredient ON recipes(ingredient_id);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
