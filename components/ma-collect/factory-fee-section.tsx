'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HelpCircle, Factory, Coins } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface FactoryFeeSectionProps {
    data: {
        factoryFeePercentage: number
        deals: any[]
    }
    averageMonthlyFeeRevenue: number // New prop for calculated revenue
    onChange: (fn: (prev: any) => any) => void
}

export function FactoryFeeSection({ data, averageMonthlyFeeRevenue, onChange }: FactoryFeeSectionProps) {
    return (
        <TooltipProvider>
            <Card className="border-purple-200 shadow-sm">
                <CardHeader className="pb-3 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <Factory className="w-5 h-5 text-purple-600" />
                        <CardTitle className="text-base text-slate-800">委託工場フィー設定</CardTitle>
                        <Tooltip>
                            <TooltipTrigger>
                                <HelpCircle className="w-4 h-4 text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p>譲渡後も継続する委託契約がある場合、その手数料率をご入力ください。対象の案件は売上入力画面でチェックできます。</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    <CardDescription>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                    <div>
                        <Label className="text-sm font-medium text-slate-700">委託工場フィー率</Label>
                        <div className="relative mt-2">
                            <Input
                                type="number"
                                value={data.factoryFeePercentage}
                                onChange={(e) => onChange(prev => ({ ...prev, factoryFeePercentage: parseFloat(e.target.value) || 0 }))}
                                className="text-right pr-9 h-11 text-lg font-semibold"
                                min={0}
                                max={100}
                                step={0.1}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5">
                            フィー対象の案件の売上から、この率を差し引いて計算されます
                        </p>
                    </div>

                    {/* メリット可視化エリア */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
                        <div className="bg-purple-100 p-2 rounded-full shrink-0">
                            <Coins className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-purple-900 text-sm mb-1">
                                委託収益シミュレーション
                            </h4>
                            <p className="text-sm text-purple-800 leading-relaxed">
                                現在の売上予測なら、貴社に <span className="font-bold text-lg underline decoration-purple-400 decoration-2 underline-offset-2">月額 約¥{Math.floor(averageMonthlyFeeRevenue || 0).toLocaleString()}</span> の委託収益が発生します
                            </p>
                            <p className="text-xs text-purple-600 mt-2">
                                ※ 3年間の平均月額受取額（予測）
                            </p>
                        </div>
                    </div>
                    
                    {data.factoryFeePercentage > 0 && (
                        <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border">
                            <div className="font-medium text-slate-700 mb-1">📝 フィー対象案件</div>
                            <div>
                                現在の設定: {data.deals.filter(d => d.isFactoryFeeTarget).length} / {data.deals.length} 件がフィー対象
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    )
}
