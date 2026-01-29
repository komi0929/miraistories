import { useMemo } from 'react'

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
    paybackYears: number // Added for compatibility
    alerts: string[]
    targetGap: number | null // 目標案件を含めば回収できる場合のギャップ額

    // Legacy Compatibility Fields (calculated for existing UI)
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
    laborDetails: any[]
    otherExpensesTotal: number
    leaseDetails: {
        id: string
        amount: number
        paymentRemainingMonths?: number
        [key: string]: any
    }[]
    useDetailedExpenses: boolean
    maxCapacitySales: number
    costRatio: number
    salesStrategyMode: 'simple' | 'detailed'
    monthlySalesSimple: number
    yearlySalesBaseline: { year1: number; year2: number; year3: number }
    deals: {
        id: string
        monthlyAmount: number
        startMonth: number
        isFactoryFeeTarget: boolean
        probability?: 'fixed' | 'high' | 'target'
        [key: string]: any
    }[]
    factoryFeePercentage: number
}

export const useMaSimulation = (data: InputData): SimulationResult => {
    return useMemo(() => {
        // 1. 投資総額 = スケルトン費用 + 譲渡希望価格
        const totalInvestment = (data.skeletonCost || 0) + (data.desiredTransferPrice || 0)

        const monthlyData = []
        let cumulativeProfit = 0
        let cumulativeSales = 0
        let cumulativeFactoryFee = 0 // For average fee calculation
        
        // アラート管理
        let capacityAlertTriggered = false
        let lowLaborCostAlertTriggered = false

        // 有効な案件（確度: Fixed or High）のみで計算
        const validDeals = (data.deals || []).filter(d => d.probability === 'fixed' || d.probability === 'high')
        
        // 参考: Target案件
        const targetDeals = (data.deals || []).filter(d => d.probability === 'target')

        for (let month = 1; month <= 36; month++) {
            // Baseline
            let currentBaseline = 0
            if (data.salesStrategyMode === 'simple') {
                currentBaseline = data.monthlySalesSimple
            } else {
                if (month <= 12) currentBaseline = data.yearlySalesBaseline.year1
                else if (month <= 24) currentBaseline = data.yearlySalesBaseline.year2
                else currentBaseline = data.yearlySalesBaseline.year3
            }

            // Deals (valid only)
            const dealsSales = validDeals.reduce((sum, deal) => {
                if (month >= deal.startMonth) {
                    return sum + deal.monthlyAmount
                }
                return sum
            }, 0)

            const totalMonthlySales = currentBaseline + dealsSales
            
            // Capacity Check
            if (data.maxCapacitySales > 0 && totalMonthlySales > data.maxCapacitySales) {
                capacityAlertTriggered = true
            }

            // Costs - laborDetailsがあればそちらから合計、なければlaborCostTotalを使用
            const laborCost = data.laborDetails && data.laborDetails.length > 0
                ? data.laborDetails.reduce((sum, item) => sum + (item.amount || 0), 0)
                : data.laborCostTotal || 0
            
            // Labor Ratio Check (Sales > 0 safe guard)
            if (totalMonthlySales > 0) {
                const laborRatio = (laborCost / totalMonthlySales) * 100
                if (laborRatio < 15) {
                    lowLaborCostAlertTriggered = true
                }
            }

            // Factory Fee
            let factoryFee = 0
            if (data.factoryFeePercentage > 0) {
                const dealsFeeTargetSales = validDeals.reduce((sum, deal) => {
                    if (month >= deal.startMonth && deal.isFactoryFeeTarget) {
                        return sum + deal.monthlyAmount
                    }
                    return sum
                }, 0)
                
                const totalFeeTargetSales = currentBaseline + dealsFeeTargetSales
                factoryFee = totalFeeTargetSales * (data.factoryFeePercentage / 100)
            }
            cumulativeFactoryFee += factoryFee

            const costOfGoods = totalMonthlySales * ((data.costRatio || 35) / 100)
            
            // Fixed Costs - leaseDetailsから計算（支払残月数を考慮）
            const leaseCost = data.leaseDetails && data.leaseDetails.length > 0
                ? data.leaseDetails.reduce((sum, item) => {
                    if (item.paymentRemainingMonths && month > item.paymentRemainingMonths) {
                        return sum
                    }
                    return sum + (item.amount || 0)
                }, 0)
                : data.otherExpensesTotal || 0  // leaseDetailsがなければotherExpensesTotalを使用
            
            // Note: leaseDetailsがある場合はotherExpensesTotalを加算しない（重複防止）
            const otherFixed = data.rent + data.utilities + leaseCost
            
            const totalExpenses = costOfGoods + laborCost + factoryFee + otherFixed
            const operatingProfit = totalMonthlySales - totalExpenses

            cumulativeProfit += operatingProfit
            cumulativeSales += totalMonthlySales

            monthlyData.push({
                month,
                sales: totalMonthlySales,
                profit: operatingProfit,
                cumulativeProfit: cumulativeProfit,
                isRecovery: cumulativeProfit >= totalInvestment
            })
        }

        // Payback Logic (Fixed + High)
        let paybackMonths: number | null = null
        const recoveryMonthData = monthlyData.find(d => d.cumulativeProfit >= totalInvestment)
        if (recoveryMonthData) {
            paybackMonths = recoveryMonthData.month
        }

        const isPaybackOk = paybackMonths !== null
        const totalOperatingProfit = cumulativeProfit
        const paybackYears = paybackMonths ? parseFloat((paybackMonths / 12).toFixed(1)) : 99.9

        // Summary Statistics
        const totalSales = cumulativeSales
        const profitMargin = totalSales > 0 ? (totalOperatingProfit / totalSales) * 100 : 0
        const roi = totalInvestment > 0 ? (totalOperatingProfit / totalInvestment) * 100 : 0

        // Alerts
        const alertMessages: string[] = []
        if (capacityAlertTriggered) {
            alertMessages.push('⚠️ 売上が人員キャパシティを超過しています。追加採用または外注を検討してください。')
        }
        if (lowLaborCostAlertTriggered) {
            alertMessages.push('⚠️ 人件費率が15%を下回っています。人員不足のリスクがあります。')
        }

        // Target Gap Calculation
        let targetGap: number | null = null
        if (!isPaybackOk && targetDeals.length > 0) {
            let additionalProfit = 0
            for (let m = 1; m <= 36; m++) {
                const targetSales = targetDeals.reduce((sum, d) => (m >= d.startMonth ? sum + d.monthlyAmount : sum), 0)
                const targetFee = targetDeals.reduce((sum, d) => (m >= d.startMonth && d.isFactoryFeeTarget ? sum + d.monthlyAmount : sum), 0) * (data.factoryFeePercentage / 100)
                const targetCoGS = targetSales * (data.costRatio / 100)
                additionalProfit += (targetSales - targetCoGS - targetFee)
            }
            
            if (cumulativeProfit + additionalProfit >= totalInvestment) {
                targetGap = 0
            } else {
                targetGap = (totalInvestment - (cumulativeProfit + additionalProfit))
            }
        }
        
        // Legacy Calculations
        const averageMonthlyOperatingProfit = cumulativeProfit / 36
        const averageMonthlyFeeRevenue = cumulativeFactoryFee / 36 // Approx
        // Required improvement if NG: (Deficit / 36)? Or strictly per remaining month? 
        // Simple approximation: Total Deficit / 36
        const requiredImprovementPerMonth = !isPaybackOk ? (totalInvestment - cumulativeProfit) / 36 : 0

        return {
            monthlyData,
            summary: {
                totalSales,
                totalOperatingProfit,
                finalCash: cumulativeProfit - totalInvestment,
                paybackMonths,
                profitMargin,
                roi
            },
            isPaybackOk,
            paybackYears,
            alerts: alertMessages,
            targetGap,
            
            // Legacy
            cumulativeOperatingProfit: totalOperatingProfit,
            requiredImprovementPerMonth,
            averageMonthlyOperatingProfit,
            averageMonthlyFeeRevenue
        }
    }, [data])
}
