import { useMemo } from 'react'

// フォームデータの型定義（クライアントコンポーネントと同期）
interface InputData {
    skeletonCost: number
    rent: number
    utilities: number
    laborCostTotal: number
    laborDetails: any[]
    otherExpensesTotal: number
    leaseDetails: any[]
    useDetailedExpenses: boolean
    costRatio: number
    salesStrategyMode: 'simple' | 'detailed'
    monthlySalesSimple: number
    yearlySalesBaseline: { year1: number; year2: number; year3: number }
    deals: {
        id: string
        monthlyAmount: number
        isFactoryFeeTarget: boolean
        [key: string]: any
    }[]
    factoryFeePercentage: number
}

interface SimulationResult {
    monthlySales: number
    monthlyGrossProfit: number
    monthlyFactoryFee: number
    monthlyFixedCost: number
    monthlyOperatingProfit: number
    paybackMonths: number
    paybackYears: number
    isPaybackOk: boolean
}

export function useMaSimulation(data: InputData): SimulationResult {
    return useMemo(() => {
        // 1. 月額売上の算出
        let monthlySales = 0
        
        if (data.salesStrategyMode === 'simple') {
            monthlySales = data.monthlySalesSimple
        } else {
            // 詳細モード: 1期目のベースライン + 全案件の月額（簡易計算として全案件積上げ）
            // ※ 厳密なタイムライン計算ではなく、ポテンシャル（最大月商）としての試算
            const dealsTotal = data.deals.reduce((sum, deal) => sum + (deal.monthlyAmount || 0), 0)
            monthlySales = (data.yearlySalesBaseline.year1 || 0) + dealsTotal
        }

        // 2. 委託工場フィー流出額
        // 対象案件の売上合計 × 料率
        let factoryFeeTargetSales = 0
        if (data.salesStrategyMode === 'simple') {
            // 簡易モードでは対象案件の概念がないため0（または全体にかける？仕様不明だが一旦0）
            // ※ 基本的にフィー設定時は詳細モード推奨だが、ここでは案件ベースで計算
        } else {
            factoryFeeTargetSales = data.deals
                .filter(d => d.isFactoryFeeTarget)
                .reduce((sum, d) => sum + (d.monthlyAmount || 0), 0)
        }
        
        const monthlyFactoryFee = factoryFeeTargetSales * (data.factoryFeePercentage / 100)

        // 3. 月額粗利
        // (売上 - 委託フィー) * (1 - 原価率) ではなく、仕様通り:
        // 「月額粗利: 全案件の月額売上合計 × (100 - 原価率) / 100」
        // ※ ただし、フィーは「流出額」として営業利益計算で引く指示
        const monthlyGrossProfit = monthlySales * (1 - data.costRatio / 100)

        // 4. 月額固定費
        const laborCost = data.useDetailedExpenses 
            ? data.laborDetails.reduce((sum, i) => sum + (i.amount || 0), 0)
            : data.laborCostTotal
            
        const otherExpenses = data.useDetailedExpenses
            ? data.leaseDetails.reduce((sum, i) => sum + (i.amount || 0), 0)
            : data.otherExpensesTotal

        const monthlyFixedCost = (data.rent || 0) + (data.utilities || 0) + laborCost + otherExpenses

        // 5. 月額営業利益
        // 月額粗利 - 委託フィー流出額 - 月額固定費
        const monthlyOperatingProfit = monthlyGrossProfit - monthlyFactoryFee - monthlyFixedCost

        // 6. 投資回収期間(月)
        // スケルトン工事費用 ÷ 月額営業利益
        let paybackMonths = Infinity
        if (monthlyOperatingProfit > 0) {
            paybackMonths = data.skeletonCost / monthlyOperatingProfit
        }

        const paybackYears = paybackMonths === Infinity ? Infinity : paybackMonths / 12
        const isPaybackOk = paybackMonths <= 36

        return {
            monthlySales,
            monthlyGrossProfit,
            monthlyFactoryFee,
            monthlyFixedCost,
            monthlyOperatingProfit,
            paybackMonths,
            paybackYears,
            isPaybackOk
        }
    }, [data])
}
