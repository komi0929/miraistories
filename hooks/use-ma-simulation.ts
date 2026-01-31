import { useMemo } from 'react'
import { calculatePayback, SimulationData } from '@/lib/ma-simulation'
import { ExpenseItem, SalesDeal } from '@/types/ma-types'

export type SimulationResult = {
    monthlyData: {
        month: number
        sales: number
        profit: number
        cumulativeProfit: number
        isRecovery: boolean
    }[]
    summary: {
        totalSales: number
        totalOperatingProfit: number
        finalCash: number
        paybackMonths: number | null // null = 回収不能
        profitMargin: number
        roi: number
    }
    isPaybackOk: boolean
    paybackYears: number
    alerts: string[]
    targetGap: number | null

    // Legacy Compatibility Fields
    cumulativeOperatingProfit: number
    requiredImprovementPerMonth: number
    averageMonthlyOperatingProfit: number
    averageMonthlyFeeRevenue: number
}

// フォームデータの型定義（クライアントコンポーネントと同期）
export interface InputData {
    desiredTransferPrice: number
    skeletonCost: number
    rent: number
    utilities: number
    laborCostTotal: number
    laborDetails: ExpenseItem[]
    otherExpensesTotal: number
    leaseDetails: (ExpenseItem & { paymentRemainingMonths?: number })[]
    useDetailedExpenses: boolean
    maxCapacitySales: number
    costRatio: number
    salesStrategyMode: 'simple' | 'detailed'
    monthlySalesSimple: number
    yearlySalesBaseline: { year1: number; year2: number; year3: number }
    deals: SalesDeal[]
    factoryFeePercentage: number
}

export const useMaSimulation = (data: InputData): SimulationResult => {
    return useMemo(() => {
        // InputData を SimulationData に変換
        // 型互換性のため、必要なフィールドをマッピング
        const simData: SimulationData = {
            ...data,
            // 数字型のフィールドでNaNやundefinedが来ないようにガード
            acquisitionCost: data.desiredTransferPrice || 0,
            renovationCost: 0, // 収集フォームでは初期改装費の入力がないため0固定（スケルトン費用は別）
            // skeletonCostはそのまま
            // leaseDetailsの型は互換性あり（paymentRemainingMonthsはSimulationData側でもサポート済）
            deals: data.deals || [],
            maxCapacitySales: data.maxCapacitySales || 0
        }

        const result = calculatePayback(simData)

        // Resultのマッピング
        // SimulationResultの型はほぼ同じだが、構造を合わせる
        return {
            monthlyData: result.monthlyData.map(d => ({
                month: d.month,
                sales: d.sales,
                profit: d.operatingProfit, // Hookではprofitと呼んでいる
                cumulativeProfit: d.cashFlow, // HookではcumulativeProfitと呼んでいる（実態はCashFlow）
                isRecovery: d.cashFlow >= result.totalInvestment
            })),
            summary: result.summary!,
            isPaybackOk: result.canRecoverIn3Years,
            paybackYears: result.paybackYears!,
            alerts: result.alerts || [],
            targetGap: result.targetGap || null,
            
            // Legacy
            cumulativeOperatingProfit: result.cumulativeOperatingProfit!,
            requiredImprovementPerMonth: result.requiredImprovementPerMonth!,
            averageMonthlyOperatingProfit: result.averageMonthlyOperatingProfit!,
            averageMonthlyFeeRevenue: result.averageMonthlyFeeRevenue!
        }
    }, [
        data.desiredTransferPrice,
        data.skeletonCost,
        data.rent,
        data.utilities,
        data.laborCostTotal,
        data.laborDetails,
        data.otherExpensesTotal,
        data.leaseDetails,
        data.useDetailedExpenses,
        data.maxCapacitySales,
        data.costRatio,
        data.salesStrategyMode,
        data.monthlySalesSimple,
        data.yearlySalesBaseline,
        data.deals,
        data.factoryFeePercentage
    ])
}
