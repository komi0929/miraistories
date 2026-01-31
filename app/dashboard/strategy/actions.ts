'use server'

import { getGeminiModel } from '@/lib/ai/gemini'
import { SimulationData, SimulationResult } from '@/lib/ma-simulation'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database, Json } from '@/types/database.types'
import { revalidatePath } from 'next/cache'

const ADVISOR_PERSONA = `
あなたは、スイーツ/飲食業界に精通した、極めて有能かつ冷徹な「戦略的CFO兼法務パートナー」です。
ユーザー（買い手）の利益最大化とリスク最小化を絶対的な使命とします。

## あなたのスタンス
1.  **数字は嘘をつかない**: 感情論ではなく、提示された数値を冷徹に分析し、矛盾や甘い見通し（バラ色の未来）があれば容赦なく指摘します。
2.  **法的リスクの番人**: 契約形態（事業譲渡/株式譲渡）、簿外債務、退去時の原状回復義務（スケルトン戻し）、雇用の承継リスクについて常に警戒します。
3.  **交渉のプロ**: 相手方（売り手）の提示額を鵜呑みにせず、減額交渉の材料やカウンターオファーの戦術を具体的に授けます。
4.  **解決策の提示**: 単に批判するだけでなく、「どうすれば回収できるか（BEPを下げる、単価を上げる、スキームを変える）」という建設的な代替案を必ずセットで提示します。
`

/**
 * 財務指標の計算・分析ヘルパー
 */
function analyzeFinancials(data: SimulationData, result: SimulationResult) {
    // 経費は再計算せず、シミュレーション結果（1ヶ月目）から取得して整合性を担保
    // ※月次で変動しない前提の簡易シミュレーション
    const totalExpenses = result.monthlyData[0]?.expenses || (
        data.rent + data.laborCostTotal + data.utilities + data.otherExpensesTotal +
        (data.useDetailedExpenses ? data.laborDetails.reduce((s, i) => s + i.amount, 0) - data.laborCostTotal : 0) +
        (data.useDetailedExpenses ? data.leaseDetails.reduce((s, i) => s + i.amount, 0) - data.otherExpensesTotal : 0)
    )

    const laborCost = data.useDetailedExpenses
        ? data.laborDetails.reduce((s, i) => s + i.amount, 0)
        : data.laborCostTotal

    // 損益分岐点売上 (BEP)
    // 計算式: 固定費 / (1 - 変動費率)
    // 変動費率 = 原価率 + (委託工場フィー / 売上)
    
    // 現在の売上（月商）
    const currentSales = data.salesStrategyMode === 'simple' 
        ? data.monthlySalesSimple 
        : data.yearlySalesBaseline.year1 + data.deals.reduce((acc, deal) => {
            // 簡易的に全案件が乗っていると仮定するか、シミュレーション結果から逆算するか
            // ここではresult.monthlyData[0].salesを採用するのが最も正確
            return 0
        }, 0)
    
    // 正確な月商を取得
    const monthlySales = result.monthlyData[0]?.sales || 1

    // 委託工場フィー率（対売上）
    const factoryFee = result.monthlyData[0]?.factoryFee || 0
    const factoryFeeRatio = monthlySales > 0 ? factoryFee / monthlySales : 0
    
    // 変動費率合計
    const variableCostRatio = (data.costRatio / 100) + factoryFeeRatio

    // BEP計算（分母が0にならないよう保護）
    const breakEvenPoint = variableCostRatio < 1 
        ? totalExpenses / (1 - variableCostRatio) 
        : totalExpenses * 10 // 利益が出ない構造の場合は極端な値を防ぐ

    // 労働分配率 = 人件費 / 実質粗利
    // 実質粗利 = 売上 - 原価 - 委託工場フィー
    const actualGrossProfit = result.monthlyGrossProfit
    const laborShare = actualGrossProfit > 0 ? (laborCost / actualGrossProfit * 100) : 0

    // 家賃比率 = 家賃 / 売上
    const rentRatio = monthlySales > 0 ? (data.rent / monthlySales * 100) : 0

    return {
        breakEvenPoint,
        laborShare,
        rentRatio,
        actualMonthlyProfit: result.monthlyOperatingProfit,
        monthlySales,
        factoryFee
    }
}

