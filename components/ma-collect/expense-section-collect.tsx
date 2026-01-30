'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, HelpCircle } from 'lucide-react'
import { CurrencyInput } from '@/components/dashboard/strategy/currency-input'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface ExpenseItem {
    id: string
    name: string
    amount: number
    paymentRemainingMonths?: number // undefined or 0 or null = ずっと続く
}

interface ExpenseSectionCollectProps {
    data: {
        rent: number
        utilities: number
        laborCostTotal: number
        laborDetails: ExpenseItem[]
        otherExpensesTotal: number
        leaseDetails: ExpenseItem[]
        useDetailedExpenses: boolean
        maxCapacitySales: number
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange: (fn: (prev: any) => any) => void
}

export function ExpenseSectionCollect({ data, onChange }: ExpenseSectionCollectProps) {
    const handleDetailChange = (
        type: 'labor' | 'lease',
        id: string,
        field: keyof ExpenseItem,
        value: string | number
    ) => {
        const targetList = type === 'labor' ? data.laborDetails : data.leaseDetails
        const newList = targetList.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value }
            }
            return item
        })

        if (type === 'labor') {
            onChange(prev => ({ ...prev, laborDetails: newList }))
        } else {
            onChange(prev => ({ ...prev, leaseDetails: newList }))
        }
    }

    const addItem = (type: 'labor' | 'lease') => {
        const newItem: ExpenseItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: type === 'labor' ? '' : '',
            amount: 0
        }

        if (type === 'labor') {
            onChange(prev => ({ ...prev, laborDetails: [...prev.laborDetails, newItem] }))
        } else {
            onChange(prev => ({ ...prev, leaseDetails: [...prev.leaseDetails, newItem] }))
        }
    }

    const removeItem = (type: 'labor' | 'lease', id: string) => {
        if (type === 'labor') {
            onChange(prev => ({ ...prev, laborDetails: prev.laborDetails.filter((i: ExpenseItem) => i.id !== id) }))
        } else {
            onChange(prev => ({ ...prev, leaseDetails: prev.leaseDetails.filter((i: ExpenseItem) => i.id !== id) }))
        }
    }

    const laborTotal = data.laborDetails.reduce((sum, i) => sum + i.amount, 0)
    const otherTotal = data.leaseDetails.reduce((sum, i) => sum + i.amount, 0)

    return (
        <TooltipProvider>
            <div className="space-y-6">

                <Card>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-base">販管費（月額・税込）</CardTitle>
                            <Tooltip>
                                <TooltipTrigger>
                                    <HelpCircle className="w-4 h-4 text-slate-400" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <p>毎月発生する経費をご入力ください。リース費用などは残りの支払期間も設定可能です。</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* 固定項目: 家賃 */}
                        <div>
                            <Label className="text-sm">家賃（月額）</Label>
                            <CurrencyInput
                                value={data.rent}
                                onChange={(val) => onChange(prev => ({ ...prev, rent: val }))}
                                className="mt-1"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                ※ 親族や関連会社から賃借している場合は、相場家賃での再契約が必要になる可能性があります。
                            </p>
                        </div>

                        {/* 固定項目: 光熱費 */}
                        <div>
                            <Label className="text-sm">光熱費（月額平均）</Label>
                            <CurrencyInput
                                value={data.utilities}
                                onChange={(val) => onChange(prev => ({ ...prev, utilities: val }))}
                                className="mt-1"
                            />
                        </div>

                        {/* 人件費 */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="space-y-1">
                                    <Label className="text-sm">人件費（月額）</Label>
                                    <p className="text-[10px] text-slate-500">
                                        ※給与＋法定福利費（社会保険料等）を含めた総額（会社負担額）を入力してください
                                    </p>
                                </div>
                                <span className="text-xs font-semibold text-slate-700">合計: ¥{laborTotal.toLocaleString()}</span>
                            </div>

                            <div className="space-y-2 bg-slate-50 p-3 rounded-md border">
                                {data.laborDetails.map((item) => (
                                    <div key={item.id} className="flex gap-2 items-center">
                                        <Input
                                            value={item.name}
                                            onChange={(e) => handleDetailChange('labor', item.id, 'name', e.target.value)}
                                            className="flex-1 h-8 text-sm bg-white"
                                            placeholder="役職/氏名"
                                        />
                                        <CurrencyInput
                                            value={item.amount}
                                            onChange={(val) => handleDetailChange('labor', item.id, 'amount', val)}
                                            className="w-32 h-8 text-sm bg-white"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeItem('labor', item.id)}
                                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addItem('labor')}
                                    className="w-full text-xs border-dashed"
                                >
                                    <Plus className="h-3 w-3 mr-1" /> スタッフを追加
                                </Button>
                            </div>
                            
                            {/* 最大生産キャパシティ入力 */}
                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                                <Label className="text-xs font-bold text-amber-800">現状体制での最大生産キャパシティ（月商目安）</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <CurrencyInput
                                        value={data.maxCapacitySales}
                                        onChange={(val) => onChange(prev => ({ ...prev, maxCapacitySales: val }))}
                                        className="h-9 bg-white border-amber-200 focus:border-amber-400"
                                    />
                                </div>
                                <p className="text-[10px] text-amber-700 mt-1">
                                    ※ 現状の人員配置で、追加採用なしに対応可能な売上の上限を入力してください。<br/>
                                    これを超えるとシミュレーション上で警告が表示されます。
                                </p>
                            </div>
                        </div>

                        {/* その他経費・リース */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm">その他経費・リース（月額）</Label>
                                <span className="text-xs font-semibold text-slate-700">合計: ¥{otherTotal.toLocaleString()}</span>
                            </div>

                            <div className="space-y-2 bg-slate-50 p-3 rounded-md border">
                                <div className="grid grid-cols-[1fr_150px_100px_32px] gap-2 mb-1 px-1 text-xs text-slate-500 font-medium">
                                    <div>項目名</div>
                                    <div>月額</div>
                                    <div>残支払(回)</div>
                                    <div></div>
                                </div>
                                
                                {data.leaseDetails.map((item) => (
                                    <div key={item.id} className="grid grid-cols-[1fr_150px_100px_32px] gap-2 items-center">
                                        <Input
                                            value={item.name}
                                            onChange={(e) => handleDetailChange('lease', item.id, 'name', e.target.value)}
                                            className="h-8 text-sm bg-white"
                                            placeholder="項目名"
                                        />
                                        <CurrencyInput
                                            value={item.amount}
                                            onChange={(val) => handleDetailChange('lease', item.id, 'amount', val)}
                                            className="h-8 text-sm bg-white"
                                        />
                                        <Input 
                                            type="number"
                                            value={item.paymentRemainingMonths || ''}
                                            onChange={(e) => {
                                                const val = e.target.value ? Math.max(1, parseInt(e.target.value)) : undefined
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                handleDetailChange('lease', item.id, 'paymentRemainingMonths', val as any)
                                            }}
                                            placeholder="∞"
                                            className="h-8 text-sm bg-white text-right"
                                            min={1}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeItem('lease', item.id)}
                                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addItem('lease')}
                                    className="w-full text-xs border-dashed"
                                >
                                    <Plus className="h-3 w-3 mr-1" /> 項目を追加
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500 text-right">
                                ※ 残支払(回)が空欄の項目は、永続する経費として計算されます
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    )
}
