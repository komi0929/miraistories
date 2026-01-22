import { createClient } from '@/lib/supabase/server'
import { ProductionClient } from './production-client'

export default async function ProductionPage() {
    const supabase = await createClient()

    // Fetch products
    const { data: products } = await supabase
        .from('products')
        .select('*')
        .is('scenario_id', null) // Only real products, not simulation
        .order('name')

    // Fetch locations (factories only)
    const { data: locations } = await supabase
        .from('locations')
        .select('*')
        .eq('type', 'factory')
        .order('name')

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">商品・製造</h1>
                <p className="text-slate-600">
                    商品マスタ、レシピ（BOM）、製造記録を管理します
                </p>
            </div>

            <ProductionClient
                initialProducts={products || []}
                initialLocations={locations || []}
            />
        </div>
    )
}
