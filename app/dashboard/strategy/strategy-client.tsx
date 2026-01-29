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
import { CollectionLinkDialog } from '@/components/dashboard/strategy/collection-link-dialog'
import { getSubmittedCollection, getSimulationsByLink } from './collection/actions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

    // 送信済み案件とシミュレーション版
    const [submittedLink, setSubmittedLink] = useState<{ id: string; name: string | null } | null>(null)
    const [simulationVersions, setSimulationVersions] = useState<Array<{
        id: string
        title: string
        version_type: 'original' | 'custom'
        version_number: number
        simulation_data: SimulationData
    }>>([])
    const [selectedVersionId, setSelectedVersionId] = useState<string>('')

    // 送信済み案件を取得
    useEffect(() => {
        const fetchSubmitted = async () => {
            const res = await getSubmittedCollection()
            if (res.success && res.data) {
                setSubmittedLink({ id: res.data.link.id, name: res.data.link.name })
                // 版一覧を取得
                const versionsRes = await getSimulationsByLink(res.data.link.id)
                if (versionsRes.success && versionsRes.data.length > 0) {
                    setSimulationVersions(versionsRes.data)
                    // オリジナル版があればデフォルト選択
                    const original = versionsRes.data.find((v: { version_type: string }) => v.version_type === 'original')
                    if (original) {
                        setSelectedVersionId(original.id)
                        setData(original.simulation_data)
                    }
                }
            }
        }
        fetchSubmitted()
    }, [])

    // 版切替時にデータを更新
    const handleVersionChange = (versionId: string) => {
        const version = simulationVersions.find(v => v.id === versionId)
        if (version) {
            setSelectedVersionId(versionId)
            setData(version.simulation_data)
        }
    }

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
                <div className="flex gap-2">
                    <CollectionLinkDialog />
                    <SimulationHistory data={data} onLoad={handleHistoryLoad} />
                </div>
            </div>

            {/* 案件ステータス＆版切替 */}
            {submittedLink && (
                <Card className="border-green-200 bg-green-50">
                    <CardContent className="py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">✅</span>
                                <div>
                                    <p className="font-semibold text-green-800">申請受領済み</p>
                                    <p className="text-sm text-green-700">{submittedLink.name || '案件データ'}</p>
                                </div>
                            </div>
                            {simulationVersions.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600">シミュレーション版:</span>
                                    <Select value={selectedVersionId} onValueChange={handleVersionChange}>
                                        <SelectTrigger className="w-[240px] bg-white">
                                            <SelectValue placeholder="版を選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {simulationVersions.map(v => (
                                                <SelectItem key={v.id} value={v.id}>
                                                    {v.version_type === 'original' ? '📥 ' : '📝 '}
                                                    Ver.{v.version_number}: {v.title.replace('📥 オリジナル: ', '').replace('📥 ', '')}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

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

                    {/* 高度な財務チャート・分析セクション */}
                    <FinancialChartsSection data={data} result={result} />
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
