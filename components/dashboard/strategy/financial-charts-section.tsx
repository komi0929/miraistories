'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SimulationData, SimulationResult } from '@/lib/ma-simulation'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    LineChart, Line, ReferenceLine, Legend, ComposedChart, Area, Label
} from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface FinancialChartsSectionProps {
    data: SimulationData
    result: SimulationResult | null
}

export function FinancialChartsSection({ data, result }: FinancialChartsSectionProps) {
    if (!result) return null

    // フォーマッター
    const currencyFormatter = (value: number) => `¥${value.toLocaleString()}`
    const axisFormatter = (value: number) => {
        if (Math.abs(value) >= 100000000) return `${(value / 100000000).toFixed(1)}億`
        if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(0)}万`
        return value.toLocaleString()
    }

    // 1. キャッシュフロー推移データ
    const cashFlowData = result.cumulativeCashFlow.map((value, index) => ({
        month: `${index + 1}ヶ月`,
        value: value,
        isPositive: value >= 0
    }))

    // 2. 損益分岐点（BEP）シミュレーションデータ
    const totalFixedCosts = data.rent + data.laborCostTotal + (data.useDetailedExpenses ? data.laborDetails.reduce((s, i) => s + i.amount, 0) - data.laborCostTotal : 0) +
        data.utilities + data.otherExpensesTotal + (data.useDetailedExpenses ? data.leaseDetails.reduce((s, i) => s + i.amount, 0) - data.otherExpensesTotal : 0)

    const currentSales = data.salesStrategyMode === 'simple' ? data.monthlySalesSimple : data.yearlySalesBaseline.year1

    const bepData = []
    const maxSales = Math.max(currentSales * 1.5, totalFixedCosts * 2)
    const steps = 10

    for (let i = 0; i <= steps; i++) {
        const sales = (maxSales / steps) * i
        const variableCost = sales * (data.costRatio / 100)
        const totalCost = totalFixedCosts + variableCost

        bepData.push({
            salesAmount: sales,
            salesLabel: axisFormatter(sales),
            salesLine: sales,
            totalCost: totalCost,
            fixedCost: totalFixedCosts,
        })
    }

    const bepValue = totalFixedCosts / (1 - (data.costRatio / 100))

    // 3. PL構成データ
    const plData = [
        {
            name: '収益構造',
            原価: currentSales * (data.costRatio / 100),
            固定費: totalFixedCosts,
            営業利益: Math.max(0, currentSales - (currentSales * (data.costRatio / 100)) - totalFixedCosts),
        }
    ]

    return (
        <div className="space-y-6">
            <Tabs defaultValue="cashflow" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="cashflow">CF推移 (36ヶ月)</TabsTrigger>
                    <TabsTrigger value="bep">損益分岐点 (BEP)</TabsTrigger>
                    <TabsTrigger value="pl">収益構造 (P/L)</TabsTrigger>
                </TabsList>

                {/* キャッシュフロー推移チャート */}
                <TabsContent value="cashflow" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center justify-between">
                                <span>累積キャッシュフロー推移</span>
                                {result.paybackMonths <= 36 && (
                                    <span className="text-sm text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-200">
                                        🎉 {result.paybackMonths}ヶ月目で回収
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={cashFlowData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fontSize: 10 }}
                                        interval={5}
                                        stroke="#64748b"
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tickFormatter={(val: any) => axisFormatter(val as number)}
                                        tick={{ fontSize: 10 }}
                                        stroke="#64748b"
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        formatter={(value: any) => [currencyFormatter(value), '累積CF']}
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <ReferenceLine y={0} stroke="#334155" strokeWidth={1} />
                                    <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                                        {cashFlowData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.isPositive ? '#4ade80' : '#f87171'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <p className="text-xs text-slate-500 text-center">
                        ※ 棒グラフがゼロライン（黒線）を超えると投資回収完了です。赤色は投資未回収状態を示します。
                    </p>
                </TabsContent>

                {/* 損益分岐点チャート */}
                <TabsContent value="bep" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">損益分岐点シミュレーション</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={bepData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="salesAmount"
                                        type="number"
                                        tickFormatter={(val: any) => axisFormatter(val as number)}
                                        stroke="#64748b"
                                        label={{ value: '売上高', position: 'insideBottomRight', offset: -5, fontSize: 10 }}
                                        domain={[0, maxSales]}
                                        tick={{ fontSize: 10 }}
                                    />
                                    <YAxis
                                        tickFormatter={(val: any) => axisFormatter(val as number)}
                                        stroke="#64748b"
                                        tick={{ fontSize: 10 }}
                                    />
                                    <Tooltip
                                        formatter={(value: any, name: any) => [currencyFormatter(value), name]}
                                        labelFormatter={(v) => `売上: ${currencyFormatter(v as number)}`}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />

                                    <Line type="monotone" dataKey="salesLine" name="売上" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="totalCost" name="総費用" stroke="#ef4444" strokeWidth={2} dot={false} />
                                    <Area type="monotone" dataKey="fixedCost" name="固定費エリア" fill="#e2e8f0" stroke="none" opacity={0.3} />

                                    {/* labelを単純な文字列やnumberにして型エラー回避。必要ならCustom Labelを使うが一旦これで行く */}
                                    <ReferenceLine x={bepValue} stroke="#10b981" strokeDasharray="3 3">
                                        <Label value="BEP" position="top" fill="#10b981" fontSize={10} />
                                    </ReferenceLine>
                                    <ReferenceLine x={currentSales} stroke="#6366f1" strokeDasharray="3 3">
                                        <Label value="現在" position="top" fill="#6366f1" fontSize={10} />
                                    </ReferenceLine>
                                </ComposedChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <div className="flex justify-around text-xs text-slate-600 bg-slate-50 p-3 rounded-md">
                        <div className="text-center">
                            <span className="block text-slate-400 text-[10px]">現在の売上</span>
                            <span className="font-bold text-base">{axisFormatter(currentSales)}</span>
                        </div>
                        <div className="text-center border-x px-4">
                            <span className="block text-slate-400 text-[10px]">損益分岐点 (BEP)</span>
                            <span className="font-bold text-base text-red-500">{axisFormatter(bepValue)}</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-slate-400 text-[10px]">安全余裕率</span>
                            <span className={`font-bold text-base ${currentSales > bepValue ? 'text-green-600' : 'text-red-500'}`}>
                                {currentSales > 0 ? ((currentSales - bepValue) / currentSales * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                    </div>
                </TabsContent>

                {/* PL構成チャート */}
                <TabsContent value="pl" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">収益構造分析 (現在の月商ベース)</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[350px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={plData}
                                    layout="vertical"
                                    barSize={40}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" hide />
                                    <Tooltip cursor={false} formatter={(value: any) => currencyFormatter(value)} />
                                    <Legend />
                                    <Bar dataKey="原価" stackId="a" fill="#94a3b8" radius={[4, 0, 0, 4]}>
                                        <Label value={`${data.costRatio}%`} position="center" fill="#fff" fontSize={10} />
                                    </Bar>
                                    <Bar dataKey="固定費" stackId="a" fill="#f87171">
                                        <Label value={`${((totalFixedCosts / currentSales) * 100).toFixed(0)}%`} position="center" fill="#fff" fontSize={10} />
                                    </Bar>
                                    <Bar dataKey="営業利益" stackId="a" fill="#4ade80" radius={[0, 4, 4, 0]}>
                                        {plData[0].営業利益 > 0 && (
                                            <Label value={`${((plData[0].営業利益 / currentSales) * 100).toFixed(0)}%`} position="center" fill="#fff" fontSize={10} />
                                        )}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded text-center">
                            <div className="text-xs text-slate-500">人件費率 (労働分配率)</div>
                            <div className={`text-lg font-bold ${(totalFixedCosts / currentSales) > 0.6 ? 'text-red-500' : 'text-slate-800'}`}>
                                {((data.laborCostTotal + (data.useDetailedExpenses ? data.laborDetails.reduce((s, i) => s + i.amount, 0) - data.laborCostTotal : 0)) / (currentSales * (1 - data.costRatio / 100)) * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded text-center">
                            <div className="text-xs text-slate-500">家賃比率</div>
                            <div className="text-lg font-bold text-slate-800">
                                {((data.rent / currentSales) * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
