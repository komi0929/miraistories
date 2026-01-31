"use client"

import {
    ComposedChart,
    Bar,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { SimulationResult } from "@/lib/ma-simulation"

interface SimulationChartProps {
    result: SimulationResult | null
    className?: string
}

export function SimulationChart({ result, className }: SimulationChartProps) {
    // Pass 12: Empty State Aesthetics (美しくガイドする空状態)
    if (!result) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-400">
                        <span>📈</span>
                        投資回収シミュレーション推移
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[400px] w-full flex flex-col items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                        <p className="text-lg font-semibold mb-2">シミュレーション待ち</p>
                        <p className="text-sm">左側のフォームから数値を入力すると、<br/>ここに36ヶ月の推移グラフが表示されます。</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // データセット作成（必要に応じて加工）
    const chartData = result.monthlyData

    // Pass 10: Intelligent Formatting (金額規模に応じた単位切り替え)
    const formatCurrencyAxis = (val: number) => {
        const absVal = Math.abs(val)
        if (absVal >= 100000000) return `${(val / 100000000).toFixed(1)}億`
        return `${(val / 10000).toLocaleString()}万`
    }

interface TooltipPayload {
    value: number
    name: string
    color: string
    payload: any
}

interface CustomTooltipProps {
    active?: boolean
    payload?: TooltipPayload[]
    label?: string
    paybackMonths: number
}

// Pass 9: Storytelling Tooltip (黒字化などのストーリーを表示)
const CustomTooltip = ({ active, payload, label, paybackMonths }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload
        const isPaybackMonth = data.month === paybackMonths
        
        return (
            <div className="bg-white p-4 border border-slate-100 shadow-lg rounded-xl">
                <p className="font-bold text-slate-700 mb-2">{label}ヶ月目</p>
                {isPaybackMonth && (
                   <div className="mb-3 p-2 bg-green-50 text-green-700 rounded-md text-xs font-bold flex items-center gap-1">
                       <span>🎉</span>
                       <span>この月で初期投資を回収！</span>
                   </div> 
                )}
                <div className="space-y-1 text-sm">
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-slate-500 w-24">
                                {entry.name === 'sales' ? '売上' :
                                 entry.name === 'operatingProfit' ? '営業利益' :
                                 entry.name === 'cashFlow' ? '累積CF' : entry.name}
                            </span>
                            <span className="font-mono font-semibold">
                                {Number(entry.value).toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }
    return null
}

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span>📈</span>
                    投資回収シミュレーション推移（36ヶ月）
                </CardTitle>
                <CardDescription>
                    月次の売上・営業利益（左軸）と、投資回収に向けた累積キャッシュフロー（右軸）の推移
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="month"
                                tickFormatter={(value) => `${value}ヶ月`}
                                tick={{ fontSize: 12, fill: '#64748B' }}
                                axisLine={{ stroke: '#E2E8F0' }}
                                tickLine={false}
                                interval="preserveStartEnd"
                                minTickGap={30}
                            />
                            {/* 左軸: 金額（売上・利益） */}
                            <YAxis
                                yAxisId="left"
                                tickFormatter={formatCurrencyAxis}
                                width={60}
                                tick={{ fontSize: 12, fill: '#64748B' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            {/* 右軸: 累積CF */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tickFormatter={formatCurrencyAxis}
                                width={60}
                                tick={{ fontSize: 12, fill: '#64748B' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip paybackMonths={result.paybackMonths} />} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />

                            {/* 損益分岐ライン (Cumulative CF = 0) & 利益0ライン */}
                            <ReferenceLine y={0} yAxisId="right" stroke="#94A3B8" strokeDasharray="3 3" label={{ value: "回収完了ライン", position: 'insideTopRight', fill: '#94A3B8', fontSize: 12 }} />
                            <ReferenceLine y={0} yAxisId="left" stroke="#CBD5E1" />
                            
                            {/* 回収月の垂直ライン（もし36ヶ月以内の場合） */}
                            {result.paybackMonths <= 36 && (
                                <ReferenceLine 
                                    x={result.paybackMonths} 
                                    stroke="#16a34a" 
                                    strokeDasharray="3 3" 
                                    label={{ 
                                        value: `🎉 ${result.paybackMonths}ヶ月で回収`, 
                                        position: 'insideTopLeft', 
                                        fill: '#16a34a', 
                                        fontSize: 12,
                                        fontWeight: 'bold',
                                        dx: 10
                                    }} 
                                />
                            )}

                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                                {/* Pass 11: Visual Depth (利益バーのグラデーション) */}
                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8}/>
                                </linearGradient>
                            </defs>
                            <Area 
                                type="monotone" 
                                yAxisId="left" 
                                dataKey="sales" 
                                name="売上" 
                                stroke="#93c5fd" 
                                fillOpacity={1} 
                                fill="url(#colorSales)" 
                            />
                            <Bar
                                yAxisId="left"
                                dataKey="operatingProfit"
                                name="営業利益(EBITDA)"
                                fill="url(#colorProfit)"
                                radius={[4, 4, 0, 0]}
                                barSize={12}
                                fillOpacity={1}
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="cashFlow"
                                name="累積CF"
                                stroke="#16a34a"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#16a34a' }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
