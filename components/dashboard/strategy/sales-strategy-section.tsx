'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, TrendingUp } from 'lucide-react'
import { SalesDeal, SimulationData } from '@/lib/ma-simulation'
import { CurrencyInput } from './currency-input'

interface SalesStrategySectionProps {
    data: SimulationData
    onChange: (data: SimulationData) => void
}

export function SalesStrategySection({ data, onChange }: SalesStrategySectionProps) {
    const handleAddDeal = () => {
        const newDeal: SalesDeal = {
            id: Math.random().toString(36).substr(2, 9),
            name: '新規案件',
            monthlyAmount: 300000,
            startMonth: 1,
            durationMonths: 12,
            probability: 'medium'
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
        <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">売上見込み・戦略</CardTitle>
                <div className="flex items-center space-x-2">
                    <Label htmlFor="sales-detailed-mode" className="text-xs font-normal text-slate-500">高度な設定</Label>
                    <Switch
                        id="sales-detailed-mode"
                        checked={data.salesStrategyMode === 'detailed'}
                        onCheckedChange={(checked) => onChange({ ...data, salesStrategyMode: checked ? 'detailed' : 'simple' })}
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* 原価率は共通 */}
                <div>
                    <Label className="text-sm">平均原価率（%）</Label>
                    <div className="relative mt-1">
                        <Input
                            type="number"
                            value={data.costRatio}
                            onChange={(e) => onChange({ ...data, costRatio: parseFloat(e.target.value) || 0 })}
                            className="text-right pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
                    </div>
                </div>

                {data.salesStrategyMode === 'simple' ? (
                    <div>
                        <Label className="text-sm">月間売上予測（平均）</Label>
                        <CurrencyInput
                            value={data.monthlySalesSimple}
                            onChange={(val) => onChange({ ...data, monthlySalesSimple: val })}
                            className="mt-1"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            ※ 36ヶ月間一定の売上として計算されます。変動や案件積み上げを考慮する場合は「高度な設定」をオンにしてください。
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* 期ごとのベースライン */}
                        <div className="p-3 bg-slate-50 rounded-lg border">
                            <h3 className="text-sm font-semibold mb-3 flex items-center">
                                <TrendingUp className="w-4 h-4 mr-1 text-slate-500" />
                                期別ベースライン（月商）
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <Label className="text-xs text-slate-500">1期目 (1-12ヶ月)</Label>
                                    <CurrencyInput
                                        value={data.yearlySalesBaseline.year1}
                                        onChange={(val) => onChange({
                                            ...data,
                                            yearlySalesBaseline: { ...data.yearlySalesBaseline, year1: val }
                                        })}
                                        className="mt-1 h-8 text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">2期目 (13-24ヶ月)</Label>
                                    <CurrencyInput
                                        value={data.yearlySalesBaseline.year2}
                                        onChange={(val) => onChange({
                                            ...data,
                                            yearlySalesBaseline: { ...data.yearlySalesBaseline, year2: val }
                                        })}
                                        className="mt-1 h-8 text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">3期目 (25ヶ月~)</Label>
                                    <CurrencyInput
                                        value={data.yearlySalesBaseline.year3}
                                        onChange={(val) => onChange({
                                            ...data,
                                            yearlySalesBaseline: { ...data.yearlySalesBaseline, year3: val }
                                        })}
                                        className="mt-1 h-8 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 案件積み上げ */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <Label className="text-sm">積み上げ案件 (Deal Stacking)</Label>
                                <div className="flex items-center space-x-2">
                                    <Label className="text-xs">シミュレーション:</Label>
                                    <Select
                                        value={data.probabilityFilter}
                                        onValueChange={(val: any) => onChange({ ...data, probabilityFilter: val })}
                                    >
                                        <SelectTrigger className="w-[140px] h-7 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">すべて含む</SelectItem>
                                            <SelectItem value="high_only">確度「高」のみ</SelectItem>
                                            <SelectItem value="weighted">期待値（重み付）</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {data.deals.length === 0 ? (
                                <div className="text-center p-4 border border-dashed rounded-lg text-slate-400 text-sm">
                                    案件がありません
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {data.deals.map((deal) => (
                                        <div key={deal.id} className="bg-white p-3 rounded-md border shadow-sm space-y-2">
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
                                                    <SelectTrigger className={`w-20 h-8 text-xs ${deal.probability === 'high' ? 'text-green-600 font-bold' :
                                                            deal.probability === 'medium' ? 'text-blue-600' : 'text-slate-500'
                                                        }`}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="high">高 (100%)</SelectItem>
                                                        <SelectItem value="medium">中 (50%)</SelectItem>
                                                        <SelectItem value="low">低 (除外/20%)</SelectItem>
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
                                            <div className="grid grid-cols-3 gap-2">
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
                                                            className="h-7 text-xs pr-6"
                                                            min={1} max={36}
                                                        />
                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">ヶ月目</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label className="text-[10px] text-slate-500">継続月数</Label>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            value={deal.durationMonths}
                                                            onChange={(e) => handleDealChange(deal.id, 'durationMonths', parseInt(e.target.value))}
                                                            className="h-7 text-xs pr-6"
                                                            min={1}
                                                        />
                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">ヶ月</span>
                                                    </div>
                                                </div>
                                            </div>
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
    )
}
