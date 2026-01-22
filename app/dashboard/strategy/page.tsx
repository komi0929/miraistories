import { createClient } from '@/lib/supabase/server'
import { StrategyClient } from './strategy-client'

export default async function StrategyPage() {
    const supabase = await createClient()

    // Fetch scenarios and assets for M&A simulation
    const { data: scenarios } = await supabase
        .from('scenarios')
        .select('*')
        .order('created_at', { ascending: false })

    const { data: assets } = await supabase
        .from('assets')
        .select('*')
        .order('name')

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">経営・M&A</h1>
                <p className="text-slate-600">
                    資産交渉、シナリオ分析、カーブアウト試算を行います
                </p>
            </div>

            <StrategyClient
                initialScenarios={scenarios || []}
                initialAssets={assets || []}
            />
        </div>
    )
}
