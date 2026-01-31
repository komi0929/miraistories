'use client'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useEffect, useRef } from 'react'
import { SimulationData, SimulationResult, calculatePayback } from '@/lib/ma-simulation'
import { chatWithAI, getAIReview } from './actions'
import { CurrencyInput } from '@/components/dashboard/strategy/currency-input'
import { ExpenseSection } from '@/components/dashboard/strategy/expense-section'
import { SalesStrategySection } from '@/components/dashboard/strategy/sales-strategy-section'
import { SimulationHistory } from '@/components/dashboard/strategy/simulation-history'
import { SimulationChart } from '@/components/dashboard/strategy/simulation-chart'
import { CollectionLinkDialog } from '@/components/dashboard/strategy/collection-link-dialog'
import { getCollectionLinks, getSimulationsByLink, saveSimulationVersion } from './collection/actions'
import { Save, Loader2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CaseList, CollectionLink } from '@/components/dashboard/strategy/case-list'
import { ArrowLeft, RefreshCw } from 'lucide-react'

export function StrategyClient() {
    // 画面モード
    const [viewMode, setViewMode] = useState<'list' | 'simulation'>('list')
    const [collectionLinks, setCollectionLinks] = useState<CollectionLink[]>([])
    const [isLoadingLinks, setIsLoadingLinks] = useState(true)
    const { toast } = useToast()

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
        salesStrategyMode: 'detailed',
        monthlySalesSimple: 1200000,
        yearlySalesBaseline: {
            year1: 1000000,
            year2: 1200000,
            year3: 1500000,
        },
        deals: [],
        probabilityFilter: 'high_only', // デフォルトをhigh_onlyに（収集側と統一）
        factoryFeePercentage: 0
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
    const [isSavingVersion, setIsSavingVersion] = useState(false)
    
    // 現在選択中の版がオリジナルかどうか
    const selectedVersion = simulationVersions.find(v => v.id === selectedVersionId)
    const isOriginal = selectedVersion?.version_type === 'original'

    // リンク一覧を取得
    const fetchLinks = async () => {
        setIsLoadingLinks(true)
        const res = await getCollectionLinks()
        if (res.success && res.data) {
            setCollectionLinks(res.data as CollectionLink[])
        } else {
            console.error('fetchLinks error:', res.error)
            toast({
                title: "データ取得エラー",
                description: res.error || "案件一覧の取得に失敗しました。管理者に連絡してください。",
                variant: "destructive"
            })
            setCollectionLinks([])
        }
        setIsLoadingLinks(false)
    }

    useEffect(() => {
        fetchLinks()
    }, [])

    // 案件選択時の処理
    const handleSelectCase = async (linkId: string, responseId: string) => {
        setIsLoadingLinks(true)
        
        // シミュレーション版の取得
        const versionsRes = await getSimulationsByLink(linkId)
        
        if (versionsRes.success && versionsRes.data.length > 0) {
            setSimulationVersions(versionsRes.data)
            
            // オリジナル版をデフォルト選択
            const original = versionsRes.data.find((v: any) => v.version_type === 'original')
            if (original) {
                setSelectedVersionId(original.id)
                setData(original.simulation_data)
            } else {
                setSelectedVersionId(versionsRes.data[0].id)
                setData(versionsRes.data[0].simulation_data)
            }
            
            // 選択中の案件情報を設定
            const link = collectionLinks.find(l => l.id === linkId)
            if (link) {
                setSubmittedLink({ id: link.id, name: link.name })
            }
            
            setViewMode('simulation')
        }
        
        setIsLoadingLinks(false)
    }

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

    // 編集版として保存
    const handleSaveAsVersion = async () => {
        if (!submittedLink) return
        
        setIsSavingVersion(true)
        
        const result = await saveSimulationVersion(
            submittedLink.id,
            selectedVersionId, // 親版ID
            data,
            `📝 編集版`
        )
        
        if (result.success) {
            toast({
                title: "保存完了",
                description: "編集版として保存しました",
            })
            // 版一覧を再取得
            const versionsRes = await getSimulationsByLink(submittedLink.id)
            if (versionsRes.success) {
                setSimulationVersions(versionsRes.data)
                // 新しく作成した版を選択
                if (result.data) {
                    setSelectedVersionId(result.data.id)
                }
            }
        } else {
            toast({
                title: "保存エラー",
                description: result.error || "保存に失敗しました",
                variant: "destructive"
            })
        }
        
        setIsSavingVersion(false)
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

    const handleBackToList = () => {
        setViewMode('list')
        setSubmittedLink(null)
        fetchLinks() // 最新の状態を取得
    }

    // --- RENDER ---

    // リストビュー
    if (viewMode === 'list') {
        return (
            <CaseList 
                links={collectionLinks} 
                isLoading={isLoadingLinks} 
                onSelectCase={handleSelectCase}
                onRefresh={fetchLinks}
            />
        )
    }

    // シミュレーションビュー
    return (
        <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* ヘッダー */}
            <div className="flex flex-col gap-4">
                <Button 
                    variant="ghost" 
                    className="self-start gap-2 pl-0 text-slate-500 hover:text-slate-900"
                    onClick={handleBackToList}
                >
                    <ArrowLeft className="h-4 w-4" />
                    案件一覧に戻る
                </Button>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                             {submittedLink?.name || '案件シミュレーション'}
                        </h1>
                        <p className="text-slate-600 mt-1">
                            収集データを元に投資回収シミュレーションを実行中
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {/* 這裡需要注意CollectionLinkDialog可能需要在List View顯示，Simulation View也可以有 */}
                        <SimulationHistory data={data} onLoad={handleHistoryLoad} />
                    </div>
                </div>
            </div>

            {/* 案件ステータス＆版切替 */}
            {submittedLink && (
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">📊</span>
                                <div>
                                    <p className="font-semibold text-blue-900">シミュレーション実行中</p>
                                    <p className="text-sm text-blue-700">選択中のバージョン: {
                                        selectedVersion?.version_type === 'original' ? '📥 オリジナル: ' : '📝 '}
                                        {selectedVersion?.title.replace('📥 オリジナル: ', '').replace('📝 編集版', '編集版') || 'オリジナル'
                                    }</p>
                                </div>
                            </div>
                            {simulationVersions.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600">比較対象:</span>
                                    <Select value={selectedVersionId} onValueChange={handleVersionChange}>
                                        <SelectTrigger className="w-[280px] bg-white">
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

            {/* オリジナル版の読み取り専用バナー */}
            {isOriginal && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-amber-800">
                        <span className="text-xl">📥</span>
                        <div>
                            <p className="font-semibold">オリジナルデータ（読み取り専用）</p>
                            <p className="text-sm text-amber-600">相手方から提出されたデータです。編集するには「編集版として保存」してください。</p>
                        </div>
                    </div>
                    <Button 
                        onClick={handleSaveAsVersion}
                        disabled={isSavingVersion}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        {isSavingVersion ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        編集版として保存
                    </Button>
                </div>
            )}

            {/* 編集版の場合は保存ボタンを表示 */}
            {!isOriginal && submittedLink && (
                <div className="flex justify-end">
                    <Button 
                        onClick={handleSaveAsVersion}
                        disabled={isSavingVersion}
                        variant="outline"
                    >
                        {isSavingVersion ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        変更を新版として保存
                    </Button>
                </div>
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
                        readOnly={isOriginal}
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
                    {/* シミュレーション可視化チャート */}
                    <div className="pt-2">
                        <SimulationChart result={result} />
                    </div>
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
