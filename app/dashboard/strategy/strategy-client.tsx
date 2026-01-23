'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useEffect, useRef } from 'react'
import { SimulationData, SimulationResult, calculatePayback } from '@/lib/ma-simulation'
import { chatWithAI, getAIReview } from './actions'
import { CurrencyInput } from '@/components/dashboard/strategy/currency-input'
import { ExpenseSection } from '@/components/dashboard/strategy/expense-section'
import { SalesStrategySection } from '@/components/dashboard/strategy/sales-strategy-section'
import { FinancialChartsSection } from '@/components/dashboard/strategy/financial-charts-section'
import { SimulationHistory } from '@/components/dashboard/strategy/simulation-history'

export function StrategyClient() {
    // 入力データ（初期値）
    const [data, setData] = useState<SimulationData>({
        acquisitionCost: 5000000,
        renovationCost: 1000000,
        skeletonCost: 500000,

        useDetailedExpenses: false,
        rent: 150000,
        utilities: 50000,
        laborCostTotal: 300000,
        laborDetails: [
            { id: '1', name: '店長', amount: 350000 },
            { id: '2', name: 'スタッフA', amount: 200000 },
        ],
        otherExpensesTotal: 50000,
        leaseDetails: [
            { id: '1', name: 'オーブンリース', amount: 20000 },
        ],

        costRatio: 35,
        salesStrategyMode: 'simple',
        monthlySalesSimple: 1200000,
        yearlySalesBaseline: {
            year1: 1000000,
            year2: 1200000,
            year3: 1500000,
        },
        deals: [],
        probabilityFilter: 'all'
    })

    // 計算結果
    const [result, setResult] = useState<SimulationResult | null>(null)

    // 履歴ロードハンドラ
    const handleHistoryLoad = (loadedData: SimulationData) => {
        setData(loadedData)
    }

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
        <div className="space-y-6 pb-20">
            {/* ヘッダー */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">M&A 投資回収シミュレーション</h1>
                    <p className="text-slate-600 mt-1">譲渡後3年以内に初期投資＋スケルトン費用が回収可能かを詳細にシミュレーション</p>
                </div>
                <SimulationHistory data={data} onLoad={handleHistoryLoad} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左カラム：入力フォーム */}
                <div className="space-y-6">
                    {/* 初期投資・退去費用 */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">初期投資・退去費用</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <Label className="text-sm">譲渡価格</Label>
                                <CurrencyInput
                                    value={data.acquisitionCost}
                                    onChange={(val) => setData({ ...data, acquisitionCost: val })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-sm">初期改装費</Label>
                                <CurrencyInput
                                    value={data.renovationCost}
                                    onChange={(val) => setData({ ...data, renovationCost: val })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-sm">スケルトン費用（退去時）</Label>
                                <CurrencyInput
                                    value={data.skeletonCost}
                                    onChange={(val) => setData({ ...data, skeletonCost: val })}
                                    className="mt-1"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 販管費セクション（詳細コンポーネント） */}
                    <ExpenseSection
                        data={data}
                        onChange={setData}
                    />

                    {/* 売上戦略セクション（詳細コンポーネント） */}
                    <SalesStrategySection
                        data={data}
                        onChange={setData}
                    />
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

                    {/* 財務サマリー（初年度ベース） */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">財務サマリー（初年度）</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-slate-600">総投資額</span>
                                <span className="font-semibold">{formatCurrency(result?.totalInvestment ?? 0)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-slate-600">粗利 (初月)</span>
                                <span className="font-semibold">{formatCurrency(result?.monthlyGrossProfit ?? 0)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-slate-600">営業利益 (初月)</span>
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

                    {/* 累積キャッシュフローグラフ */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">キャッシュフロー推移（36ヶ月）</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-40 flex items-end justify-between gap-0.5">
                                {result?.cumulativeCashFlow.map((cf, i) => {
                                    const maxAbs = Math.max(...result.cumulativeCashFlow.map(Math.abs), 1000000)
                                    // グラフがはみ出さないようにスケール調整
                                    let height = Math.abs(cf) / maxAbs * 100
                                    if (height > 100) height = 100

                                    const isPositive = cf >= 0

                                    // ゼロラインの位置（中心付近にするため）
                                    // ここでは簡易的に、常に下から生やす棒グラフにするが、マイナスは赤、プラスは緑
                                    // ※本来は正負で上下させるとより良いが、簡易実装のため色分けのみ

                                    return (
                                        <div
                                            key={i}
                                            className="flex-1 flex flex-col justify-end h-full group relative"
                                        >
                                            {/* ツールチップ */}
                                            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 bg-black text-white text-xs p-1 rounded whitespace-nowrap z-10 mb-1">
                                                {i + 1}ヶ月: {cf.toLocaleString()}
                                            </div>

                                            <div
                                                className={`w-full ${isPositive ? 'bg-green-400' : 'bg-red-400'} rounded-t opacity-80 hover:opacity-100`}
                                                style={{ height: `${Math.max(height, 2)}%` }}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 mt-2 border-t pt-1">
                                <span>1ヶ月</span>
                                <span>12ヶ月</span>
                                <span>24ヶ月</span>
                                <span>36ヶ月</span>
                            </div>

                            {/* ゼロライン到達点（回収ポイント）の表示 */}
                            {result?.paybackMonths && result.paybackMonths <= 36 && (
                                <div className="text-center mt-2 text-xs font-bold text-green-600">
                                    ▲ {result.paybackMonths}ヶ月目で回収完了
                                </div>
                            )}
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
                                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-md border border-slate-200">
                                    {aiReview}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-md border border-dashed">
                                    <p>「レビュー取得」をクリックして<br />プロフェッショナル分析を実行</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* AIチャット */}
                    <Card className="flex flex-col h-[500px]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">AIアドバイザー</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col overflow-hidden">
                            {/* チャット履歴 */}
                            <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-2">
                                {chatMessages.length === 0 && (
                                    <div className="text-sm text-slate-400 p-4 bg-slate-50 rounded-lg">
                                        <p className="font-semibold mb-2">💡 ヒント</p>
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li>初期投資が高すぎませんか？</li>
                                            <li>人件費の削減余地は？</li>
                                            <li>2期目の売上が伸びる根拠は？</li>
                                        </ul>
                                    </div>
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
