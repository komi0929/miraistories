// M&A シミュレーション用型定義と計算ロジック（クライアント用）

export interface SimulationData {
    // 初期投資
    acquisitionCost: number  // 譲渡価格
    renovationCost: number   // 初期改装費
    skeletonCost: number     // スケルトン費用（退去時）

    // 販管費（月額）
    rent: number             // 家賃
    laborCost: number        // 人件費
    utilities: number        // 光熱費
    otherExpenses: number    // その他経費

    // 売上見込み
    monthlySales: number     // 月間売上
    costRatio: number        // 原価率（%）
}

export interface SimulationResult {
    // 計算結果
    monthlyGrossProfit: number      // 月間粗利
    monthlyOperatingProfit: number  // 月間営業利益
    annualCashFlow: number          // 年間キャッシュフロー
    totalInvestment: number         // 総投資額
    paybackMonths: number           // 回収期間（月）
    canRecoverIn3Years: boolean     // 3年回収可能か

    // 月別累積CF（36ヶ月分）
    cumulativeCashFlow: number[]
}

/**
 * 投資回収シミュレーション計算
 */
export function calculatePayback(data: SimulationData): SimulationResult {
    const totalMonthlyExpenses = data.rent + data.laborCost + data.utilities + data.otherExpenses
    const monthlyGrossProfit = data.monthlySales * (1 - data.costRatio / 100)
    const monthlyOperatingProfit = monthlyGrossProfit - totalMonthlyExpenses
    const annualCashFlow = monthlyOperatingProfit * 12
    const totalInvestment = data.acquisitionCost + data.renovationCost + data.skeletonCost

    // 回収期間計算
    const paybackMonths = monthlyOperatingProfit > 0
        ? Math.ceil(totalInvestment / monthlyOperatingProfit)
        : Infinity

    // 36ヶ月分の累積キャッシュフロー
    const cumulativeCashFlow: number[] = []
    let cumulative = -totalInvestment
    for (let i = 1; i <= 36; i++) {
        cumulative += monthlyOperatingProfit
        cumulativeCashFlow.push(cumulative)
    }

    return {
        monthlyGrossProfit,
        monthlyOperatingProfit,
        annualCashFlow,
        totalInvestment,
        paybackMonths,
        canRecoverIn3Years: paybackMonths <= 36,
        cumulativeCashFlow
    }
}
