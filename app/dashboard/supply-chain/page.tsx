import { createClient } from '@/lib/supabase/server'
import { SupplyChainClient } from './supply-chain-client'

export default async function SupplyChainPage() {
    const supabase = await createClient()

    // Fetch inventory lots with product and location info
    const { data: inventoryLots } = await supabase
        .from('inventory_lots')
        .select(`
            *,
            products:product_id (id, name, unit),
            locations:location_id (id, name, type)
        `)
        .is('scenario_id', null) // Only real inventory
        .order('expiration_date', { ascending: true })

    // Fetch purchase orders
    const { data: purchaseOrders } = await supabase
        .from('purchase_orders')
        .select('*')
        .is('scenario_id', null)
        .order('created_at', { ascending: false })

    // Fetch products for PO creation
    const { data: products } = await supabase
        .from('products')
        .select('*')
        .is('scenario_id', null)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">在庫・発注</h1>
                <p className="text-slate-600">
                    在庫ロット管理、賞味期限アラート、発注書管理を行います
                </p>
            </div>

            <SupplyChainClient
                initialInventoryLots={inventoryLots || []}
                initialPurchaseOrders={purchaseOrders || []}
                products={products || []}
            />
        </div>
    )
}
