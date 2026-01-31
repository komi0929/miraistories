// M&A シミュレーション用型定義と計算ロジック（クライアント用）

export interface ExpenseItem {
    id: string
    name: string
    amount: number
    paymentRemainingMonths?: number // リース等の支払残期間（指定月数後に0円になる）
}

// 案件（積み上げ売上）
// Note: 収集データと互換性を持たせるため、probability型を拡張
export interface SalesDeal {
    id: string
    name: string
    monthlyAmount: number
    startMonth: number // 1~36
    durationMonths?: number // オプショナル（未指定=永続）
    probability: 'fixed' | 'high' | 'target' | 'medium' | 'low' // 収集側: fixed/high/target, 旧: high/medium/low
    isFactoryFeeTarget?: boolean // 委託工場フィー対象か（対象の場合、売上からフィーを差し引く）
}

export interface SimulationData {
    // 初期投資
    acquisitionCost: number  // 譲渡価格
    renovationCost: number   // 初期改装費
    skeletonCost: number     // スケルトン費用（退去時）

    // 販管費（月額）
    useDetailedExpenses: boolean // 詳細入力モードか
    rent: number             // 家賃（固定）
    utilities: number        // 光熱費（簡易入力）
    laborCostTotal: number   // 人件費（簡易入力）
    laborDetails: ExpenseItem[] // 人件費明細
    otherExpensesTotal: number // その他経費（簡易入力）
    leaseDetails: ExpenseItem[] // リース・その他経費明細

    // 売上見込み
    costRatio: number        // 原価率（%）

    // 売上戦略
    salesStrategyMode: 'simple' | 'detailed'
    monthlySalesSimple: number // 簡易入力用
    yearlySalesBaseline: {
        year1: number
        year2: number
        year3: number
    }
    deals: SalesDeal[]
    
    // アラート用設定
    maxCapacitySales?: number // 人員キャパシティ上限（0=無制限）

    // シミュレーション設定
    probabilityFilter: 'all' | 'high_only' | 'weighted'

    // 委託工場フィー（相手からの収集データ用）
    factoryFeePercentage?: number // 委託工場フィー率（%）
}

export interface SimulationResult {
    // 計算結果
    monthlyGrossProfit: number      // 直近月（または平均）の粗利
    monthlyOperatingProfit: number  // 直近月（または平均）の営業利益
    annualCashFlow: number          // 初年度CF
    totalInvestment: number         // 総投資額
    paybackMonths: number           // 回収期間（月）
    canRecoverIn3Years: boolean     // 3年回収可能か

    // 月別データ（36ヶ月分）
    monthlyData: {
        month: number
        sales: number
        grossProfit: number
        expenses: number
        operatingProfit: number
        cashFlow: number // 累積CF
        factoryFee: number // 委託工場フィー
    }[]

    // 累積CF（グラフ用配列）
    cumulativeCashFlow: number[]

    // --- Extended Fields (For Client UI Compat) ---
    summary?: {
        totalSales: number
        totalOperatingProfit: number
        finalCash: number
        paybackMonths: number | null
        profitMargin: number
        roi: number
    }
    isPaybackOk?: boolean
    paybackYears?: number
    alerts?: string[]
    targetGap?: number | null
    
    // Legacy support
    cumulativeOperatingProfit?: number
    requiredImprovementPerMonth?: number
    averageMonthlyOperatingProfit?: number
    averageMonthlyFeeRevenue?: number
}

/**
 * 投資回収シミュレーション計算
 */
