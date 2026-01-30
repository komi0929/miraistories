'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
    saveResponse,
    getExistingResponse,
    checkLinkStatus
} from '../actions'
import { PreambleSection } from '@/components/ma-collect/preamble-section'
import { ExpenseSectionCollect } from '@/components/ma-collect/expense-section-collect'
import { SalesSectionCollect } from '@/components/ma-collect/sales-section-collect'
import { FactoryFeeSection } from '@/components/ma-collect/factory-fee-section'
import { CurrencyInput } from '@/components/dashboard/strategy/currency-input'
import { KeyRound, Save, Send, CheckCircle, Loader2, Eye, Copy, Check, HelpCircle } from 'lucide-react'
import { useMaSimulation } from '@/hooks/use-ma-simulation'
import { SimulationBar } from '@/components/ma-collect/simulation-bar'
import { ConfirmDialog } from '@/components/ma-collect/confirm-dialog'
import { SalesDeal, ExpenseItem } from '@/types/ma-types'

interface CollectFormClientProps {
    token: string
    linkId: string
}

// 固定認証コード
const FIXED_AUTH_CODE = '8888'

// 初期データ
const initialFormData = {
    desiredTransferPrice: 0,
    skeletonCost: 3000000, 
    rent: 0,
    utilities: 0,
    laborCostTotal: 0,
    laborDetails: [] as ExpenseItem[],
    otherExpensesTotal: 0,
    leaseDetails: [] as ExpenseItem[],
    useDetailedExpenses: true,
    maxCapacitySales: 0,
    costRatio: 35,
    salesStrategyMode: 'detailed' as 'simple' | 'detailed',
    monthlySalesSimple: 0,
    yearlySalesBaseline: { year1: 0, year2: 0, year3: 0 },
    deals: [] as SalesDeal[],
    factoryFeePercentage: 0
}

type FormData = typeof initialFormData

