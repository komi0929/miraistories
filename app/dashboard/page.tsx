import { createClient } from '@/lib/supabase/server'
import { DashboardOverview } from './dashboard-overview'

export default async function DashboardPage() {
    const supabase = await createClient()

    // Fetch summary counts for KPI dashboard
    const [
        { count: scenarioCount },
        { count: assetCount },
        { count: productCount },
        { count: staffCount },
        { count: locationCount },
        { data: recentShifts },
        { data: recentPOs },
    ] = await Promise.all([
        supabase.from('scenarios').select('*', { count: 'exact', head: true }),
        supabase.from('assets').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }).is('scenario_id', null),
        supabase.from('staff').select('*', { count: 'exact', head: true }),
        supabase.from('locations').select('*', { count: 'exact', head: true }),
        supabase.from('shifts').select('*').eq('status', 'draft').limit(5),
        supabase.from('purchase_orders').select('*').eq('status', 'draft').limit(5),
    ])

    return (
        <DashboardOverview
            kpis={{
                scenarios: scenarioCount || 0,
                assets: assetCount || 0,
                products: productCount || 0,
                staff: staffCount || 0,
                locations: locationCount || 0,
                draftShifts: recentShifts?.length || 0,
                draftPOs: recentPOs?.length || 0,
            }}
        />
    )
}
