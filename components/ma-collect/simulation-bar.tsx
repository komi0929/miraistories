'use client'

import { Card } from '@/components/ui/card'
import { CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SimulationBarProps {
    paybackMonths: number
    paybackYears: number
    isPaybackOk: boolean
    monthlyOperatingProfit: number
}

export function SimulationBar({ 
    paybackMonths, 
    paybackYears, 
    isPaybackOk,
    monthlyOperatingProfit
}: SimulationBarProps) {
    const isProfitable = monthlyOperatingProfit > 0
    const yearsDisplay = paybackYears === Infinity ? '---' : paybackYears.toFixed(1)
    const monthsDisplay = paybackMonths === Infinity ? '---' : Math.ceil(paybackMonths)

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 animate-in slide-in-from-bottom duration-300">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full",
                        !isProfitable 
                            ? "bg-red-100 text-red-600"
                            : isPaybackOk 
                                ? "bg-green-100 text-green-600" 
                                : "bg-amber-100 text-amber-600"
                    )}>
                        {!isProfitable ? (
                            <AlertTriangle className="w-6 h-6" />
                        ) : isPaybackOk ? (
                            <CheckCircle className="w-6 h-6" />
                        ) : (
                            <TrendingUp className="w-6 h-6" />
                        )}
                    </div>
                    
                    <div>
                        <div className="text-xs text-slate-500 font-medium mb-0.5">
                            現在の回収見込み
                        </div>
                        <div className="flex items-baseline gap-2">
                            {!isProfitable ? (
                                <span className="text-lg font-bold text-red-600">回収不可（赤字）</span>
                            ) : (
                                <>
                                    <span className={cn(
                                        "text-2xl font-bold font-mono",
                                        isPaybackOk ? "text-slate-900" : "text-amber-600"
                                    )}>
                                        {yearsDisplay}年
                                    </span>
                                    <span className="text-sm text-slate-500">
                                        ({monthsDisplay}ヶ月)
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                    <div className="hidden sm:block">
                        <div className="text-xs text-slate-500">月額営業利益想定</div>
                        <div className={cn(
                            "text-sm font-semibold font-mono",
                            isProfitable ? "text-slate-700" : "text-red-500"
                        )}>
                            ¥{Math.floor(monthlyOperatingProfit).toLocaleString()}
                        </div>
                    </div>
                    
                    <div className={cn(
                        "px-3 py-1 rounded text-xs font-bold whitespace-nowrap",
                        !isProfitable 
                            ? "bg-red-100 text-red-700"
                            : isPaybackOk 
                                ? "bg-green-100 text-green-700" 
                                : "bg-amber-100 text-amber-700"
                    )}>
                        {!isProfitable 
                            ? "赤字" 
                            : isPaybackOk 
                                ? "条件達成" 
                                : "基準未達 (3年超)"
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}
