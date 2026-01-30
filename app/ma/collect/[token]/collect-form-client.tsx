'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
    requestVerification, 
    verifyCode, 
    checkRespondentAuth,
    saveResponse,
    getExistingResponse 
} from '../actions'
import { PreambleSection } from '@/components/ma-collect/preamble-section'
import { ExpenseSectionCollect } from '@/components/ma-collect/expense-section-collect'
import { SalesSectionCollect } from '@/components/ma-collect/sales-section-collect'
import { FactoryFeeSection } from '@/components/ma-collect/factory-fee-section'
import { CurrencyInput } from '@/components/dashboard/strategy/currency-input'
import { Mail, KeyRound, Save, Send, CheckCircle, Loader2 } from 'lucide-react'
import { useMaSimulation } from '@/hooks/use-ma-simulation'
import { SimulationBar } from '@/components/ma-collect/simulation-bar'
import { ConfirmDialog } from '@/components/ma-collect/confirm-dialog'
import { SalesDeal, ExpenseItem } from '@/types/ma-types'

interface CollectFormClientProps {
    token: string
    linkId: string
}

// 初期データ
const initialFormData = {
    desiredTransferPrice: 0, // 譲渡希望価格（税込）
    skeletonCost: 3000000, 
    rent: 0,
    utilities: 0,
    laborCostTotal: 0,
    laborDetails: [] as ExpenseItem[],
    otherExpensesTotal: 0,
    leaseDetails: [] as ExpenseItem[],
    useDetailedExpenses: true,
    maxCapacitySales: 0, // 人員キャパシティ
    costRatio: 35,
    salesStrategyMode: 'simple' as 'simple' | 'detailed',
    monthlySalesSimple: 0,
    yearlySalesBaseline: { year1: 0, year2: 0, year3: 0 },
    deals: [] as SalesDeal[],
    factoryFeePercentage: 0
}

type FormData = typeof initialFormData

