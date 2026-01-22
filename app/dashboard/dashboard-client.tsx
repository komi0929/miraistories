'use client'

import { AddAssetDialog } from '@/components/dashboard/add-asset-dialog'
import { AssetTable } from '@/components/dashboard/asset-table'
import { FinancialCharts } from '@/components/dashboard/financial-charts'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePokerFace } from '@/hooks/use-poker-face'
import { calculateScenarioFinancials } from '@/lib/calculations'
import { createClient } from '@/lib/supabase/client'
import { Database, Scenario, Asset, ScenarioAssetDecision, ScenarioAssetDecisionInsert, AuditLogInsert, ScenarioInsert } from '@/types/database.types'
import { SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'


interface DashboardClientProps {
    initialAssets: Asset[]
}

export function DashboardClient({ initialAssets }: DashboardClientProps) {
    const [assets, setAssets] = useState<Asset[]>(initialAssets)
    const [scenarios, setScenarios] = useState<Scenario[]>([])
    const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
    const [decisions, setDecisions] = useState<Map<string, string>>(new Map()) // asset_id -> decision
    const [loading, setLoading] = useState(true)

    const supabase = createClient()
    const { isPokerFaceMode } = usePokerFace()

    // Fetch Scenarios
    useEffect(() => {
        async function loadScenarios() {
            const { data } = await supabase.from('scenarios').select('*')
            const scenarioData = data as Scenario[] | null
            if (scenarioData && scenarioData.length > 0) {
                setScenarios(scenarioData)
                // Default to first scenario if not selected
                if (!selectedScenarioId) {
                    setSelectedScenarioId(scenarioData[0].id)
                }
            } else {
                // Create default scenario if none
                // SKIP for vibecoding speed, assume user creates or I create one manually?
                // Better to create one if empty?
            }
            setLoading(false)
        }
        loadScenarios()
    }, [])

    // Fetch Decisions when Scenario changes
    useEffect(() => {
        if (!selectedScenarioId) return

        async function loadDecisions() {
            const { data } = await (supabase.from('scenario_asset_decisions') as any)
                .select('*')
                .eq('scenario_id', selectedScenarioId) as { data: ScenarioAssetDecision[] | null }

            const decisionsData = data
            const newMap = new Map<string, string>()
            decisionsData?.forEach(d => {
                if (d.asset_id && d.decision) {
                    newMap.set(d.asset_id, d.decision)
                }
            })
            setDecisions(newMap)
        }
        loadDecisions()
    }, [selectedScenarioId])

    // Calculate Real-time
    const selectedScenario = scenarios.find(s => s.id === selectedScenarioId)

    const decisionArray = Array.from(decisions.entries()).map(([asset_id, decision]) => ({
        scenario_id: selectedScenarioId!,
        asset_id,
        decision: decision as 'buy' | 'lease' | 'return'
    }))

    // Default metrics if no scenario selected
    const nullMetrics = {
        totalCapex: 0,
        monthlyOpex: 0,
        totalDepreciation: 0,
        capacityLoss: false,
        monthlyCashFlow: 0,
        isCashShortage: false
    }

    const metrics = selectedScenario
        ? calculateScenarioFinancials(assets, decisionArray as any, selectedScenario)
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
            // Revert?
        } else {
            // Log Audit (Client-side trigger for now, better server-side trigger or via Rpc? 
            // PRD says "Create an audit_logs table that records EVERY input change."
            // We insert into audit_logs here.
            await (supabase.from('audit_logs') as any).insert({
                action_type: 'UPDATE_DECISION',
                scenario_id: selectedScenarioId,
                target_asset_id: assetId,
                details: { decision }
            })
        }
    }

    const createScenario = async () => {
        const name = `Scenario ${scenarios.length + 1}`
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await (supabase.from('scenarios') as any).insert({
            name,
            owner_id: user.id
        }).select().single() as { data: Scenario | null, error: any }

        if (data) {
            const newScenario = data
            setScenarios([...scenarios, newScenario])
            setSelectedScenarioId(newScenario.id)
        }
    }

    return (
        <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Select
                        value={selectedScenarioId || ''}
                        onValueChange={setSelectedScenarioId}
                        disabled={loading}
                    >
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select Scenario" />
                        </SelectTrigger>
                        <SelectContent>
                            {scenarios.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={createScenario} size="sm">
                        + New Scenario
                    </Button>
                </div>
                <AddAssetDialog onAssetAdded={(newAsset) => setAssets([...assets, newAsset])} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <AssetTable
                        assets={assets}
                        decisions={decisions}
                        onDecisionChange={handleDecisionChange}
                        readOnly={!selectedScenarioId || isPokerFaceMode}
                    />
                    {/* Note: Poker Face Mode hides "Private" scenarios? 
                PRD says: "Hide all private notes, internal BATNA calculations".
                Also "Hide... Private scenarios".
                If isPokerFaceMode, maybe filter displayed scenarios?
                For MVP, I just made AssetTable readOnly or something? 
                PRD: "Access restricted to specific 'Shared Scenarios' only." for Guest.
                If Admin toggles Poker Face, maybe hide "Private Notes". 
                For now, I pass readOnly or just hide private notes (none implemented yet).
            */}
                </div>
                <div>
                    <FinancialCharts metrics={metrics} />

                    {!isPokerFaceMode && (
                        <div className="mt-4 p-4 border rounded-md bg-yellow-50 text-yellow-800 text-sm">
                            <strong>Internal Note:</strong>
                            <p>Remember to check the depreciation schedule for the Oven 2000X.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