export function calculatePayback(data: SimulationData): SimulationResult {
    // 1. 初期投資
    const totalInvestment = data.acquisitionCost + data.renovationCost + data.skeletonCost



    // 3. 36ヶ月シミュレーション
    const monthlyData: SimulationResult['monthlyData'] = []
    const cumulativeCashFlow: number[] = []
    let cumulative = -totalInvestment
    let firstYearOperatingProfit = 0
    let cumulativeSales = 0
    let cumulativeFactoryFee = 0

    // アラート管理
    let capacityAlertTriggered = false
    let lowLaborCostAlertTriggered = false
    
    // 有効な案件（確度: Fixed or High）のみで計算
    const validDeals = (data.deals || []).filter(d => d.probability === 'fixed' || d.probability === 'high')
    // Target案件（ギャップ計算用）
    const targetDeals = (data.deals || []).filter(d => d.probability === 'target')

    for (let month = 1; month <= 36; month++) {
        // 月間売上計算
        let monthlySales = 0
        let monthlyFactoryFee = 0 // 委託工場フィー合計

        if (data.salesStrategyMode === 'simple') {
            monthlySales = data.monthlySalesSimple
        } else {
            // ベースライン売上（既存事業の売上）
            let currentBaseline = 0
            if (month <= 12) currentBaseline = data.yearlySalesBaseline.year1
            else if (month <= 24) currentBaseline = data.yearlySalesBaseline.year2
            else currentBaseline = data.yearlySalesBaseline.year3

            // ベースラインからスタートし、案件積み上げを加算
            monthlySales = currentBaseline

            // 案件積み上げ
            for (const deal of validDeals) { // validDealsを使用する
                // 期間内かチェック（durationMonths未指定=永続）
                const endMonth = deal.durationMonths ? deal.startMonth + deal.durationMonths : 999
                if (month >= deal.startMonth && month < endMonth) {
                    monthlySales += deal.monthlyAmount
                    
                    // 委託工場フィー計算（対象案件のみ）
                    if (deal.isFactoryFeeTarget && data.factoryFeePercentage) {
                        monthlyFactoryFee += deal.monthlyAmount * (data.factoryFeePercentage / 100)
                    }
                }
            }
        }
        
        cumulativeSales += monthlySales
        cumulativeFactoryFee += monthlyFactoryFee

        // Capacity Check
        if ((data.maxCapacitySales || 0) > 0 && monthlySales > (data.maxCapacitySales || 0)) {
            capacityAlertTriggered = true
        }

        // 粗利・営業利益
        // 正しい会計ロジック:
        // 1. 売上原価 = 月商 * 原価率
        // 2. 売上総利益(GrossProfit) = 月商 - 売上原価
        // 3. 委託工場フィー(FactoryFee) = 対象売上 * 料率
        
        const monthlyGrossProfitBeforeFee = monthlySales * (1 - data.costRatio / 100)
        // 実質粗利
        const monthlyGrossProfit = monthlyGrossProfitBeforeFee - monthlyFactoryFee
        
        // 経費計算
        let totalMonthlyExpenses = 0
        totalMonthlyExpenses += data.rent
        totalMonthlyExpenses += data.utilities

        // 人件費
        let laborCost = 0
        if (data.useDetailedExpenses) {
            laborCost = data.laborDetails.reduce((sum, item) => sum + item.amount, 0)
        } else {
            laborCost = data.laborCostTotal
        }
        totalMonthlyExpenses += laborCost

        // Labor Ratio Check (Sales > 0 safe guard)
        if (monthlySales > 0) {
            const laborRatio = (laborCost / monthlySales) * 100
            if (laborRatio < 15) {
                lowLaborCostAlertTriggered = true
            }
        }

        // その他経費・リース
        let leaseCost = 0
        if (data.useDetailedExpenses) {
            leaseCost = data.leaseDetails.reduce((sum, item) => {
                // 支払期間終了チェック
                if (item.paymentRemainingMonths && month > item.paymentRemainingMonths) {
                    return sum
                }
                return sum + item.amount
            }, 0)
        } else {
            leaseCost = data.otherExpensesTotal
        }
        totalMonthlyExpenses += leaseCost
        
        // 営業利益
        const monthlyOperatingProfit = monthlyGrossProfit - totalMonthlyExpenses

        if (month <= 12) {
            firstYearOperatingProfit += monthlyOperatingProfit
        }

        // 累積CF更新
        cumulative += monthlyOperatingProfit

        monthlyData.push({
            month,
            sales: monthlySales,
            grossProfit: monthlyGrossProfit,
            expenses: totalMonthlyExpenses,
            operatingProfit: monthlyOperatingProfit,
            cashFlow: cumulative,
            factoryFee: monthlyFactoryFee
        })
        cumulativeCashFlow.push(cumulative)
    }

    // 回収期間計算
    // 累積CFがプラスに転じた最初の月を探す
    const recoveredIndex = cumulativeCashFlow.findIndex(cf => cf >= 0)
    const paybackMonths = recoveredIndex === -1 ? Infinity : recoveredIndex + 1
    const paybackYears = paybackMonths !== Infinity ? parseFloat((paybackMonths / 12).toFixed(1)) : Infinity
    const isPaybackOk = paybackMonths <= 36

    // 直近月（1ヶ月目）または平均の営業指標（表示用）
    const firstMonthData = monthlyData[0]

    // cumulative = -Inv + P1 + P2 ...
    // cumulativeProfit (Sum of Profits) = cumulative + Inv
    const sumOperatingProfit = cumulative + totalInvestment

    // Target Gap Calculation
    let targetGap: number | null = null
    if (!isPaybackOk && targetDeals.length > 0) {
        let additionalProfit = 0
        for (let m = 1; m <= 36; m++) {
            // Target案件の売上・利益を計算

            
             // Note: Here assuming simple logic for target deals same as main loop
             // But avoiding code duplication is hard without refactoring into valid Deal calc helper
             // Inferring simply:
             const mTargetSales = targetDeals.reduce((sum, d) => {
                 const endMonth = d.durationMonths ? d.startMonth + d.durationMonths : 999
                 return (m >= d.startMonth && m < endMonth) ? sum + d.monthlyAmount : sum
             }, 0)
             
             const mTargetFee = targetDeals.reduce((sum, d) => {
                 const endMonth = d.durationMonths ? d.startMonth + d.durationMonths : 999
                 return (m >= d.startMonth && m < endMonth && d.isFactoryFeeTarget) ? sum + d.monthlyAmount : sum
             }, 0) * (data.factoryFeePercentage ? data.factoryFeePercentage / 100 : 0)

             const mTargetCoGS = mTargetSales * (data.costRatio / 100)
             additionalProfit += (mTargetSales - mTargetCoGS - mTargetFee)
        }
        
        // Check if recovers with additional profit
        // cumulative (Net Cash at 36mo) + additionalProfit >= 0 ?
        // cumulative is Final Cash Flow. If (Final Cash + Additional Profit) >= 0 => Recovered?
        // Wait, definition of Gap is "How much short of Total Investment"?
        // No, Payback means Cumulative >= 0.
        // If current Cumulative at 36mo is -100. Need +100.
        // If additionalProfit is 120. Then OK.
        // Gap is valid if (Cumulative + Additional) >= 0.
        // If so, Gap = 0? Or Gap is how much MORE needed?
        // Usually Gap means "How much Short".
        // If (Cumulative + Additional) < 0, then Gap = -(Cumulative + Additional).
        // Wait, logical gap: The user wants to know "If I add targets, can I recover?"
        // If yes, Gap is 0. If no, Gap is remaining deficit.
        
        if (cumulative + additionalProfit >= 0) {
             targetGap = 0
        } else {
             targetGap = -(cumulative + additionalProfit)
        }
    }

    // Alerts
    const alertMessages: string[] = []
    if (capacityAlertTriggered) {
        alertMessages.push('⚠️ 売上が人員キャパシティを超過しています。追加採用または外注を検討してください。')
    }
    if (lowLaborCostAlertTriggered) {
        alertMessages.push('⚠️ 人件費率が15%を下回っています。未払い残業代等の労務リスク（簿外債務）の可能性があります。')
    }

    // Summary Statistics
    const profitMargin = cumulativeSales > 0 ? (sumOperatingProfit / cumulativeSales) * 100 : 0
    const roi = totalInvestment > 0 ? (sumOperatingProfit / totalInvestment) * 100 : 0

    return {
        monthlyGrossProfit: firstMonthData.grossProfit,
        monthlyOperatingProfit: firstMonthData.operatingProfit,
        annualCashFlow: firstYearOperatingProfit, // 初年度CF
        totalInvestment,
        paybackMonths,
        canRecoverIn3Years: isPaybackOk,
        monthlyData,
        cumulativeCashFlow,
        
        // Expanded Interface
        summary: {
            totalSales: cumulativeSales,
            totalOperatingProfit: sumOperatingProfit,
            finalCash: cumulative,
            paybackMonths: paybackMonths === Infinity ? null : paybackMonths,
            profitMargin,
            roi
        },
        isPaybackOk,
        paybackYears,
        alerts: alertMessages,
        targetGap,
        
        // Legacy
        cumulativeOperatingProfit: sumOperatingProfit,
        requiredImprovementPerMonth: !isPaybackOk ? (-(cumulative) / 36) : 0, // Deficit / 36
        averageMonthlyOperatingProfit: sumOperatingProfit / 36,
        averageMonthlyFeeRevenue: cumulativeFactoryFee / 36
    }
}