export function CollectFormClient({ token, linkId }: CollectFormClientProps) {
    // 認証ステート
    const [authStep, setAuthStep] = useState<'email' | 'code' | 'authenticated'>('email')
    const [email, setEmail] = useState('')
    const [verificationCode, setVerificationCode] = useState('')
    const [respondentId, setRespondentId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [devCode, setDevCode] = useState<string | null>(null)
    
    // フォームデータ
    const [formData, setFormData] = useState<FormData>(initialFormData)
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const [isSubmitted, setIsSubmitted] = useState(false)

    // 確認ダイアログの状態
    const [confirmOpen, setConfirmOpen] = useState(false)
    
    // リアルタイムシミュレーション
    const simResult = useMaSimulation(formData)
    
    // 既存データを取得
    const loadExistingData = async (resId: string) => {
        const result = await getExistingResponse(linkId, resId)
        if (result.success && result.data) {
            const d = result.data
            
            // 旧データ（簡易入力）からの移行ロジック
            let loadedLaborDetails = d.labor_details || []
            let loadedLeaseDetails = d.lease_details || []
            
            // 詳細モードがOFF、かつ合計のみ入力されていた場合、それを詳細項目の1つとして復元する
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
                useDetailedExpenses: true, // 常に詳細モードON
                maxCapacitySales: d.max_capacity_sales || 0,
                costRatio: d.cost_ratio || 35,
                // デフォルト値
                salesStrategyMode: 'detailed',
                monthlySalesSimple: d.monthly_sales_simple || 1200000,
                yearlySalesBaseline: d.yearly_sales_baseline || { year1: 0, year2: 0, year3: 0 },
                deals: d.deals || [],
                factoryFeePercentage: d.factory_fee_percentage || 0
            })
        }
    }
    
    // セッション復元（localStorage）
    useEffect(() => {
        const restoreSession = async () => {
            const savedEmail = localStorage.getItem(`ma_collect_${token}_email`)
            if (savedEmail) {
                const result = await checkRespondentAuth(linkId, savedEmail)
                if (result.authenticated && result.respondentId) {
                    setEmail(savedEmail)
                    setRespondentId(result.respondentId)
                    setAuthStep('authenticated')
                    loadExistingData(result.respondentId)
                }
            }
        }
        restoreSession()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, linkId])
    
    // メール送信
    const handleSendCode = async () => {
        if (!email.trim() || !email.includes('@')) {
            setError('有効なメールアドレスを入力してください')
            return
        }
        
        setIsLoading(true)
        setError(null)
        
        const result = await requestVerification(linkId, email)
        
        if (result.success) {
            setAuthStep('code')
            localStorage.setItem(`ma_collect_${token}_email`, email)
            if (result.devCode) {
                setDevCode(result.devCode)
            }
        } else {
            setError(result.message || '送信に失敗しました')
        }
        
        setIsLoading(false)
    }
    
    // コード検証
    const handleVerifyCode = async () => {
        if (verificationCode.length !== 6) {
            setError('6桁のコードを入力してください')
            return
        }
        
        setIsLoading(true)
        setError(null)
        
        const result = await verifyCode(linkId, email, verificationCode)
        
        if (result.success && result.respondentId) {
            setRespondentId(result.respondentId)
            setAuthStep('authenticated')
            setDevCode(null)
            // 既存データを取得
            loadExistingData(result.respondentId)
        } else {
            setError(result.error || '認証に失敗しました')
        }
        
        setIsLoading(false)
    }
    
    // 下書き保存
    const handleSaveDraft = async () => {
        if (!respondentId) return
        
        setIsSaving(true)
        
        const result = await saveResponse(linkId, respondentId, {
            desired_transfer_price: formData.desiredTransferPrice,
            skeleton_cost: formData.skeletonCost,
            rent: formData.rent,
            utilities: formData.utilities,
            // 詳細配列から合計を計算して保存
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
        }
        
        setIsSaving(false)
    }
    
    // 送信ボタンハンドラ（確認フロー追加）
    const handleSubmit = async () => {
        if (!respondentId) return

        // シミュレーション結果が36ヶ月（3年）を超える場合は確認ダイアログを表示
        // isPaybackOkがfalseの場合
        if (!simResult.isPaybackOk) {
            setConfirmOpen(true)
            return
        }
        
        // 問題なければ即時送信
        await executeSubmit()
    }
    
    // 実際の送信処理
    const executeSubmit = async (supplementalInfo?: string) => {
        if (!respondentId) return

        // ダイアログが開いていない（条件クリア）場合のみ標準confirmを出す
        if (!confirmOpen) {
            if (!confirm('入力内容を送信します。送信後は編集できなくなります。よろしいですか？')) {
                return
            }
        }
        
        setIsSaving(true)
        setConfirmOpen(false)
        
        const result = await saveResponse(linkId, respondentId, {
            desired_transfer_price: formData.desiredTransferPrice,
            skeleton_cost: formData.skeletonCost,
            rent: formData.rent,
            utilities: formData.utilities,
            // 詳細配列から合計を計算して保存
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
    
    // 送信完了画面
    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center">
                    <CardContent className="pt-8 pb-8">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h1 className="text-xl font-bold text-slate-900 mb-2">
                            ご入力ありがとうございました
                        </h1>
                        <p className="text-slate-600">
                            条件のご入力が完了しました。<br />
                            担当者より追ってご連絡いたします。
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }
    
    // 認証画面
    if (authStep !== 'authenticated') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader className="text-center">
                        <CardTitle className="flex items-center justify-center gap-2">
                            {authStep === 'email' ? (
                                <><Mail className="w-5 h-5" /> メールアドレスの確認</>
                            ) : (
                                <><KeyRound className="w-5 h-5" /> 認証コードの入力</>
                            )}
                        </CardTitle>
                        <CardDescription>
                            {authStep === 'email' 
                                ? '入力を開始するため、メールアドレスをご登録ください。'
                                : `${email} に送信された6桁のコードを入力してください。`
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {authStep === 'email' ? (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="email">メールアドレス</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                                    />
                                </div>
                                {error && (
                                    <p className="text-sm text-red-600">{error}</p>
                                )}
                                <Button 
                                    className="w-full" 
                                    onClick={handleSendCode}
                                    disabled={isLoading}
                                >
                                    {isLoading ? '送信中...' : '認証コードを送信'}
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="code">認証コード（6桁）</Label>
                                    <Input
                                        id="code"
                                        type="text"
                                        placeholder="000000"
                                        maxLength={6}
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                                        className="text-center text-2xl tracking-widest"
                                    />
                                </div>
                                {devCode && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                                        <p className="font-medium text-yellow-800">開発モード</p>
                                        <p className="text-yellow-700">認証コード: <span className="font-mono font-bold">{devCode}</span></p>
                                    </div>
                                )}
                                {error && (
                                    <p className="text-sm text-red-600">{error}</p>
                                )}
                                <Button 
                                    className="w-full" 
                                    onClick={handleVerifyCode}
                                    disabled={isLoading}
                                >
                                    {isLoading ? '確認中...' : '認証する'}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="w-full text-sm"
                                    onClick={() => setAuthStep('email')}
                                >
                                    別のメールアドレスを使用
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }
    
    // メインフォーム
    return (
        <div className="min-h-screen bg-slate-50 pb-32 transition-all"> {/* pb-32で固定バー分のスペース確保 */}
            {/* 固定ヘッダー */}
            <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                        <span className="font-medium">{email}</span> でログイン中
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
                {/* 前提条件 */}
                <PreambleSection />
                
                {/* スケルトン費用 */}
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
                
                {/* 販管費 */}
                <ExpenseSectionCollect 
                    data={formData}
                    onChange={setFormData}
                />
                
                {/* 売上見込み */}
                <SalesSectionCollect
                    data={formData}
                    onChange={setFormData}
                />
                
                {/* 委託工場フィー */}
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

            {/* シミュレーション結果バー */}
            <SimulationBar 
                paybackYears={simResult.paybackYears}
                isPaybackOk={simResult.isPaybackOk}
                cumulativeOperatingProfit={simResult.cumulativeOperatingProfit}
                requiredImprovementPerMonth={simResult.requiredImprovementPerMonth}
            />

            {/* 送信確認ダイアログ */}
            <ConfirmDialog 
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={executeSubmit}
                paybackYears={simResult.paybackYears}
                cumulativeOperatingProfit={simResult.cumulativeOperatingProfit}
                isPaybackOk={simResult.isPaybackOk}
            />
        </div>
    )
}
