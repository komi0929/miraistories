import { Database } from '@/types/database.types'

type Asset = Database['public']['Tables']['assets']['Row']
type Decision = Database['public']['Tables']['scenario_asset_decisions']['Row']
type Scenario = Database['public']['Tables']['scenarios']['Row']

export interface FinancialResult {
    totalCapex: number
    monthlyOpex: number
    totalDepreciation: number
    capacityLoss: boolean // Simplified: just a flag if any returns happen
    monthlyCashFlow: number
    isCashShortage: boolean
}

// Mock constants for MVP simulation if real data is missing
const BASE_MONTHLY_REVENUE = 10000000 // 10M JPY
const BASE_MONTHLY_FIXED_COST = 5000000 // 5M JPY (Labor, Rent, etc.)

export function calculateScenarioFinancials(
    assets: Asset[],
    decisions: Decision[],
    scenario: Scenario
): FinancialResult {
    let totalCapex = 0
    let monthlyOpex = 0 // Variable logic: Leasing increases this
    let totalDepreciation = 0
    let capacityLoss = false

    const decisionMap = new Map<string, string | null>()
    decisions.forEach((d) => decisionMap.set(d.asset_id, d.decision))

    for (const asset of assets) {
        const decision = decisionMap.get(asset.id)

        // Default behavior if no decision? Assume 'status quo'.
        // If 'buy' -> CAPEX
        // If 'lease' -> OPEX

        if (decision === 'buy') {
            totalCapex += asset.ask_price
            // 5 years straight line depreciation
            totalDepreciation += asset.ask_price / 60
        } else if (decision === 'lease') {
            monthlyOpex += asset.lease_monthly_cost
        } else if (decision === 'return') {
            capacityLoss = true
        }
    }

    // Carve-out Logic: 
    // If retention pct < 100, we lose sales, but maybe fixed costs don't drop as fast?
    // "Fixed Cost per Unit must increase" -> actually usually means total fixed cost stays same while volume drops.
    // Let's implement:
    // Retained Sales = BASE * (retention_pct / 100)

    // Safety check for null/undefined
    const retentionPct = scenario.external_sales_retention_pct ?? 100
    const salesFactor = retentionPct / 100

    const retainedMonthlySales = BASE_MONTHLY_REVENUE * salesFactor

    // Total Monthly Outflow = Base Fixed Cost + New Lease Opex + (Maybe labor cost impact?)
    // Scenario has labor_cost_reduction_target_pct. 
    // Let's apply labor reduction to Base Fixed Cost for simplicity.
    const laborReductionPct = scenario.labor_cost_reduction_target_pct ?? 0
    const laborFactor = 1 - (laborReductionPct / 100)

    // Assuming Base Fixed Cost is 100% labor/overhead for this MVP model
    const adjustedFixedCost = BASE_MONTHLY_FIXED_COST * laborFactor

    const totalMonthlyOutflow = adjustedFixedCost + monthlyOpex

    const monthlyCashFlow = retainedMonthlySales - totalMonthlyOutflow
    const isCashShortage = monthlyCashFlow < 0

    return {
        totalCapex,
        monthlyOpex,
        totalDepreciation,
        capacityLoss,
        monthlyCashFlow,
        isCashShortage
    }
}
