'use client'

import { AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SimulationBarProps {
    paybackYears: number
    isPaybackOk: boolean
    monthlyOperatingProfit?: number // Legacy support (optional)
    cumulativeOperatingProfit: number // New 3-year cumulative
    requiredImprovementPerMonth: number
    finalCash?: number // New: 投資回収後の手残り額
}

export function SimulationBar({ 
    paybackYears, 
    isPaybackOk,
    cumulativeOperatingProfit,
    requiredImprovementPerMonth,
    finalCash
}: SimulationBarProps) {
    const isProfitable = cumulativeOperatingProfit > 0
    const yearsDisplay = paybackYears === Infinity ? '---' : paybackYears.toFixed(1)
    
    // 判定ロジック
    // isProfitable: 3年間の累計が黒字か
    // isPaybackOk: 3年（36ヶ月）以内に初期投資を回収できるか
    
    // 背景色とアイコンの決定
    const statusColor = !isProfitable 
        ? "red" 
        : isPaybackOk 
            ? "emerald" 
            : "amber"
            
    const bgColor = !isProfitable 
        ? "bg-red-50" 
        : isPaybackOk 
            ? "bg-emerald-50" 
            : "bg-white"

    return (
        <div className={cn(
            "fixed bottom-0 left-0 right-0 z-50 border-t shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] p-4 animate-in slide-in-from-bottom duration-300",
            bgColor
        )}>
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                
                {/* 左側: ステータス表示 */}
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className={cn(
                        "flex shrink-0 items-center justify-center w-12 h-12 rounded-full shadow-sm border",
                        !isProfitable 
                            ? "bg-red-100 border-red-200 text-red-600"
                            : isPaybackOk 
                                ? "bg-emerald-100 border-emerald-200 text-emerald-600" 
                                : "bg-amber-100 border-amber-200 text-amber-600"
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
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                            投資回収シミュレーション
                        </div>
                        <div className="flex items-center gap-3">
                            {!isProfitable ? (
                                <span className="text-xl font-bold text-red-700">回収不可（赤字）</span>
                            ) : isPaybackOk ? (
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-bold text-emerald-800">回収見込み(税引前): {yearsDisplay}年</span>
                                    <span className="text-sm font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                                        基準クリア
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-bold text-amber-700">未達(税引前) {yearsDisplay}年</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 右側: アクションガイド */}
                <div className="w-full sm:w-auto text-center sm:text-right bg-white/50 p-2 sm:p-0 rounded-lg sm:bg-transparent">
                    {isPaybackOk ? (
                        <div>
                            <p className="text-xs text-slate-500 font-medium">3年間の最終収支（投資回収後）</p>
                            <p className={cn(
                                "text-lg font-bold font-mono tracking-tight",
                                (finalCash ?? 0) >= 0 ? "text-slate-900" : "text-red-600"
                            )}>
                                {(finalCash ?? 0) >= 0 ? '+' : ''}¥{Math.floor(finalCash ?? 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">※EBITDAから初期投資・スケルトン費用を控除</p>
                        </div>
                    ) : !isProfitable ? (
                        <div className="space-y-1">
                            <div className="text-xs text-red-600 font-medium">黒字化に向けた改善が必要です</div>
                            <div className="text-sm text-red-700 font-bold bg-red-100 px-3 py-1 rounded inline-block">
                                収益構造の見直しを推奨
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <div className="flex items-center gap-1 justify-center sm:justify-end text-amber-700 font-medium">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>目標達成まであと</span>
                            </div>
                            <div className="text-sm sm:text-base">
                                月額利益 <span className="text-xl font-bold text-amber-600 font-mono">+¥{Math.ceil(requiredImprovementPerMonth).toLocaleString()}</span> の改善が必要
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
