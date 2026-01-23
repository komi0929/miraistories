'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useEffect, useRef } from 'react'
import { SimulationData, SimulationResult, calculatePayback } from '@/lib/ma-simulation'
import { chatWithAI, getAIReview } from './actions'

export function StrategyClient() {
    // 入力データ
    const [data, setData] = useState<SimulationData>({
        acquisitionCost: 5000000,
        renovationCost: 1000000,
        skeletonCost: 500000,
        rent: 150000,
        laborCost: 300000,
        utilities: 50000,
        otherExpenses: 50000,
        monthlySales: 1200000,
        costRatio: 35
    })

    // 計算結果
    const [result, setResult] = useState<SimulationResult | null>(null)

    // AIチャット
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([])
    const [chatInput, setChatInput] = useState('')
    const [isAiLoading, setIsAiLoading] = useState(false)
    const [aiReview, setAiReview] = useState<string>('')
    const chatEndRef = useRef<HTMLDivElement>(null)

    // 入力変更時に自動計算
    useEffect(() => {
        const newResult = calculatePayback(data)
        setResult(newResult)
    }, [data])

    // 入力ハンドラー
    const handleInputChange = (field: keyof SimulationData, value: string) => {
        const numValue = parseFloat(value) || 0
        setData(prev => ({ ...prev, [field]: numValue }))
    }

    // AIレビュー取得
    const handleGetReview = async () => {
        if (!result) return
        setIsAiLoading(true)
        const review = await getAIReview(data, result)
        setAiReview(review)
        setIsAiLoading(false)
    }

    // チャット送信
    const handleSendChat = async () => {
        if (!chatInput.trim() || !result) return

        const userMessage = chatInput.trim()
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setChatInput('')
        setIsAiLoading(true)

        const aiResponse = await chatWithAI(data, result, userMessage)
        setChatMessages(prev => [...prev, { role: 'ai', content: aiResponse }])
        setIsAiLoading(false)
    }

    // チャット自動スクロール
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [chatMessages])

    // 金額フォーマット
    const formatCurrency = (value: number) => {
        if (!isFinite(value)) return '---'
        return `¥${value.toLocaleString()}`
    }

    return (
        <div className="space-y-6">
            {/* ヘッダー */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">M&A 投資回収シミュレーション</h1>
                <p className="text-slate-600 mt-1">譲渡後3年以内に初期投資＋スケルトン費用が回収可能かを判定</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左カラム：入力フォーム */}
                <div className="space-y-4">
                    {/* 初期投資・退去費用 */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">初期投資・退去費用</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <Label className="text-sm">譲渡価格</Label>
                                <Input
                                    type="number"
                                    value={data.acquisitionCost}
                                    onChange={(e) => handleInputChange('acquisitionCost', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-sm">初期改装費</Label>
                                <Input
                                    type="number"
                                    value={data.renovationCost}
                                    onChange={(e) => handleInputChange('renovationCost', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-sm">スケルトン費用（退去時）</Label>
                                <Input
                                    type="number"
                                    value={data.skeletonCost}
                                    onChange={(e) => handleInputChange('skeletonCost', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 販管費 */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">販管費（月額）</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <Label className="text-sm">家賃</Label>
                                <Input
                                    type="number"
                                    value={data.rent}
                                    onChange={(e) => handleInputChange('rent', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-sm">人件費</Label>
                                <Input
                                    type="number"
                                    value={data.laborCost}
                                    onChange={(e) => handleInputChange('laborCost', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-sm">光熱費</Label>
                                <Input
                                    type="number"
                                    value={data.utilities}
                                    onChange={(e) => handleInputChange('utilities', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-sm">その他経費</Label>
                                <Input
                                    type="number"
                                    value={data.otherExpenses}
                                    onChange={(e) => handleInputChange('otherExpenses', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 売上見込み */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">売上見込み</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <Label className="text-sm">月間売上予測</Label>
                                <Input
                                    type="number"
                                    value={data.monthlySales}
                                    onChange={(e) => handleInputChange('monthlySales', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-sm">原価率（%）</Label>
                                <Input
                                    type="number"
                                    value={data.costRatio}
                                    onChange={(e) => handleInputChange('costRatio', e.target.value)}
                                    className="mt-1"
                                    min={0}
                                    max={100}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 中央カラム：シミュレーション結果 */}
                <div className="space-y-4">
                    {/* 判定結果 */}
                    <Card className={result?.canRecoverIn3Years ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">3年回収判定</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-4">
                                <div className={`text-4xl font-bold ${result?.canRecoverIn3Years ? 'text-green-600' : 'text-red-600'}`}>
                                    {result?.canRecoverIn3Years ? '✅ 回収可能' : '❌ 回収不可'}
                                </div>
                                <div className="text-lg mt-2 text-slate-700">
                                    回収期間: {result?.paybackMonths === Infinity ? '---' : `${result?.paybackMonths}ヶ月`}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 財務サマリー */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">財務サマリー</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-slate-600">総投資額</span>
                                <span className="font-semibold">{formatCurrency(result?.totalInvestment ?? 0)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-slate-600">月間粗利</span>
                                <span className="font-semibold">{formatCurrency(result?.monthlyGrossProfit ?? 0)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-slate-600">月間営業利益</span>
                                <span className={`font-semibold ${(result?.monthlyOperatingProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(result?.monthlyOperatingProfit ?? 0)}
                                </span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-slate-600">年間キャッシュフロー</span>
                                <span className={`font-semibold ${(result?.annualCashFlow ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(result?.annualCashFlow ?? 0)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 累積キャッシュフローグラフ（簡易版） */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">累積キャッシュフロー（36ヶ月）</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-40 flex items-end justify-between gap-0.5">
                                {result?.cumulativeCashFlow.map((cf, i) => {
                                    const maxAbs = Math.max(...result.cumulativeCashFlow.map(Math.abs), 1)
                                    const height = Math.abs(cf) / maxAbs * 100
                                    const isPositive = cf >= 0
                                    return (
                                        <div
                                            key={i}
                                            className="flex-1 flex flex-col justify-end h-full"
                                            title={`${i + 1}ヶ月目: ${formatCurrency(cf)}`}
                                        >
                                            <div
                                                className={`w-full ${isPositive ? 'bg-green-400' : 'bg-red-400'} rounded-t`}
                                                style={{ height: `${height}%`, minHeight: '2px' }}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 mt-2">
                                <span>1ヶ月</span>
                                <span>18ヶ月</span>
                                <span>36ヶ月</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 右カラム：AIアドバイザー */}
                <div className="space-y-4">
                    {/* AIレビュー */}
                    <Card>
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-base">AIレビュー</CardTitle>
                            <Button size="sm" onClick={handleGetReview} disabled={isAiLoading}>
                                {isAiLoading ? '分析中...' : 'レビュー取得'}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {aiReview ? (
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{aiReview}</p>
                            ) : (
                                <p className="text-sm text-slate-400">「レビュー取得」をクリックしてAI分析を実行</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* AIチャット */}
                    <Card className="flex flex-col" style={{ height: '400px' }}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">AIアドバイザー</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col overflow-hidden">
                            {/* チャット履歴 */}
                            <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-2">
                                {chatMessages.length === 0 && (
                                    <p className="text-sm text-slate-400">この案件について何でも質問してください</p>
                                )}
                                {chatMessages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`p-3 rounded-lg text-sm ${msg.role === 'user'
                                            ? 'bg-blue-100 text-blue-900 ml-8'
                                            : 'bg-slate-100 text-slate-800 mr-8'
                                            }`}
                                    >
                                        <div className="font-semibold text-xs mb-1">
                                            {msg.role === 'user' ? 'あなた' : 'AI'}
                                        </div>
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    </div>
                                ))}
                                {isAiLoading && (
                                    <div className="bg-slate-100 text-slate-600 p-3 rounded-lg mr-8 text-sm">
                                        考え中...
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* 入力欄 */}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="質問を入力..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                                    disabled={isAiLoading}
                                />
                                <Button onClick={handleSendChat} disabled={isAiLoading || !chatInput.trim()}>
                                    送信
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
