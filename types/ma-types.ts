// M&A収集フォーム用 共有型定義

/**
 * 経費明細項目
 */
export interface ExpenseItem {
    id: string
    name: string
    amount: number
    paymentRemainingMonths?: number
}

/**
 * 売上案件（積み上げ売上）
 */
export interface SalesDeal {
    id: string
    name: string
    monthlyAmount: number
    startMonth: number
    probability: 'fixed' | 'high' | 'target'
    isFactoryFeeTarget: boolean
}

/**
 * 収集フォームデータ
 */
export interface CollectFormData {
    desiredTransferPrice: number
    skeletonCost: number
    rent: number
    utilities: number
    laborCostTotal: number
    laborDetails: ExpenseItem[]
    otherExpensesTotal: number
    leaseDetails: ExpenseItem[]
    useDetailedExpenses: boolean
    maxCapacitySales: number
    costRatio: number
    salesStrategyMode: 'simple' | 'detailed'
    monthlySalesSimple: number
    yearlySalesBaseline: { year1: number; year2: number; year3: number }
    deals: SalesDeal[]
    factoryFeePercentage: number
}

/**
 * 年間売上ベースライン
 */
export interface YearlySalesBaseline {
    year1: number
    year2: number
    year3: number
}
