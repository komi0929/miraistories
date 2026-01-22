import { createClient } from '@/lib/supabase/server'
import { HRClient } from './hr-client'

export default async function HRPage() {
    const supabase = await createClient()

    // Fetch staff
    const { data: staff } = await supabase
        .from('staff')
        .select('*')
        .order('full_name')

    // Fetch shifts with staff and location info
    const { data: shifts } = await supabase
        .from('shifts')
        .select(`
            *,
            staff:staff_id (id, full_name, hourly_wage),
            locations:location_id (id, name)
        `)
        .is('scenario_id', null)
        .order('start_time', { ascending: true })

    // Fetch locations
    const { data: locations } = await supabase
        .from('locations')
        .select('*')
        .order('name')

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">人事・シフト</h1>
                <p className="text-slate-600">
                    従業員マスタ、シフト管理、AI自動スケジューリングを行います
                </p>
            </div>

            <HRClient
                initialStaff={staff || []}
                initialShifts={shifts || []}
                locations={locations || []}
            />
        </div>
    )
}
