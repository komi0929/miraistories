'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
    }
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
            name: type === 'labor' ? '新規スタッフ' : '新規項目',
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

    const laborTotal = data.useDetailedExpenses
        ? data.laborDetails.reduce((sum, i) => sum + i.amount, 0)
        : data.laborCostTotal

    const otherTotal = data.useDetailedExpenses
        ? data.leaseDetails.reduce((sum, i) => sum + i.amount, 0)
        : data.otherExpensesTotal

    return (
        <TooltipProvider>
            <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-base">販管費（月額・税込）</CardTitle>
                        <Tooltip>
                            <TooltipTrigger>
                                <HelpCircle className="w-4 h-4 text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p>毎月発生する経費をご入力ください。詳細入力モードでは、スタッフごとの人件費なども入力できます。</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="detailed-mode-collect" className="text-xs font-normal text-slate-500">詳細入力</Label>
                        <Switch
                            id="detailed-mode-collect"
                            checked={data.useDetailedExpenses}
                            onCheckedChange={(checked) => onChange(prev => ({ ...prev, useDetailedExpenses: checked }))}
                        />
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* 固定項目: 家賃 */}
                    <div>
                        <Label className="text-sm">家賃（月額）</Label>
                        <CurrencyInput
                            value={data.rent}
                            onChange={(val) => onChange(prev => ({ ...prev, rent: val }))}
                            className="mt-1"
                        />
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
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-sm">人件費（月額）</Label>
                            {data.useDetailedExpenses && (
                                <span className="text-xs font-semibold text-slate-700">合計: ¥{laborTotal.toLocaleString()}</span>
                            )}
                        </div>

                        {!data.useDetailedExpenses ? (
                            <CurrencyInput
                                value={data.laborCostTotal}
                                onChange={(val) => onChange(prev => ({ ...prev, laborCostTotal: val }))}
                            />
                        ) : (
                            <div className="space-y-2 bg-slate-50 p-3 rounded-md border">
                                {data.laborDetails.map((item) => (
                                    <div key={item.id} className="flex gap-2 items-center">
                                        <Input
                                            value={item.name}
                                            onChange={(e) => handleDetailChange('labor', item.id, 'name', e.target.value)}
                                            className="flex-1 h-8 text-sm"
                                            placeholder="役職/氏名"
                                        />
                                        <CurrencyInput
                                            value={item.amount}
                                            onChange={(val) => handleDetailChange('labor', item.id, 'amount', val)}
                                            className="w-32 h-8 text-sm"
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
                        )}
                    </div>

                    {/* その他経費・リース */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-sm">その他経費・リース（月額）</Label>
                            {data.useDetailedExpenses && (
                                <span className="text-xs font-semibold text-slate-700">合計: ¥{otherTotal.toLocaleString()}</span>
                            )}
                        </div>

                        {!data.useDetailedExpenses ? (
                            <CurrencyInput
                                value={data.otherExpensesTotal}
                                onChange={(val) => onChange(prev => ({ ...prev, otherExpensesTotal: val }))}
                            />
                        ) : (
                            <div className="space-y-2 bg-slate-50 p-3 rounded-md border">
                                {data.leaseDetails.map((item) => (
                                    <div key={item.id} className="flex gap-2 items-center">
                                        <Input
                                            value={item.name}
                                            onChange={(e) => handleDetailChange('lease', item.id, 'name', e.target.value)}
                                            className="flex-1 h-8 text-sm"
                                            placeholder="項目名"
                                        />
                                        <CurrencyInput
                                            value={item.amount}
                                            onChange={(val) => handleDetailChange('lease', item.id, 'amount', val)}
                                            className="w-32 h-8 text-sm"
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
                        )}
                    </div>
                </CardContent>
            </Card>
        </TooltipProvider>
    )
}
