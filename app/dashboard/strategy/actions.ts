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

        const context = `あなたはM&A投資アドバイザーです。洋菓子店の買収案件について相談を受けています。

## 現在の入力データ
- 譲渡価格: ${data.acquisitionCost.toLocaleString()}円
- 初期改装費: ${data.renovationCost.toLocaleString()}円
- スケルトン費用: ${data.skeletonCost.toLocaleString()}円
- 月間売上予測: ${data.monthlySales.toLocaleString()}円
- 原価率: ${data.costRatio}%
- 月額家賃: ${data.rent.toLocaleString()}円
- 月額人件費: ${data.laborCost.toLocaleString()}円
- 月額光熱費: ${data.utilities.toLocaleString()}円
- 月額その他経費: ${data.otherExpenses.toLocaleString()}円

## シミュレーション結果
- 月間粗利: ${result.monthlyGrossProfit.toLocaleString()}円
- 月間営業利益: ${result.monthlyOperatingProfit.toLocaleString()}円
- 年間キャッシュフロー: ${result.annualCashFlow.toLocaleString()}円
- 総投資額: ${result.totalInvestment.toLocaleString()}円
- 回収期間: ${result.paybackMonths === Infinity ? '回収不可' : `${result.paybackMonths}ヶ月`}
- 3年以内回収: ${result.canRecoverIn3Years ? '✅ 可能' : '❌ 不可'}

## 指示
- 日本語で回答してください
- 具体的な数値を用いて説明してください
- リスクがある場合は明確に指摘してください
- 改善提案がある場合は具体的に提示してください
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

## 入力データ
- 譲渡価格: ${data.acquisitionCost.toLocaleString()}円
- 初期改装費: ${data.renovationCost.toLocaleString()}円  
- スケルトン費用: ${data.skeletonCost.toLocaleString()}円
- 月間売上予測: ${data.monthlySales.toLocaleString()}円
- 原価率: ${data.costRatio}%
- 月額販管費合計: ${(data.rent + data.laborCost + data.utilities + data.otherExpenses).toLocaleString()}円

## シミュレーション結果
- 月間営業利益: ${result.monthlyOperatingProfit.toLocaleString()}円
- 回収期間: ${result.paybackMonths === Infinity ? '回収不可' : `${result.paybackMonths}ヶ月`}
- 3年以内回収: ${result.canRecoverIn3Years ? '可能' : '不可'}

## レビュー指示
1. この案件の投資判断について簡潔にコメントしてください
2. 問題点やリスクがあれば指摘してください
3. 改善できる点があれば提案してください

200文字以内で簡潔に回答してください。`

        const response = await model.generateContent(prompt)
        return response.response.text()
    } catch (error) {
        console.error('AI review error:', error)
        return 'レビューを生成できませんでした。'
    }
}
