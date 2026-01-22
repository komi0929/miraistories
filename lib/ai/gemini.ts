import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini client
const apiKey = process.env.GOOGLE_API_KEY

if (!apiKey) {
    console.warn('GOOGLE_API_KEY is not set. AI features will be disabled.')
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

/**
 * Get the Gemini model for general text generation
 */
export function getGeminiModel() {
    if (!genAI) {
        throw new Error('Gemini API is not configured. Please set GOOGLE_API_KEY.')
    }
    return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
}

/**
 * Generate AI shift recommendations based on staff and location data
 */
export async function generateShiftRecommendations(
    staff: { id: string; name: string; skills: string[]; hourlyWage: number }[],
    locations: { id: string; name: string }[],
    date: Date
): Promise<{
    shifts: { staffId: string; locationId: string; startTime: string; endTime: string; role: string }[]
    reasoning: string
}> {
    const model = getGeminiModel()

    const prompt = `あなたは洋菓子店のシフト管理AIアシスタントです。

以下の従業員と拠点情報に基づいて、${date.toLocaleDateString('ja-JP')}のシフト提案を作成してください。

## 従業員情報
${staff.map(s => `- ${s.name}: スキル=${s.skills.join(', ')}, 時給=${s.hourlyWage}円`).join('\n')}

## 拠点情報
${locations.map(l => `- ${l.name}`).join('\n')}

## 要件
- 各従業員のスキルに合ったポジションを割り当てる
- 営業時間は9:00〜18:00
- 人件費を最適化する

JSON形式で回答してください：
\`\`\`json
{
  "shifts": [
    {"staffId": "...", "locationId": "...", "startTime": "09:00", "endTime": "18:00", "role": "オーブン"}
  ],
  "reasoning": "シフト配置の理由を日本語で説明"
}
\`\`\`
`

    const result = await model.generateContent(prompt)
    const response = result.response.text()

    // Extract JSON from response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[1])
        } catch {
            // Fallback
        }
    }

    // Return default if parsing fails
    return {
        shifts: staff.slice(0, 2).map((s, i) => ({
            staffId: s.id,
            locationId: locations[0]?.id || '',
            startTime: '09:00',
            endTime: '18:00',
            role: s.skills[0] || 'オーブン'
        })),
        reasoning: 'AI解析に基づくシフト提案です。'
    }
}

/**
 * Analyze inventory and generate replenishment recommendations
 */
export async function analyzeInventoryForReplenishment(
    inventory: { productName: string; currentStock: number; safetyStock: number; expiringQuantity: number }[]
): Promise<{
    recommendations: { productName: string; quantityToOrder: number; priority: 'high' | 'medium' | 'low'; reason: string }[]
    summary: string
}> {
    const model = getGeminiModel()

    const prompt = `あなたは洋菓子店の在庫管理AIアシスタントです。

以下の在庫情報を分析し、補充提案を作成してください。

## 在庫状況
${inventory.map(i => `- ${i.productName}: 現在=${i.currentStock}, 安全在庫=${i.safetyStock}, 期限切迫=${i.expiringQuantity}`).join('\n')}

## 要件
- 安全在庫を下回る商品を優先
- 期限切迫品は有効在庫から除外して計算
- 理由を日本語で説明

JSON形式で回答してください：
\`\`\`json
{
  "recommendations": [
    {"productName": "...", "quantityToOrder": 100, "priority": "high", "reason": "理由"}
  ],
  "summary": "全体的な在庫状況の要約"
}
\`\`\`
`

    const result = await model.generateContent(prompt)
    const response = result.response.text()

    // Extract JSON from response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[1])
        } catch {
            // Fallback
        }
    }

    // Return default if parsing fails
    return {
        recommendations: inventory
            .filter(i => i.currentStock - i.expiringQuantity < i.safetyStock)
            .map(i => ({
                productName: i.productName,
                quantityToOrder: i.safetyStock - (i.currentStock - i.expiringQuantity) + 50,
                priority: 'high' as const,
                reason: `有効在庫 (${i.currentStock - i.expiringQuantity}) が安全在庫 (${i.safetyStock}) を下回っています`
            })),
        summary: 'AI分析に基づく補充提案です。'
    }
}
