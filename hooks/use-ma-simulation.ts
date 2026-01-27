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
        startMonth: number
        durationMonths: number
        isFactoryFeeTarget: boolean
        [key: string]: any
    }[]
    factoryFeePercentage: number
}

interface SimulationResult {
    // 3年間の合計
    cumulativeSales: number
    cumulativeGrossProfit: number
    cumulativeFactoryFee: number
    cumulativeFixedCost: number
    cumulativeOperatingProfit: number // 3年間の累積営業利益
    
    // 判定用
    paybackMonths: number
    paybackYears: number
    isPaybackOk: boolean
    
    // ナビゲーション用
    requiredImprovementPerMonth: number // NG時に必要な月額改善額
    averageMonthlyOperatingProfit: number // 平均月額営業利益
    averageMonthlyFeeRevenue: number // 委託側（買い手）の平均月額受取フィー
}

export function useMaSimulation(data: InputData): SimulationResult {
    return useMemo(() => {
        const TOTAL_MONTHS = 36
        let cumulativeSales = 0
        let cumulativeFactoryFee = 0
        let cumulativeFixedCost = 0
        
        // 月次PL計算ループ (1ヶ月目〜36ヶ月目)
        for (let month = 1; month <= TOTAL_MONTHS; month++) {
            // 1. 月額売上（ベースライン + 案件）
            let monthlySales = 0
            
            if (data.salesStrategyMode === 'simple') {
                monthlySales = data.monthlySalesSimple
            } else {
                // 年数判定
                const yearIndex = Math.ceil(month / 12) // 1, 2, or 3
                const baseline = yearIndex === 1 ? data.yearlySalesBaseline.year1 
                            : yearIndex === 2 ? data.yearlySalesBaseline.year2 
                            : data.yearlySalesBaseline.year3
                
                // 期間内の案件を積算
                const dealsAmount = data.deals
                    .filter(d => {
                        const start = d.startMonth || 1
                        const end = start + (d.durationMonths || 12) - 1
                        return month >= start && month <= end
                    })
                    .reduce((sum, d) => sum + (d.monthlyAmount || 0), 0)
                
                monthlySales = (baseline || 0) + dealsAmount
            }
            
            // 2. 委託工場フィー（対象案件のみ）
            let feeTargetSales = 0
            if (data.salesStrategyMode === 'simple') {
                // 簡易モード: 全額対象と仮定するか0か仕様次第だが、ここでは0（詳細モード推奨）
                // ※ 本来は簡易モードでも率をかけるべきかもしれないが、案件単位制御ができないため
            } else {
                feeTargetSales = data.deals
                    .filter(d => {
                        const start = d.startMonth || 1
                        const end = start + (d.durationMonths || 12) - 1
                        return month >= start && month <= end && d.isFactoryFeeTarget
                    })
                    .reduce((sum, d) => sum + (d.monthlyAmount || 0), 0)
            }
            const monthlyFactoryFee = feeTargetSales * (data.factoryFeePercentage / 100)
            
            // 3. 固定費（月額）
            const laborCost = data.useDetailedExpenses 
                ? data.laborDetails.reduce((sum, i) => sum + (i.amount || 0), 0)
                : data.laborCostTotal
                
            const otherExpenses = data.useDetailedExpenses
                ? data.leaseDetails.reduce((sum, i) => sum + (i.amount || 0), 0)
                : data.otherExpensesTotal
    
            const monthlyFixed = (data.rent || 0) + (data.utilities || 0) + laborCost + otherExpenses

            // 累積加算
            cumulativeSales += monthlySales
            cumulativeFactoryFee += monthlyFactoryFee
            cumulativeFixedCost += monthlyFixed
        }

        // 4. 累積粗利 & 累積営業利益
        // 粗利 = 売上 * (1 - 原価率)
        const cumulativeGrossProfit = cumulativeSales * (1 - data.costRatio / 100)
        
        // 営業利益 = 粗利 - 委託フィー - 固定費
        const cumulativeOperatingProfit = cumulativeGrossProfit - cumulativeFactoryFee - cumulativeFixedCost
        
        // 5. 投資回収判定
        // 回収に必要な利益 = 初期投資(スケルトン)
        // 回収完了月を簡易的に計算: (初期投資 / 平均月利)
        // ※ 厳密には月次キャッシュフローの累積で判定すべきだが、表示用には「平均」で割る方が直感的
        
        const averageMonthlyOperatingProfit = cumulativeOperatingProfit / TOTAL_MONTHS
        const averageMonthlyFeeRevenue = cumulativeFactoryFee / TOTAL_MONTHS
        
        let paybackMonths = Infinity
        if (averageMonthlyOperatingProfit > 0) {
            paybackMonths = data.skeletonCost / averageMonthlyOperatingProfit
        }

        const paybackYears = paybackMonths === Infinity ? Infinity : paybackMonths / 12
        const isPaybackOk = cumulativeOperatingProfit >= data.skeletonCost

        // 6. 改善必要額 (NGの場合)
        // (初期投資 - 累積利益) / 36ヶ月
        let requiredImprovementPerMonth = 0
        if (!isPaybackOk) {
            const shortage = data.skeletonCost - cumulativeOperatingProfit
            requiredImprovementPerMonth = shortage / TOTAL_MONTHS
        }

        return {
            cumulativeSales,
            cumulativeGrossProfit,
            cumulativeFactoryFee,
            cumulativeFixedCost,
            cumulativeOperatingProfit,
            paybackMonths,
            paybackYears,
            isPaybackOk,
            requiredImprovementPerMonth,
            averageMonthlyOperatingProfit,
            averageMonthlyFeeRevenue
        }
    }, [data])
}

