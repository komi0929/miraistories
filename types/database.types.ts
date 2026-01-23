export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            // ============================================
            // CORE TABLES (Phase 1)
            // ============================================
            profiles: {
                Row: {
                    id: string
                    role: 'admin' | 'guest'
                    full_name: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    role: 'admin' | 'guest'
                    full_name?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    role?: 'admin' | 'guest'
                    full_name?: string | null
                    created_at?: string
                }
            }
            scenarios: {
                Row: {
                    id: string
                    name: string
                    owner_id: string
                    is_shared: boolean
                    external_sales_retention_pct: number
                    labor_cost_reduction_target_pct: number
                    type: 'merger_deal' | 'budget_plan' | 'operational_plan'
                    parent_scenario_id: string | null
                    status: 'draft' | 'active' | 'archived'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    owner_id: string
                    is_shared?: boolean
                    external_sales_retention_pct?: number
                    labor_cost_reduction_target_pct?: number
                    type?: 'merger_deal' | 'budget_plan' | 'operational_plan'
                    parent_scenario_id?: string | null
                    status?: 'draft' | 'active' | 'archived'
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    owner_id?: string
                    is_shared?: boolean
                    external_sales_retention_pct?: number
                    labor_cost_reduction_target_pct?: number
                    type?: 'merger_deal' | 'budget_plan' | 'operational_plan'
                    parent_scenario_id?: string | null
                    status?: 'draft' | 'active' | 'archived'
                    created_at?: string
                    updated_at?: string
                }
            }
            assets: {
                Row: {
                    id: string
                    name: string
                    category: string | null
                    book_value: number
                    ask_price: number
                    lease_monthly_cost: number
                    location_id: string | null
                    production_capacity_per_hour: number
                    depreciation_years: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    category?: string | null
                    book_value?: number
                    ask_price?: number
                    lease_monthly_cost?: number
                    location_id?: string | null
                    production_capacity_per_hour?: number
                    depreciation_years?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    category?: string | null
                    book_value?: number
                    ask_price?: number
                    lease_monthly_cost?: number
                    location_id?: string | null
                    production_capacity_per_hour?: number
                    depreciation_years?: number
                    created_at?: string
                }
            }
            scenario_asset_decisions: {
                Row: {
                    scenario_id: string
                    asset_id: string
                    decision: 'buy' | 'lease' | 'return' | 'dispose' | null
                }
                Insert: {
                    scenario_id: string
                    asset_id: string
                    decision?: 'buy' | 'lease' | 'return' | 'dispose' | null
                }
                Update: {
                    scenario_id?: string
                    asset_id?: string
                    decision?: 'buy' | 'lease' | 'return' | 'dispose' | null
                }
            }
            audit_logs: {
                Row: {
                    id: number
                    user_id: string | null
                    scenario_id: string | null
                    target_asset_id: string | null
                    action_type: string
                    details: Json | null
                    created_at: string
                }
                Insert: {
                    id?: number
                    user_id?: string | null
                    scenario_id?: string | null
                    target_asset_id?: string | null
                    action_type: string
                    details?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    user_id?: string | null
                    scenario_id?: string | null
                    target_asset_id?: string | null
                    action_type?: string
                    details?: Json | null
                    created_at?: string
                }
            }

            // ============================================
            // ORGANIZATIONAL TABLES (Phase 2)
            // ============================================
            locations: {
                Row: {
                    id: string
                    name: string
                    type: 'factory' | 'store' | 'warehouse'
                    is_internal: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    type: 'factory' | 'store' | 'warehouse'
                    is_internal?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    type?: 'factory' | 'store' | 'warehouse'
                    is_internal?: boolean
                    created_at?: string
                }
            }
            fixed_cost_items: {
                Row: {
                    id: string
                    location_id: string | null
                    name: string
                    monthly_amount: number
                    stickiness_factor: number
                    scenario_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    location_id?: string | null
                    name: string
                    monthly_amount: number
                    stickiness_factor?: number
                    scenario_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    location_id?: string | null
                    name?: string
                    monthly_amount?: number
                    stickiness_factor?: number
                    scenario_id?: string | null
                    created_at?: string
                }
            }

            // ============================================
            // PRODUCTS & MANUFACTURING (Phase 2)
            // ============================================
            products: {
                Row: {
                    id: string
                    name: string
                    type: 'raw_material' | 'intermediate' | 'product' | null
                    unit: string
                    standard_cost: number
                    scenario_id: string | null
                    // Legacy fields from Phase 1
                    cost_material: number | null
                    cost_labor_minutes: number | null
                    is_composite: boolean | null
                    safety_stock: number
                    lot_size: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    type?: 'raw_material' | 'intermediate' | 'product' | null
                    unit?: string
                    standard_cost?: number
                    scenario_id?: string | null
                    cost_material?: number | null
                    cost_labor_minutes?: number | null
                    is_composite?: boolean | null
                    safety_stock?: number
                    lot_size?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    type?: 'raw_material' | 'intermediate' | 'product' | null
                    unit?: string
                    standard_cost?: number
                    scenario_id?: string | null
                    cost_material?: number | null
                    cost_labor_minutes?: number | null
                    is_composite?: boolean | null
                    safety_stock?: number
                    lot_size?: number
                    created_at?: string
                }
            }
            recipes: {
                Row: {
                    id: string
                    product_id: string
                    ingredient_id: string
                    quantity_required: number
                    loss_rate: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    product_id: string
                    ingredient_id: string
                    quantity_required: number
                    loss_rate?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    product_id?: string
                    ingredient_id?: string
                    quantity_required?: number
                    loss_rate?: number
                    created_at?: string
                }
            }
            production_runs: {
                Row: {
                    id: string
                    product_id: string
                    location_id: string
                    produced_quantity: number
                    waste_quantity: number
                    waste_reason: string | null
                    staff_id: string | null
                    scenario_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    product_id: string
                    location_id: string
                    produced_quantity: number
                    waste_quantity?: number
                    waste_reason?: string | null
                    staff_id?: string | null
                    scenario_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    product_id?: string
                    location_id?: string
                    produced_quantity?: number
                    waste_quantity?: number
                    waste_reason?: string | null
                    staff_id?: string | null
                    scenario_id?: string | null
                    created_at?: string
                }
            }

            // ============================================
            // SUPPLY CHAIN (Phase 2)
            // ============================================
            inventory_lots: {
                Row: {
                    id: string
                    product_id: string
                    location_id: string
                    quantity: number
                    expiration_date: string | null
                    scenario_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    product_id: string
                    location_id: string
                    quantity: number
                    expiration_date?: string | null
                    scenario_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    product_id?: string
                    location_id?: string
                    quantity?: number
                    expiration_date?: string | null
                    scenario_id?: string | null
                    created_at?: string
                }
            }
            purchase_orders: {
                Row: {
                    id: string
                    supplier_name: string | null
                    status: 'draft' | 'ordered' | 'received'
                    total_amount: number
                    notes: string | null
                    scenario_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    supplier_name?: string | null
                    status?: 'draft' | 'ordered' | 'received'
                    total_amount?: number
                    notes?: string | null
                    scenario_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    supplier_name?: string | null
                    status?: 'draft' | 'ordered' | 'received'
                    total_amount?: number
                    notes?: string | null
                    scenario_id?: string | null
                    created_at?: string
                }
            }
            purchase_order_lines: {
                Row: {
                    id: string
                    purchase_order_id: string
                    product_id: string
                    quantity: number
                    unit_price: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    purchase_order_id: string
                    product_id: string
                    quantity: number
                    unit_price: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    purchase_order_id?: string
                    product_id?: string
                    quantity?: number
                    unit_price?: number
                    created_at?: string
                }
            }

            // ============================================
            // HR & SHIFTS (Phase 2)
            // ============================================
            staff: {
                Row: {
                    id: string
                    full_name: string
                    hourly_wage: number
                    skills: string[]
                    default_location_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    full_name: string
                    hourly_wage: number
                    skills?: string[]
                    default_location_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    full_name?: string
                    hourly_wage?: number
                    skills?: string[]
                    default_location_id?: string | null
                    created_at?: string
                }
            }
            shifts: {
                Row: {
                    id: string
                    staff_id: string
                    location_id: string
                    start_time: string
                    end_time: string
                    role_assigned: string | null
                    status: 'draft' | 'published' | 'completed'
                    scenario_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    staff_id: string
                    location_id: string
                    start_time: string
                    end_time: string
                    role_assigned?: string | null
                    status?: 'draft' | 'published' | 'completed'
                    scenario_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    staff_id?: string
                    location_id?: string
                    start_time?: string
                    end_time?: string
                    role_assigned?: string | null
                    status?: 'draft' | 'published' | 'completed'
                    scenario_id?: string | null
                    created_at?: string
                }
            }
            // ============================================
            // M&A SIMULATIONS (Phase 2 Addon)
            // ============================================
            ma_simulations: {
                Row: {
                    id: string
                    user_id: string
                    title: string
                    simulation_data: Json
                    created_at: string
                    is_favorite: boolean
                }
                Insert: {
                    id?: string
                    user_id?: string
                    title: string
                    simulation_data: Json
                    created_at?: string
                    is_favorite?: boolean
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string
                    simulation_data?: Json
                    created_at?: string
                    is_favorite?: boolean
                }
                Relationships: []
            }
        }
        Functions: {
            is_admin: {
                Args: Record<string, never>
                Returns: boolean
            }
        }
        Views: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

