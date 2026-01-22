'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FinancialResult } from '@/lib/calculations'
import { cn } from '@/lib/utils'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts'

interface FinancialChartsProps {
    metrics: FinancialResult
}

export function FinancialCharts({ metrics }: FinancialChartsProps) {
    const data = [
        { name: 'Initial Investment (CAPEX)', value: metrics.totalCapex, fill: '#16a34a' }, // Green
        { name: 'Monthly Fixed Cost (OPEX)', value: metrics.monthlyOpex, fill: '#2563eb' }, // Blue
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            <Card>
                <CardHeader>
                    <CardTitle>Investment & Costs</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value) => `¥${(value as number)?.toLocaleString() || 0}`} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">Total CAPEX</div>
                            <div className="text-2xl font-bold text-green-600">¥{metrics.totalCapex.toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">Monthly OPEX</div>
                            <div className="text-2xl font-bold text-blue-600">¥{metrics.monthlyOpex.toLocaleString()}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Financial Health</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="flex flex-col items-center justify-center p-2 rounded border bg-slate-50">
                            <div className="text-xs font-medium text-muted-foreground">Monthly Cash Flow</div>
                            <div className={cn("text-2xl font-bold", metrics.isCashShortage ? "text-red-600" : "text-green-600")}>
                                ¥{metrics.monthlyCashFlow.toLocaleString()}
                            </div>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 rounded border bg-slate-50">
                            <div className="text-xs font-medium text-muted-foreground">Total Depreciation</div>
                            <div className="text-xl font-bold text-slate-600">¥{Math.round(metrics.totalDepreciation).toLocaleString()}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {metrics.isCashShortage && (
                <Card className="border-destructive bg-destructive/10">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            ⚠️ Cash Flow Warning
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-destructive-foreground">
                            Projected monthly cash flow is negative. Consider reducing OPEX or increasing retention.
                        </p>
                    </CardContent>
                </Card>
            )}

            {metrics.capacityLoss && (
                <Card className="border-orange-500 bg-orange-50">
                    <CardHeader>
                        <CardTitle className="text-orange-700">Capacity Warning</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-orange-800">
                            Returned assets may cause production capacity to fall below demand.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