export function CollectFormClient({ token: _token, linkId }: CollectFormClientProps) {
    // 認証ステート（シンプル化: コード入力のみ）
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [authCode, setAuthCode] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    
    // フォームデータ
    const [formData, setFormData] = useState<FormData>(initialFormData)
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    
    // 送信済み状態 & 読み取り専用モード
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [isReadOnly, setIsReadOnly] = useState(false)
    
    // 下書き保存成功モーダル
    const [showDraftModal, setShowDraftModal] = useState(false)
    const [urlCopied, setUrlCopied] = useState(false)

    // 確認ダイアログの状態
    const [confirmOpen, setConfirmOpen] = useState(false)
    
    // リアルタイムシミュレーション
    const simResult = useMaSimulation(formData)
    
    // 現在のURL
    const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
    
    // 既存データを取得
    const loadExistingData = async () => {
        const result = await getExistingResponse(linkId)
        if (result.success && result.data) {
            const d = result.data
            
            // 送信済みの場合は読み取り専用モードに
            if (!d.is_draft) {
                setIsReadOnly(true)
            }
            
            // 旧データからの移行ロジック
            let loadedLaborDetails = d.labor_details || []
            let loadedLeaseDetails = d.lease_details || []
            
            if (!d.use_detailed_expenses) {
                if (d.labor_cost_total && d.labor_cost_total > 0 && loadedLaborDetails.length === 0) {
                    loadedLaborDetails = [{
                        id: 'legacy-labor',
                        name: '人件費（一括入力分）',
                        amount: d.labor_cost_total
                    }]
                }
                if (d.other_expenses_total && d.other_expenses_total > 0 && loadedLeaseDetails.length === 0) {
                    loadedLeaseDetails = [{
                        id: 'legacy-other',
                        name: 'その他経費（一括入力分）',
                        amount: d.other_expenses_total
                    }]
                }
            }

            setFormData({
                desiredTransferPrice: d.desired_transfer_price || 0,
                skeletonCost: d.skeleton_cost || 3000000,
                rent: d.rent || 0,
                utilities: d.utilities || 0,
                laborCostTotal: d.labor_cost_total || 0,
                laborDetails: loadedLaborDetails,
                otherExpensesTotal: d.other_expenses_total || 0,
                leaseDetails: loadedLeaseDetails,
                useDetailedExpenses: true,
                maxCapacitySales: d.max_capacity_sales || 0,
                costRatio: d.cost_ratio || 35,
                salesStrategyMode: 'detailed',
                monthlySalesSimple: d.monthly_sales_simple || 1200000,
                yearlySalesBaseline: d.yearly_sales_baseline || { year1: 0, year2: 0, year3: 0 },
                deals: d.deals || [],
                factoryFeePercentage: d.factory_fee_percentage || 0
            })
        }
    }
    
    // リンクステータス確認（送信済みチェック）
    useEffect(() => {
        const checkStatus = async () => {
            const result = await checkLinkStatus(linkId)
            if (result.success && result.status === 'submitted') {
                // 送信済みリンクの場合、認証後に読み取り専用で表示
                setIsReadOnly(true)
            }
        }
        checkStatus()
    }, [linkId])
    
    // コード認証
    const handleVerifyCode = async () => {
        if (authCode !== FIXED_AUTH_CODE) {
            setError('認証コードが正しくありません')
            return
        }
        
        setIsLoading(true)
        setError(null)
        
        // 認証成功
        setIsAuthenticated(true)
        
        // 既存データを取得
        await loadExistingData()
        
        setIsLoading(false)
    }
    
    // 下書き保存
    const handleSaveDraft = async () => {
        setIsSaving(true)
        
        const result = await saveResponse(linkId, {
            desired_transfer_price: formData.desiredTransferPrice,
            skeleton_cost: formData.skeletonCost,
            rent: formData.rent,
            utilities: formData.utilities,
            labor_cost_total: formData.laborDetails.reduce((sum, item) => sum + (item.amount || 0), 0),
            labor_details: formData.laborDetails,
            other_expenses_total: formData.leaseDetails.reduce((sum, item) => sum + (item.amount || 0), 0),
            lease_details: formData.leaseDetails,
            use_detailed_expenses: formData.useDetailedExpenses,
            max_capacity_sales: formData.maxCapacitySales,
            cost_ratio: formData.costRatio,
            sales_strategy_mode: formData.salesStrategyMode,
            monthly_sales_simple: formData.monthlySalesSimple,
            yearly_sales_baseline: formData.yearlySalesBaseline,
            deals: formData.deals,
            factory_fee_percentage: formData.factoryFeePercentage
        } as any, true)
        
        if (result.success) {
            setLastSaved(new Date())
            setShowDraftModal(true) // モーダル表示
        } else {
            setError(result.message || '下書き保存に失敗しました')
            // 自動的に消えるトーストなどで通知するのが望ましいが、既存のerror表示エリアを利用
        }
        
        setIsSaving(false)
    }
    
    // URLコピー
    const handleCopyUrl = async () => {
        await navigator.clipboard.writeText(currentUrl)
        setUrlCopied(true)
        setTimeout(() => setUrlCopied(false), 2000)
    }
    
    // 送信ボタンハンドラ
    const handleSubmit = async () => {
        if (!simResult.isPaybackOk) {
            setConfirmOpen(true)
            return
        }
        await executeSubmit()
    }
    
    // 実際の送信処理
    const executeSubmit = async (supplementalInfo?: string) => {
        if (!confirmOpen) {
            if (!confirm('入力内容を送信します。送信後は編集できなくなります。よろしいですか？')) {
                return
            }
        }
        
        setIsSaving(true)
        setConfirmOpen(false)
        
        const result = await saveResponse(linkId, {
            desired_transfer_price: formData.desiredTransferPrice,
            skeleton_cost: formData.skeletonCost,
            rent: formData.rent,
            utilities: formData.utilities,
            labor_cost_total: formData.laborDetails.reduce((sum, item) => sum + (item.amount || 0), 0),
            labor_details: formData.laborDetails,
            other_expenses_total: formData.leaseDetails.reduce((sum, item) => sum + (item.amount || 0), 0),
            lease_details: formData.leaseDetails,
            use_detailed_expenses: formData.useDetailedExpenses,
            max_capacity_sales: formData.maxCapacitySales,
            cost_ratio: formData.costRatio,
            sales_strategy_mode: formData.salesStrategyMode,
            monthly_sales_simple: formData.monthlySalesSimple,
            yearly_sales_baseline: formData.yearlySalesBaseline,
            deals: formData.deals,
            factory_fee_percentage: formData.factoryFeePercentage,
            supplemental_info: supplementalInfo || null
        } as any, false)
        
        if (result.success) {
            setIsSubmitted(true)
        } else {
            setError(result.message || '送信に失敗しました。再度お試しください。')
        }
        
        setIsSaving(false)
    }
    
    // 送信完了画面（URL付き）
    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center">
                    <CardContent className="pt-8 pb-8 space-y-4">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h1 className="text-xl font-bold text-slate-900 mb-2">
                            ご入力ありがとうございました
                        </h1>
                        <p className="text-slate-600">
                            条件のご入力が完了しました。<br />
                            担当者より追ってご連絡いたします。
                        </p>
                        <div className="bg-slate-100 p-4 rounded-lg text-left mt-4">
                            <p className="text-sm text-slate-600 mb-2">
                                入力いただいた内容はこちらから確認できます：
                            </p>
                            <div className="flex items-center gap-2">
                                <Input 
                                    value={currentUrl} 
                                    readOnly 
                                    className="text-xs bg-white"
                                />
                                <Button 
                                    variant="outline" 
                                    size="icon"
                                    onClick={handleCopyUrl}
                                >
                                    {urlCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                ※ 確認には認証コードが必要です
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }
    
    // 認証画面（コード入力のみ）
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader className="text-center">
                        <CardTitle className="flex items-center justify-center gap-2">
                            <KeyRound className="w-5 h-5" /> 認証コードの入力
                        </CardTitle>
                        <CardDescription>
                            担当者からお伝えした4桁のコードを入力してください。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">認証コード</Label>
                            <input
                                id="code"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="0000"
                                maxLength={4}
                                value={authCode}
                                onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, ''))}
                                onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-center text-2xl tracking-widest ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                autoComplete="off"
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}
                        <Button 
                            className="w-full" 
                            onClick={handleVerifyCode}
                            disabled={isLoading || authCode.length !== 4}
                        >
                            {isLoading ? '確認中...' : '認証する'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }
    
    // 読み取り専用モード（送信済みデータの確認）
    if (isReadOnly) {
        return (
            <div className="min-h-screen bg-slate-50 pb-8">
                {/* 読み取り専用ヘッダー */}
                <div className="sticky top-0 z-10 bg-amber-50 border-b border-amber-200">
                    <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
                        <Eye className="w-5 h-5 text-amber-600" />
                        <span className="font-medium text-amber-800">
                            確認モード（編集できません）
                        </span>
                    </div>
                </div>
                
                <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 opacity-80 pointer-events-none">
                    <PreambleSection />
                    
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">退去時費用</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label>スケルトン工事費用（税込）</Label>
                                <CurrencyInput
                                    value={formData.skeletonCost}
                                    onChange={() => {}}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-amber-300 bg-amber-50/50">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <span className="text-amber-600">譲渡希望価格（税込）</span>
                                <HelpCircle className="w-4 h-4 text-amber-400" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <CurrencyInput
                                    value={formData.desiredTransferPrice}
                                    onChange={() => {}}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <ExpenseSectionCollect 
                        data={formData}
                        onChange={() => {}}
                    />
                    
                    <SalesSectionCollect
                        data={formData}
                        onChange={() => {}}
                    />
                    
                    <FactoryFeeSection
                        data={formData}
                        averageMonthlyFeeRevenue={simResult.averageMonthlyFeeRevenue}
                        onChange={() => {}}
                    />
                </div>

                <SimulationBar 
                    paybackYears={simResult.paybackYears}
                    isPaybackOk={simResult.isPaybackOk}
                    cumulativeOperatingProfit={simResult.cumulativeOperatingProfit}
                    requiredImprovementPerMonth={simResult.requiredImprovementPerMonth}
                    finalCash={simResult.summary.finalCash}
                />
            </div>
        )
    }
    
    // メインフォーム（編集可能）
    return (
        <div className="min-h-screen bg-slate-50 pb-32 transition-all">
            {/* 固定ヘッダー */}
            <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                        情報入力フォーム
                    </div>
                    <div className="flex items-center gap-2">
                        {lastSaved && (
                            <span className="text-xs text-slate-500">
                                最終保存: {lastSaved.toLocaleTimeString('ja-JP')}
                            </span>
                        )}
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleSaveDraft}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                            下書き保存
                        </Button>
                    </div>
                </div>
            </div>
            
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
                <PreambleSection />
                
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">退去時費用</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label>スケルトン工事費用（税込）</Label>
                            <CurrencyInput
                                value={formData.skeletonCost}
                                onChange={(val) => setFormData(prev => ({ ...prev, skeletonCost: val }))}
                            />
                            <p className="text-xs text-slate-500">
                                ※ デフォルトで300万円が設定されています
                            </p>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="border-amber-300 bg-amber-50/50">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <span className="text-amber-600">譲渡希望価格（税込）</span>
                            <HelpCircle className="w-4 h-4 text-amber-400" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <CurrencyInput
                                value={formData.desiredTransferPrice}
                                onChange={(val) => setFormData(prev => ({ ...prev, desiredTransferPrice: val }))}
                            />
                            <p className="text-xs text-amber-700">
                                ※在庫資産や営業権（のれん）を含めた総額イメージをご入力ください
                            </p>
                        </div>
                    </CardContent>
                </Card>
                
                <ExpenseSectionCollect 
                    data={formData}
                    onChange={setFormData}
                />
                
                <SalesSectionCollect
                    data={formData}
                    onChange={setFormData}
                />
                
                <FactoryFeeSection
                    data={formData}
                    averageMonthlyFeeRevenue={simResult.averageMonthlyFeeRevenue}
                    onChange={setFormData}
                />
                
                {/* 送信ボタン */}
                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-6">
                        <div className="mb-4 p-3 bg-white/60 rounded border border-blue-100 text-xs text-slate-500">
                            <strong>※シミュレーションに関するご注意</strong><br />
                            表示される回収期間や利益額は、税引前・償却前・仲介手数料抜きの概算値です。
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            {error && (
                                <div className="w-full mb-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                                    {error}
                                </div>
                            )}
                            {simResult.alerts.length > 0 && (
                                <div className="w-full mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800 space-y-1">
                                    {simResult.alerts.map((msg, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                            <span>⚠️</span>
                                            <span>{msg.replace('⚠️ ', '')}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="text-sm text-blue-700">
                                入力が完了しましたら、送信ボタンを押してください。<br />
                                <span className="text-blue-600">※ 送信後は編集できなくなります</span>
                            </div>
                            <Button 
                                size="lg"
                                onClick={handleSubmit}
                                disabled={isSaving}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                入力内容を送信
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <SimulationBar 
                paybackYears={simResult.paybackYears}
                isPaybackOk={simResult.isPaybackOk}
                cumulativeOperatingProfit={simResult.cumulativeOperatingProfit}
                requiredImprovementPerMonth={simResult.requiredImprovementPerMonth}
                finalCash={simResult.summary.finalCash}
            />

            <ConfirmDialog 
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={executeSubmit}
                paybackYears={simResult.paybackYears}
                cumulativeOperatingProfit={simResult.cumulativeOperatingProfit}
                isPaybackOk={simResult.isPaybackOk}
            />
            
            {/* 下書き保存成功モーダル */}
            {showDraftModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="max-w-md w-full">
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="w-6 h-6" />
                                <h2 className="font-bold text-lg">下書きを保存しました</h2>
                            </div>
                            <p className="text-sm text-slate-600">
                                続きは以下のURLより編集できますので、保管をお願いします。
                            </p>
                            <div className="flex items-center gap-2">
                                <Input 
                                    value={currentUrl} 
                                    readOnly 
                                    className="text-xs bg-slate-50"
                                />
                                <Button 
                                    variant="outline" 
                                    size="icon"
                                    onClick={handleCopyUrl}
                                >
                                    {urlCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500">
                                ※ 次回アクセス時も認証コードが必要です
                            </p>
                            <Button 
                                className="w-full"
                                onClick={() => setShowDraftModal(false)}
                            >
                                閉じる
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