// ============================================
// CONVENIENCE TYPE ALIASES
// ============================================

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Scenario = Database['public']['Tables']['scenarios']['Row']
export type Asset = Database['public']['Tables']['assets']['Row']
export type ScenarioAssetDecision = Database['public']['Tables']['scenario_asset_decisions']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type Location = Database['public']['Tables']['locations']['Row']
export type FixedCostItem = Database['public']['Tables']['fixed_cost_items']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Recipe = Database['public']['Tables']['recipes']['Row']
export type ProductionRun = Database['public']['Tables']['production_runs']['Row']
export type InventoryLot = Database['public']['Tables']['inventory_lots']['Row']
export type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row']
export type PurchaseOrderLine = Database['public']['Tables']['purchase_order_lines']['Row']
export type Staff = Database['public']['Tables']['staff']['Row']
export type Shift = Database['public']['Tables']['shifts']['Row']

// Insert types
export type LocationInsert = Database['public']['Tables']['locations']['Insert']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type StaffInsert = Database['public']['Tables']['staff']['Insert']
export type ShiftInsert = Database['public']['Tables']['shifts']['Insert']
export type RecipeInsert = Database['public']['Tables']['recipes']['Insert']
export type ProductionRunInsert = Database['public']['Tables']['production_runs']['Insert']
export type InventoryLotInsert = Database['public']['Tables']['inventory_lots']['Insert']
export type PurchaseOrderInsert = Database['public']['Tables']['purchase_orders']['Insert']
export type PurchaseOrderLineInsert = Database['public']['Tables']['purchase_order_lines']['Insert']

// Phase 1 Insert types (for type-safe inserts)
export type AssetInsert = Database['public']['Tables']['assets']['Insert']
export type ScenarioInsert = Database['public']['Tables']['scenarios']['Insert']
export type ScenarioAssetDecisionInsert = Database['public']['Tables']['scenario_asset_decisions']['Insert']
export type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']
