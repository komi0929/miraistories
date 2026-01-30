// M&A シミュレーション用型定義と計算ロジック（クライアント用）

export interface ExpenseItem {
    id: string
    name: string
    amount: number
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
    }[]

    // 累積CF（グラフ用配列）
    cumulativeCashFlow: number[]
}

/**
 * 投資回収シミュレーション計算
 */
export function calculatePayback(data: SimulationData): SimulationResult {
    // 1. 初期投資
    const totalInvestment = data.acquisitionCost + data.renovationCost + data.skeletonCost

    // 2. 経費計算（月額固定と仮定）
    let totalMonthlyExpenses = 0

    // 家賃
    totalMonthlyExpenses += data.rent
    // 光熱費
    totalMonthlyExpenses += data.utilities

    // 人件費
    if (data.useDetailedExpenses) {
        const laborTotal = data.laborDetails.reduce((sum, item) => sum + item.amount, 0)
        totalMonthlyExpenses += laborTotal
    } else {
        totalMonthlyExpenses += data.laborCostTotal
    }

    // その他経費・リース
    if (data.useDetailedExpenses) {
        const leaseTotal = data.leaseDetails.reduce((sum, item) => sum + item.amount, 0)
        totalMonthlyExpenses += leaseTotal
    } else {
        totalMonthlyExpenses += data.otherExpensesTotal
    }

    // 3. 36ヶ月シミュレーション
    const monthlyData: SimulationResult['monthlyData'] = []
    const cumulativeCashFlow: number[] = []
    let cumulative = -totalInvestment
    let firstYearOperatingProfit = 0

    for (let month = 1; month <= 36; month++) {
        // 月間売上計算
        let monthlySales = 0
        let monthlyFactoryFee = 0 // 委託工場フィー合計

        if (data.salesStrategyMode === 'simple') {
            monthlySales = data.monthlySalesSimple
        } else {
            // ベースライン売上は廃止（0からスタートし、案件積み上げのみで計算）
            monthlySales = 0

            // 案件積み上げ
            for (const deal of data.deals) {
                // 期間内かチェック（durationMonths未指定=永続）
                const endMonth = deal.durationMonths ? deal.startMonth + deal.durationMonths : 999
                if (month >= deal.startMonth && month < endMonth) {
                    // 確度フィルタ/重み付け (新形式: fixed/high/target, 旧形式: high/medium/low)
                    let dealAmount = 0
                    if (data.probabilityFilter === 'all') {
                        // target/low以外すべて
                        if (deal.probability !== 'target' && deal.probability !== 'low') {
                            dealAmount = deal.monthlyAmount
                        }
                    } else if (data.probabilityFilter === 'high_only') {
                        // fixed, high のみ (新形式対応)
                        if (deal.probability === 'fixed' || deal.probability === 'high') {
                            dealAmount = deal.monthlyAmount
                        }
                    } else if (data.probabilityFilter === 'weighted') {
                        // 重み付け計算 (旧形式との互換性維持)
                        if (deal.probability === 'fixed' || deal.probability === 'high') dealAmount = deal.monthlyAmount * 1.0
                        else if (deal.probability === 'medium') dealAmount = deal.monthlyAmount * 0.5
                        else if (deal.probability === 'target' || deal.probability === 'low') dealAmount = deal.monthlyAmount * 0.2
                    }
                    monthlySales += dealAmount
                    
                    // 委託工場フィー計算（対象案件のみ）
                    if (deal.isFactoryFeeTarget && data.factoryFeePercentage) {
                        monthlyFactoryFee += dealAmount * (data.factoryFeePercentage / 100)
                    }
                }
            }
        }
        // 粗利・営業利益（委託工場フィーは売上から差し引く）
        const effectiveSales = monthlySales - monthlyFactoryFee
        const monthlyGrossProfit = effectiveSales * (1 - data.costRatio / 100)
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
            cashFlow: cumulative
        })
        cumulativeCashFlow.push(cumulative)
    }

    // 回収期間計算
    // 累積CFがプラスに転じた最初の月を探す
    const recoveredIndex = cumulativeCashFlow.findIndex(cf => cf >= 0)
    const paybackMonths = recoveredIndex === -1 ? Infinity : recoveredIndex + 1

    // 直近月（1ヶ月目）または平均の営業指標（表示用）
    const firstMonthData = monthlyData[0]

    return {
        monthlyGrossProfit: firstMonthData.grossProfit,
        monthlyOperatingProfit: firstMonthData.operatingProfit,
        annualCashFlow: firstYearOperatingProfit, // 初年度CF
        totalInvestment,
        paybackMonths,
        canRecoverIn3Years: paybackMonths <= 36,
        monthlyData,
        cumulativeCashFlow
    }
}