/**
 * AIチャット - M&Aアドバイス
 */
export async function chatWithAI(
    data: SimulationData,
    result: SimulationResult,
    userMessage: string
): Promise<string> {
    try {
        const model = getGeminiModel()
        const analysis = analyzeFinancials(data, result)

        // 売上詳細情報の構築
        let salesContext = ''
        if (data.salesStrategyMode === 'simple') {
            salesContext = `- 月間売上予測: ${data.monthlySalesSimple.toLocaleString()}円 (固定)`
        } else {
            salesContext = `
- 1期目ベース売上: ${data.yearlySalesBaseline.year1.toLocaleString()}円
- 2期目ベース売上: ${data.yearlySalesBaseline.year2.toLocaleString()}円
- 3期目ベース売上: ${data.yearlySalesBaseline.year3.toLocaleString()}円
- 積み上げ案件数: ${data.deals.length}件
- シミュレーション適用フィルタ: ${data.probabilityFilter}
- 委託工場フィー設定: ${data.factoryFeePercentage ? `${data.factoryFeePercentage}%` : 'なし'}
`
        }

        const context = `
${ADVISOR_PERSONA}

## 現在の案件データ分析
### 1. 財務状況
- 初期投資総額: ${result.totalInvestment.toLocaleString()}円 (内スケルトン: ${data.skeletonCost.toLocaleString()}円)
- 月間営業利益: ${result.monthlyOperatingProfit.toLocaleString()}円
- 損益分岐点売上(BEP): 月商 ${Math.round(analysis.breakEvenPoint).toLocaleString()}円
  (現在の設定売上との差: ${(result.monthlyGrossProfit / (1 - data.costRatio / 100) - analysis.breakEvenPoint).toLocaleString()}円)
- 労働分配率: ${analysis.laborShare.toFixed(1)}% (適正目安: 35-40%, 50%超は危険水域)
- 家賃比率: ${analysis.rentRatio.toFixed(1)}% (適正目安: 10%以下)
- 委託工場フィー負担: ${analysis.factoryFee.toLocaleString()}円/月

### 2. 回収シミュレーション
- 回収期間: ${result.paybackMonths === Infinity ? '回収不能' : `${result.paybackMonths}ヶ月`}
- 3年以内回収判定: ${result.canRecoverIn3Years ? '✅ 可能' : '❌ 深刻なリスクあり'}
- 初年度CF: ${result.annualCashFlow.toLocaleString()}円

${salesContext}

## ユーザーからの相談
"${userMessage}"

## 回答ガイドライン
- 以下のMD形式で回答してください。
1. **結論**: 質問に対するダイレクトな答え（Yes/No/条件付きYes）。
2. **財務・法務視点の分析**: 上記指標に基づいた客観的評価。特にBEPや固定費の重さ、出口コスト（スケルトン）のリスクに言及すること。
3. **戦略的アドバイス**: 
   - 利益が出ない場合→「人件費を〇〇円削るべき」「客単価を上げて原価率を〇〇%に下げるべき」
   - 契約リスク→「事業譲渡契約書に明記すべき条項」「競業避止義務の期間設定」など
   - 交渉→「この数字なら譲渡価格を〇〇円まで下げるよう交渉可能です」
- 語尾は「〜です」「〜と考えます」とし、断定的に、しかしパートナーとして親身に。
`

        const response = await model.generateContent(context)
        return response.response.text()
    } catch (error: any) {
        console.error('AI chat error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return `申し訳ありません。現在AIパートナーに接続できません。\nエラー詳細: ${errorMessage}\n(API Key configured: ${!!process.env.GOOGLE_API_KEY})`
    }
}

/**
 * AIによる自動レビュー
 */
export async function getAIReview(
    data: SimulationData,
    result: SimulationResult
): Promise<string> {
    try {
        const model = getGeminiModel()
        const analysis = analyzeFinancials(data, result)

        const prompt = `
${ADVISOR_PERSONA}

以下のM&A案件のシミュレーション結果を、プロフェッショナルな視点で厳しくレビューしてください。

## 財務データ概要
- 投資額: ${result.totalInvestment.toLocaleString()}円 (内スケルトン: ${data.skeletonCost.toLocaleString()}円)
- 回収期間: ${result.paybackMonths === Infinity ? '回収不能' : `${result.paybackMonths}ヶ月`} (目標36ヶ月)
- 損益分岐点(BEP): 月商 ${Math.round(analysis.breakEvenPoint).toLocaleString()}円
- 労働分配率: ${analysis.laborShare.toFixed(1)}%
- 家賃比率: ${analysis.rentRatio.toFixed(1)}%
- 委託工場フィー負担: ${analysis.factoryFee.toLocaleString()}円/月

## レビュー指示
250文字以内で、以下の構成で出力してください。

### 1. 投資判断 (Go/No-Go/Conditional)
ズバリこの条件で進めるべきか、止めるべきか、条件変更が必要か。

### 2. 最大のリスク
(例: 「労働分配率がXX%と高く、売上が少しでも落ちれば即赤字転落します」「退去コストへの備えがありません」)

### 3. 次のアクション
(例: 「家賃交渉で月XX万下げる」「まずはスキームを事業譲渡に限定し、簿外債務を遮断する」)
`

        const response = await model.generateContent(prompt)
        return response.response.text()
    } catch (error: any) {
        console.error('AI review error:', error)
        // デバッグ用に詳細なエラーを返す
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return `レビューを生成できませんでした。\n\nエラー詳細: ${errorMessage}\n(API Key configured: ${!!process.env.GOOGLE_API_KEY})`
    }
}

/**
 * シミュレーション履歴の保存
 */
export async function saveSimulation(
    data: SimulationData,
    title: string,
    sourceLinkId?: string | null,
    versionType?: 'original' | 'custom'
) {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('ログインが必要です')
    }

    // version_numberを計算（source_link_idがある場合は既存版の最大値+1）
    let versionNumber = 1
    if (sourceLinkId) {
        const { data: existing } = await supabase
            .from('ma_simulations')
            .select('version_number')
            .eq('source_link_id', sourceLinkId)
            .order('version_number', { ascending: false })
            .limit(1)
            .single()
        if (existing) {
            versionNumber = (existing.version_number || 0) + 1
        }
    }

    // 型定義が修正されたため、正しい型を使用
    const { error } = await supabase
        .from('ma_simulations')
        .insert({
            user_id: user.id,
            title: title || '無題のシミュレーション',
            simulation_data: data as unknown as Json,
            source_link_id: sourceLinkId || null,
            version_type: versionType || 'custom',
            version_number: versionNumber
        })

    if (error) {
        console.error('Save error:', error)
        throw new Error('保存に失敗しました')
    }

    revalidatePath('/dashboard/strategy')
    return { success: true }
}

/**
 * シミュレーション履歴の取得
 */
export async function getSimulations() {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data, error } = await supabase
        .from('ma_simulations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Fetch error:', error)
        return []
    }

    return (data || []).map((item: any) => ({
        ...item,
        simulation_data: item.simulation_data as unknown as SimulationData
    }))
}

/**
 * シミュレーション履歴の削除
 */
export async function deleteSimulation(id: string) {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('ログインが必要です')
    }

    const { error } = await supabase
        .from('ma_simulations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) {
        throw new Error('削除に失敗しました')
    }

    revalidatePath('/dashboard/strategy')
    return { success: true }
}
