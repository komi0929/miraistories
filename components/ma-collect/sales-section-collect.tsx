'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, TrendingUp, HelpCircle } from 'lucide-react'
import { CurrencyInput } from '@/components/dashboard/strategy/currency-input'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface SalesDeal {
    id: string
    name: string
    monthlyAmount: number
    startMonth: number
    // durationMonths: removed (assumed permanent)
    probability: 'fixed' | 'high' | 'target'
    isFactoryFeeTarget: boolean
}

interface SalesSectionCollectProps {
    data: {
        costRatio: number
        salesStrategyMode: 'simple' | 'detailed'
        monthlySalesSimple: number
        yearlySalesBaseline: { year1: number; year2: number; year3: number }
        deals: SalesDeal[]
        factoryFeePercentage: number
    }
    onChange: (fn: (prev: any) => any) => void
}

export function SalesSectionCollect({ data, onChange }: SalesSectionCollectProps) {
    const handleAddDeal = () => {
        const newDeal: SalesDeal = {
            id: Math.random().toString(36).substr(2, 9),
            name: '新規案件',
            monthlyAmount: 300000,
            startMonth: 1,
            probability: 'high', // Default to High
            isFactoryFeeTarget: true // Default to True
        }
        onChange(prev => ({ ...prev, deals: [...prev.deals, newDeal] }))
    }

    const handleRemoveDeal = (id: string) => {
        onChange(prev => ({ ...prev, deals: prev.deals.filter((d: SalesDeal) => d.id !== id) }))
    }

    const handleDealChange = (id: string, field: keyof SalesDeal, value: any) => {
        const newDeals = data.deals.map(deal => {
            if (deal.id === id) {
                return { ...deal, [field]: value }
            }
            return deal
        })
        onChange(prev => ({ ...prev, deals: newDeals }))
    }

    const getProbabilityLabel = (prob: string) => {
        switch (prob) {
            case 'fixed': return '確定・契約済'
            case 'high': return '見込み・高'
            case 'target': return '追加目標(未定)'
            default: return prob
        }
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
                                <p>現在の月間売上見込みをご入力ください。案件ごとの詳細を入力する場合は「高度な設定」をオンにしてください。</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="sales-detailed-mode-collect" className="text-xs font-normal text-slate-500">高度な設定</Label>
                        <Switch
                            id="sales-detailed-mode-collect"
                            checked={data.salesStrategyMode === 'detailed'}
                            onCheckedChange={(checked) => onChange(prev => ({ ...prev, salesStrategyMode: checked ? 'detailed' : 'simple' }))}
                        />
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* 原価率 */}
                    <div>
                        <Label className="text-sm">平均原価率（%）</Label>
                        <div className="relative mt-1">
                            <Input
                                type="number"
                                value={data.costRatio}
                                onChange={(e) => onChange(prev => ({ ...prev, costRatio: parseFloat(e.target.value) || 0 }))}
                                className="text-right pr-8"
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
                                onChange={(val) => onChange(prev => ({ ...prev, monthlySalesSimple: val }))}
                                className="mt-1"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                ※ 36ヶ月間一定の売上として計算されます
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* 期ごとのベースライン */}
                            <div className="p-3 bg-slate-50 rounded-lg border">
                                <h3 className="text-sm font-semibold mb-3 flex items-center">
                                    <TrendingUp className="w-4 h-4 mr-1 text-slate-500" />
                                    期別ベースライン売上（月商）
                                </h3>
                                <p className="text-xs text-slate-500 mb-3">
                                    各期間の平均的な月間売上をご入力ください
                                </p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <Label className="text-xs text-slate-500">1期目 (1-12ヶ月)</Label>
                                        <CurrencyInput
                                            value={data.yearlySalesBaseline.year1}
                                            onChange={(val) => onChange(prev => ({
                                                ...prev,
                                                yearlySalesBaseline: { ...prev.yearlySalesBaseline, year1: val }
                                            }))}
                                            className="mt-1 h-8 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-500">2期目 (13-24ヶ月)</Label>
                                        <CurrencyInput
                                            value={data.yearlySalesBaseline.year2}
                                            onChange={(val) => onChange(prev => ({
                                                ...prev,
                                                yearlySalesBaseline: { ...prev.yearlySalesBaseline, year2: val }
                                            }))}
                                            className="mt-1 h-8 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-500">3期目 (25ヶ月~)</Label>
                                        <CurrencyInput
                                            value={data.yearlySalesBaseline.year3}
                                            onChange={(val) => onChange(prev => ({
                                                ...prev,
                                                yearlySalesBaseline: { ...prev.yearlySalesBaseline, year3: val }
                                            }))}
                                            className="mt-1 h-8 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

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
                                                    />
                                                    <Select
                                                        value={deal.probability}
                                                        onValueChange={(val) => handleDealChange(deal.id, 'probability', val)}
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
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveDeal(deal.id)}
                                                        className="h-8 w-8 text-slate-400 hover:text-red-500"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <Label className="text-[10px] text-slate-500">月額売上</Label>
                                                        <CurrencyInput
                                                            value={deal.monthlyAmount}
                                                            onChange={(val) => handleDealChange(deal.id, 'monthlyAmount', val)}
                                                            className="h-7 text-xs"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px] text-slate-500">開始月</Label>
                                                        <div className="relative">
                                                            <Input
                                                                type="number"
                                                                value={deal.startMonth}
                                                                onChange={(e) => handleDealChange(deal.id, 'startMonth', parseInt(e.target.value))}
                                                                className="h-7 text-xs pr-8"
                                                                min={1} max={36}
                                                            />
                                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">ヶ月目〜</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* 委託工場フィー対象チェック */}
                                                {data.factoryFeePercentage > 0 && (
                                                    <div className="flex items-center space-x-2 pt-2 border-t">
                                                        <Checkbox
                                                            id={`factory-fee-${deal.id}`}
                                                            checked={deal.isFactoryFeeTarget}
                                                            onCheckedChange={(checked) => handleDealChange(deal.id, 'isFactoryFeeTarget', checked)}
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

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddDeal}
                                    className="w-full text-xs border-dashed"
                                >
                                    <Plus className="h-3 w-3 mr-1" /> 案件を追加
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    )
}
