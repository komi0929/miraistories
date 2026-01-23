'use server'

import { getGeminiModel } from '@/lib/ai/gemini'
import { SimulationData, SimulationResult } from '@/lib/ma-simulation'

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

        let salesAnalysis = ''
        if (data.salesStrategyMode === 'detailed') {
            salesAnalysis = `
売上詳細:
- 1期目ベース: ${data.yearlySalesBaseline.year1.toLocaleString()}円
- 2期目ベース: ${data.yearlySalesBaseline.year2.toLocaleString()}円
- 3期目ベース: ${data.yearlySalesBaseline.year3.toLocaleString()}円
- 積み上げ案件数: ${data.deals.length}件
- シミュレーション適用フィルタ: ${data.probabilityFilter === 'all' ? 'すべて' : data.probabilityFilter === 'high_only' ? '高確度のみ' : '重み付け'}
`
        }

        const context = `あなたはM&A投資アドバイザーです。洋菓子店の買収案件について相談を受けています。

## 現在の入力データ
- 譲渡価格: ${data.acquisitionCost.toLocaleString()}円
- 初期改装費: ${data.renovationCost.toLocaleString()}円
- スケルトン費用: ${data.skeletonCost.toLocaleString()}円
- 経費モード: ${data.useDetailedExpenses ? '詳細入力' : '簡易入力'}
- 月額家賃: ${data.rent.toLocaleString()}円
${salesAnalysis}

## シミュレーション結果
- 初期投資合計: ${result.totalInvestment.toLocaleString()}円
- 初年度CF: ${result.annualCashFlow.toLocaleString()}円
- 回収期間: ${result.paybackMonths === Infinity ? '回収不可' : `${result.paybackMonths}ヶ月`}
- 3年以内回収: ${result.canRecoverIn3Years ? '✅ 可能' : '❌ 不可'}

## 指示
- 日本語で回答してください
- 具体的な数値を用いて説明してください
- リスクがある場合は明確に指摘してください
- 特に、回収期間が36ヶ月を超える場合は、どこを削減すべきか、売上をどう伸ばすべきか提案してください
`

        const prompt = `${context}

ユーザーからの質問・相談:
${userMessage}

回答:`

        const response = await model.generateContent(prompt)
        return response.response.text()
    } catch (error) {
        console.error('AI chat error:', error)
        return 'AIサービスに接続できませんでした。GOOGLE_API_KEYが設定されているか確認してください。'
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

        const prompt = `あなたはM&A投資アドバイザーです。以下の洋菓子店買収案件のシミュレーション結果をレビューしてください。

## データ要約
- 投資額: ${result.totalInvestment.toLocaleString()}円
- 回収期間: ${result.paybackMonths === Infinity ? '回収不可' : `${result.paybackMonths}ヶ月`} (目標:36ヶ月以内)
- 3年判定: ${result.canRecoverIn3Years ? '合格' : '不合格'}
${data.salesStrategyMode === 'detailed' ? `- 売上戦略: 詳細モード（期別変動・案件積み上げ考慮）` : ''}

## レビュー指示
1. 投資判断（Go/No-Go）の参考意見をズバリ述べてください。
2. 最も懸念されるリスク要因を1つ挙げてください。
3. 成功確率を上げるための具体的な改善案を1つ提示してください。

200文字以内で簡潔にまとめてください。`

        const response = await model.generateContent(prompt)
        return response.response.text()
    } catch (error) {
        console.error('AI review error:', error)
        return 'レビューを生成できませんでした。'
    }
}
