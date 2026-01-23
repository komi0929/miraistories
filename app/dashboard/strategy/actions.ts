'use server'

import { getGeminiModel } from '@/lib/ai/gemini'
import { SimulationData, SimulationResult } from '@/lib/ma-simulation'

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
    const totalExpenses = data.rent + data.laborCostTotal + data.utilities + data.otherExpensesTotal +
        (data.useDetailedExpenses ? data.laborDetails.reduce((s, i) => s + i.amount, 0) - data.laborCostTotal : 0) +
        (data.useDetailedExpenses ? data.leaseDetails.reduce((s, i) => s + i.amount, 0) - data.otherExpensesTotal : 0)

    const laborCost = data.useDetailedExpenses
        ? data.laborDetails.reduce((s, i) => s + i.amount, 0)
        : data.laborCostTotal

    // 損益分岐点売上 = 固定費 / (1 - 原価率)
    const breakEvenPoint = totalExpenses / (1 - (data.costRatio / 100))

    // 労働分配率 = 人件費 / 粗利
    const laborShare = laborCost / result.monthlyGrossProfit * 100

    // 家賃比率 = 家賃 / 売上
    const rentRatio = data.rent / (data.salesStrategyMode === 'simple' ? data.monthlySalesSimple : data.yearlySalesBaseline.year1) * 100

    return {
        breakEvenPoint,
        laborShare,
        rentRatio,
        actualMonthlyProfit: result.monthlyOperatingProfit, // 実際の営業利益
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
    } catch (error) {
        console.error('AI chat error:', error)
        return '申し訳ありません。現在AIパートナーに接続できません。しばらく待ってから再試行してください。'
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
    } catch (error) {
        console.error('AI review error:', error)
        return 'レビューを生成できませんでした。'
    }
}
