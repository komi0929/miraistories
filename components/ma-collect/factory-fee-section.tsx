'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HelpCircle, Factory } from 'lucide-react'
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
    onChange: (fn: (prev: any) => any) => void
}

export function FactoryFeeSection({ data, onChange }: FactoryFeeSectionProps) {
    return (
        <TooltipProvider>
            <Card className="border-purple-200">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Factory className="w-5 h-5 text-purple-600" />
                        <CardTitle className="text-base">委託工場フィー</CardTitle>
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
                        譲渡後も発生する委託契約のフィー率がある場合にご入力ください
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label className="text-sm">委託工場フィー率</Label>
                        <div className="relative mt-1">
                            <Input
                                type="number"
                                value={data.factoryFeePercentage}
                                onChange={(e) => onChange(prev => ({ ...prev, factoryFeePercentage: parseFloat(e.target.value) || 0 }))}
                                className="text-right pr-8"
                                min={0}
                                max={100}
                                step={0.1}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            フィー対象の案件の売上から、この率を差し引いて計算されます
                        </p>
                    </div>
                    
                    {data.factoryFeePercentage > 0 && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <h4 className="font-medium text-purple-900 text-sm mb-2">
                                📝 フィー対象案件の設定について
                            </h4>
                            <p className="text-xs text-purple-700 leading-relaxed">
                                フィー率を設定すると、「売上見込み」の各案件に「この案件は委託工場フィーの対象です」というチェックボックスが表示されます。
                                <br /><br />
                                対象の案件にチェックを入れると、その案件の売上から設定したフィー率分が差し引かれて計算されます。
                            </p>
                            
                            {data.deals.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-purple-200">
                                    <p className="text-xs text-purple-800 font-medium">
                                        現在の設定: {data.deals.filter(d => d.isFactoryFeeTarget).length} / {data.deals.length} 件がフィー対象
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* フィー計算の例 */}
                    {data.factoryFeePercentage > 0 && (
                        <div className="bg-slate-50 border rounded-lg p-4">
                            <h4 className="font-medium text-slate-700 text-sm mb-2">
                                💡 計算例
                            </h4>
                            <div className="text-xs text-slate-600 space-y-1">
                                <p>月額売上 ¥1,000,000 の案件がフィー対象の場合:</p>
                                <p className="font-mono bg-white px-2 py-1 rounded border inline-block">
                                    ¥1,000,000 × {data.factoryFeePercentage}% = ¥{Math.round(1000000 * data.factoryFeePercentage / 100).toLocaleString()} がフィー
                                </p>
                                <p>
                                    → 実質売上: ¥{Math.round(1000000 * (1 - data.factoryFeePercentage / 100)).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    )
}
