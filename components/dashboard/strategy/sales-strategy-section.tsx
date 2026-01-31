'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, HelpCircle } from 'lucide-react'
import { SalesDeal, SimulationData } from '@/lib/ma-simulation'
import { CurrencyInput } from './currency-input'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface SalesStrategySectionProps {
    data: SimulationData
    onChange: (data: SimulationData) => void
    readOnly?: boolean
}

export function SalesStrategySection({ data, onChange, readOnly = false }: SalesStrategySectionProps) {
    const handleAddDeal = () => {
        const newDeal: SalesDeal = {
            id: Math.random().toString(36).substr(2, 9),
            name: '新規案件',
            monthlyAmount: 300000,
            startMonth: 1,
            probability: 'high', // 収集側と統一: fixed/high/target
            isFactoryFeeTarget: false
        }
        onChange({ ...data, deals: [...data.deals, newDeal] })
    }

    const handleRemoveDeal = (id: string) => {
        onChange({ ...data, deals: data.deals.filter(d => d.id !== id) })
    }

    const handleDealChange = (id: string, field: keyof SalesDeal, value: any) => {
        const newDeals = data.deals.map(deal => {
            if (deal.id === id) {
                return { ...deal, [field]: value }
            }
            return deal
        })
        onChange({ ...data, deals: newDeals })
    }

    return (
        <TooltipProvider>
            <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-base">売上見込み（税込）</CardTitle>
                        <Tooltip>
                            <TooltipTrigger>
                                <HelpCircle className="w-4 h-4 text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p>案件を積み上げて売上予測を作成してください。「確定」「見込み高」の案件のみが回収シミュレーションに含まれます。</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    {!readOnly && (
                        <div className="flex items-center space-x-2">
                            <Label htmlFor="sales-detailed-mode" className="text-xs font-normal text-slate-500">高度な設定</Label>
                            <Switch
                                id="sales-detailed-mode"
                                checked={data.salesStrategyMode === 'detailed'}
                                onCheckedChange={(checked) => onChange({ ...data, salesStrategyMode: checked ? 'detailed' : 'simple' })}
                            />
                        </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* 原価率 */}
                    <div>
                        <Label className="text-sm">平均原価率（%）</Label>
                        <div className="relative mt-1">
                            <Input
                                type="number"
                                value={data.costRatio}
                                onChange={(e) => onChange({ ...data, costRatio: parseFloat(e.target.value) || 0 })}
                                className="text-right pr-8"
                                disabled={readOnly}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            材料費等が売上に占める割合をご入力ください
                        </p>
                    </div>

                    {data.salesStrategyMode === 'simple' ? (
                        <div>
                            <Label className="text-sm">月間売上（平均）</Label>
                            <CurrencyInput
                                value={data.monthlySalesSimple}
                                onChange={(val) => onChange({ ...data, monthlySalesSimple: val })}
                                className="mt-1"
                                disabled={readOnly}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                ※ 36ヶ月間一定の売上として計算されます
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* 案件積み上げ */}
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
                                    <div>
                                        <Label className="text-sm font-semibold text-slate-700">個別案件の積み上げ</Label>
                                        <p className="text-xs text-slate-500">獲得見込みのある案件を追加してください</p>
                                    </div>
                                </div>

                                {data.deals.length === 0 ? (
                                    <div className="text-center p-4 border border-dashed rounded-lg text-slate-400 text-sm">
                                        個別案件がありません
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {data.deals.map((deal) => (
                                            <div key={deal.id} className={`bg-white p-4 rounded-md border shadow-sm space-y-3 ${
                                                deal.probability === 'target' ? 'border-dashed border-slate-300 bg-slate-50/50' : 
                                                deal.probability === 'fixed' ? 'border-blue-200 bg-blue-50/30' : ''
                                            }`}>
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={deal.name}
                                                        onChange={(e) => handleDealChange(deal.id, 'name', e.target.value)}
                                                        className="flex-1 h-8 text-sm"
                                                        placeholder="案件名"
                                                        disabled={readOnly}
                                                    />
                                                    <Select
                                                        value={deal.probability}
                                                        onValueChange={(val) => handleDealChange(deal.id, 'probability', val as 'fixed' | 'high' | 'target')}
                                                        disabled={readOnly}
                                                    >
                                                        <SelectTrigger className={`w-36 h-8 text-xs font-medium border-none ring-1 ring-inset ${
                                                            deal.probability === 'fixed' ? 'text-blue-700 bg-blue-100 ring-blue-300' :
                                                            deal.probability === 'high' ? 'text-emerald-700 bg-emerald-100 ring-emerald-300' : 
                                                            'text-slate-500 bg-slate-100 ring-slate-300'
                                                        }`}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="fixed">🔵 確定・契約済</SelectItem>
                                                            <SelectItem value="high">🟢 見込み・高</SelectItem>
                                                            <SelectItem value="target">⚪ 追加目標(未定)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {!readOnly && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveDeal(deal.id)}
                                                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <Label className="text-[10px] text-slate-500">月額売上</Label>
                                                        <CurrencyInput
                                                            value={deal.monthlyAmount}
                                                            onChange={(val) => handleDealChange(deal.id, 'monthlyAmount', val)}
                                                            className="h-7 text-xs"
                                                            disabled={readOnly}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs text-slate-500">開始月（後）</Label>
                                                        <div className="relative">
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                value={deal.startMonth}
                                                                onChange={(e) => handleDealChange(deal.id, 'startMonth', Math.max(1, parseInt(e.target.value) || 1))}
                                                                className="h-9 pr-8"
                                                                disabled={readOnly}
                                                            />
                                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">ヶ月後</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* 委託工場フィー対象チェック */}
                                                {data.factoryFeePercentage && data.factoryFeePercentage > 0 && (
                                                    <div className="flex items-center space-x-2 pt-2 border-t">
                                                        <Checkbox
                                                            id={`factory-fee-${deal.id}`}
                                                            checked={deal.isFactoryFeeTarget}
                                                            onCheckedChange={(checked) => handleDealChange(deal.id, 'isFactoryFeeTarget', !!checked)}
                                                            disabled={readOnly}
                                                        />
                                                        <Label 
                                                            htmlFor={`factory-fee-${deal.id}`}
                                                            className="text-xs text-slate-600 cursor-pointer"
                                                        >
                                                            この案件は委託工場フィーの対象にする
                                                        </Label>
                                                    </div>
                                                )}

                                                {deal.probability === 'target' && (
                                                    <p className="text-[10px] text-slate-400 text-right">
                                                        ※「追加目標」は回収シミュレーションには含まれません（参考値）
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!readOnly && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddDeal}
                                        className="w-full text-xs border-dashed"
                                    >
                                        <Plus className="h-3 w-3 mr-1" /> 案件を追加
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    )
}
