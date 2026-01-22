'use client'

import { AddAssetDialog } from '@/components/dashboard/add-asset-dialog'
import { AssetTable } from '@/components/dashboard/asset-table'
import { FinancialCharts } from '@/components/dashboard/financial-charts'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePokerFace } from '@/hooks/use-poker-face'
import { calculateScenarioFinancials } from '@/lib/calculations'
import { createClient } from '@/lib/supabase/client'
import { Asset, Scenario, ScenarioAssetDecision, ScenarioAssetDecisionInsert, AuditLogInsert, ScenarioInsert } from '@/types/database.types'
import { useEffect, useState } from 'react'

interface StrategyClientProps {
    initialScenarios: Scenario[]
    initialAssets: Asset[]
}

export function StrategyClient({ initialScenarios, initialAssets }: StrategyClientProps) {
    const [assets, setAssets] = useState<Asset[]>(initialAssets)
    const [scenarios, setScenarios] = useState<Scenario[]>(initialScenarios)
    const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
        initialScenarios[0]?.id || null
    )
    const [decisions, setDecisions] = useState<Map<string, string>>(new Map())
    const [loading, setLoading] = useState(false)

    const supabase = createClient()
    const { isPokerFaceMode } = usePokerFace()

    // Fetch Decisions when Scenario changes
    useEffect(() => {
        if (!selectedScenarioId) return

        async function loadDecisions() {
            setLoading(true)
            const { data } = await (supabase.from('scenario_asset_decisions') as any)
                .select('*')
                .eq('scenario_id', selectedScenarioId) as { data: ScenarioAssetDecision[] | null }

            const decisionsData = data
            const newMap = new Map<string, string>()
            decisionsData?.forEach((d) => {
                if (d.asset_id && d.decision) {
                    newMap.set(d.asset_id, d.decision)
                }
            })
            setDecisions(newMap)
            setLoading(false)
        }
        loadDecisions()
    }, [selectedScenarioId])

    // Calculate Real-time
    const selectedScenario = scenarios.find(s => s.id === selectedScenarioId)

    const decisionArray = Array.from(decisions.entries()).map(([asset_id, decision]) => ({
        scenario_id: selectedScenarioId!,
        asset_id,
        decision: decision as 'buy' | 'lease' | 'return' | 'dispose' | null
    }))

    const nullMetrics = {
        totalCapex: 0,
        monthlyOpex: 0,
        totalDepreciation: 0,
        capacityLoss: false,
        monthlyCashFlow: 0,
        isCashShortage: false
    }

    const metrics = selectedScenario
        ? calculateScenarioFinancials(assets, decisionArray, selectedScenario)
        : nullMetrics

    const handleDecisionChange = async (assetId: string, decision: 'buy' | 'lease' | 'return') => {
        if (!selectedScenarioId) return

        // Optimistic Update
        const newDecisions = new Map(decisions)
        newDecisions.set(assetId, decision)
        setDecisions(newDecisions)

        // Save to DB
        const { error } = await (supabase.from('scenario_asset_decisions') as any).upsert({
            scenario_id: selectedScenarioId,
            asset_id: assetId,
            decision: decision
        })

        if (error) {
            console.error('Failed to save decision', error)
        } else {
            // Log Audit
            await (supabase.from('audit_logs') as any).insert({
                action_type: 'UPDATE_DECISION',
                scenario_id: selectedScenarioId,
                target_asset_id: assetId,
                details: { decision }
            })
        }
    }

    const createScenario = async () => {
        const name = `シナリオ ${scenarios.length + 1}`
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await (supabase.from('scenarios') as any).insert({
            name,
            owner_id: user.id,
            type: 'merger_deal'
        }).select().single() as { data: Scenario | null, error: any }

        if (data) {
            setScenarios([data, ...scenarios])
            setSelectedScenarioId(data.id)
        }
    }

    return (
        <div className="flex flex-col space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center space-x-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-500 mb-1">シナリオ選択</span>
                        <Select
                            value={selectedScenarioId || ''}
                            onValueChange={setSelectedScenarioId}
                            disabled={loading}
                        >
                            <SelectTrigger className="w-[250px]">
                                <SelectValue placeholder="シナリオを選択" />
                            </SelectTrigger>
                            <SelectContent>
                                {scenarios.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name}
                                        {s.is_shared && (
                                            <span className="ml-2 text-xs text-blue-500">[共有]</span>
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button variant="outline" onClick={createScenario} size="sm">
                        + 新規シナリオ
                    </Button>
                </div>
                <AddAssetDialog onAssetAdded={(newAsset) => setAssets([...assets, newAsset])} />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b bg-slate-50">
                            <h2 className="font-semibold text-slate-900">資産一覧</h2>
                        </div>
                        <AssetTable
                            assets={assets}
                            decisions={decisions}
                            onDecisionChange={handleDecisionChange}
                            readOnly={!selectedScenarioId || isPokerFaceMode}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-white rounded-lg border shadow-sm p-4">
                        <h2 className="font-semibold text-slate-900 mb-4">財務シミュレーション</h2>
                        <FinancialCharts metrics={metrics} />
                    </div>

                    {/* Private Notes - Hidden in Poker Face Mode */}
                    {!isPokerFaceMode && (
                        <div className="p-4 border rounded-lg bg-amber-50 border-amber-200 text-amber-800 text-sm">
                            <strong>内部メモ:</strong>
                            <p className="mt-1">
                                オーブン2000Xの減価償却スケジュールを確認すること。
                                競合他社の入札状況に注意。
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
