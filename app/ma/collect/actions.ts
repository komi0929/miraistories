'use server'

import { createClient } from '@/lib/supabase/server'
import { ExpenseItem, SalesDeal } from '@/types/ma-types'
import { revalidatePath } from 'next/cache'

// 型定義
interface CollectionLink {
    id: string
    token: string
    status: 'pending' | 'submitted' | 'expired'
    name: string | null
    expires_at: string | null
}

interface CollectionResponse {
    id: string
    link_id: string
    is_draft: boolean
    desired_transfer_price: number
    max_capacity_sales: number
    skeleton_cost: number
    rent: number
    utilities: number
    labor_cost_total: number
    labor_details: ExpenseItem[]
    other_expenses_total: number
    lease_details: ExpenseItem[]
    use_detailed_expenses: boolean
    cost_ratio: number
    sales_strategy_mode: 'simple' | 'detailed'
    monthly_sales_simple: number
    yearly_sales_baseline: { year1: number; year2: number; year3: number }
    deals: SalesDeal[]
    factory_fee_percentage: number
    supplemental_info?: string | null
}

/**
 * トークンからリンク情報を取得
 */
export async function getLinkByToken(token: string) {
    const supabase = await createClient()
    
    const { data, error } = await (supabase as any)
        .from('ma_collection_links')
        .select('*')
        .eq('token', token)
        .single()
    
    if (error || !data) {
        return { success: false, error: 'リンクが見つかりません' }
    }
    
    const link = data as CollectionLink
    
    // 有効期限チェック
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
        return { success: false, error: 'このリンクは有効期限が切れています' }
    }
    
    // ステータスチェック
    if (link.status === 'expired') {
        return { success: false, error: 'このリンクは無効です' }
    }
    
    return { success: true, data: link }
}

/**
 * リンクステータスを確認
 */
export async function checkLinkStatus(linkId: string) {
    const supabase = await createClient()
    
    const { data, error } = await (supabase as any)
        .from('ma_collection_links')
        .select('status')
        .eq('id', linkId)
        .single()
    
    if (error || !data) {
        return { success: false, status: null }
    }
    
    return { success: true, status: data.status }
}

/**
 * 既存の回答データを取得（linkIdのみで取得）
 */
export async function getExistingResponse(linkId: string) {
    // Adminクライアントを使用
    const supabase = await import('@/lib/supabase/admin').then(m => m.createAdminClient())
    
    const { data, error } = await (supabase as any)
        .from('ma_collection_responses')
        .select('*')
        .eq('link_id', linkId)
        .single()
    
    if (error || !data) {
        return { success: false, data: null }
    }
    
    return { success: true, data: data as CollectionResponse }
}

/**
 * 回答データを保存（シンプル版 - respondentId不要）
 */
export async function saveResponse(
    linkId: string, 
    responseData: Partial<CollectionResponse>,
    isDraft: boolean = true
) {
    // Adminクライアントを使用して権限を回避
    const supabase = await import('@/lib/supabase/admin').then(m => m.createAdminClient())

    // 既存の回答をチェック
    const { data: existing } = await (supabase as any)
        .from('ma_collection_responses')
        .select('id')
        .eq('link_id', linkId)
        .single()
    
    const payload = {
        ...responseData,
        link_id: linkId,
        is_draft: isDraft,
        updated_at: new Date().toISOString()
    }
    
    if (existing) {
        // 更新
        const { error } = await (supabase as any)
            .from('ma_collection_responses')
            .update(payload)
            .eq('id', existing.id)
        
        if (error) {
            console.error('Failed to update response:', error)
            return { success: false, error: '保存に失敗しました' }
        }
    } else {
        // 新規作成
        const { error } = await (supabase as any)
            .from('ma_collection_responses')
            .insert(payload)
        
        if (error) {
            console.error('Failed to create response:', error)
            return { success: false, error: '保存に失敗しました' }
        }
    }
    
    // 送信完了の場合はリンクステータスを更新＆オリジナル版を自動作成
    if (!isDraft) {
        const { error: linkError } = await (supabase as any)
            .from('ma_collection_links')
            .update({ status: 'submitted' })
            .eq('id', linkId)

        if (linkError) {
             console.error('Failed to update link status:', linkError)
        }
        
        // オリジナル版シミュレーションを自動作成
        await createOriginalSimulationInternal(supabase, linkId, responseData)

        // 管理画面を再検証
        revalidatePath('/dashboard/strategy')
    }
    
    return { success: true, message: isDraft ? '下書きを保存しました' : '送信が完了しました' }
}

/**
 * 収集データをSimulationData形式に変換（内部用）
 */
function convertResponseToSimulationData(response: Partial<CollectionResponse>) {
    const anyResponse = response as any
    return {
        // 初期投資
        acquisitionCost: anyResponse.desired_transfer_price || 0,
        renovationCost: 0,
        skeletonCost: response.skeleton_cost || 3000000,
        
        // 販管費
        useDetailedExpenses: response.use_detailed_expenses || false,
        rent: response.rent || 0,
        utilities: response.utilities || 0,
        laborCostTotal: response.labor_cost_total || 0,
        laborDetails: response.labor_details || [],
        otherExpensesTotal: response.other_expenses_total || 0,
        leaseDetails: response.lease_details || [],
        
        // キャパシティ
        maxCapacitySales: anyResponse.max_capacity_sales || 0,
        
        // 売上
        costRatio: response.cost_ratio || 35,
        salesStrategyMode: response.sales_strategy_mode || 'simple',
        monthlySalesSimple: response.monthly_sales_simple || 0,
        yearlySalesBaseline: response.yearly_sales_baseline || { year1: 0, year2: 0, year3: 0 },
        deals: response.deals || [],
        
        // フィルタ＆その他
        probabilityFilter: 'high_only' as const,
        factoryFeePercentage: response.factory_fee_percentage || 0,
    }
}

/**
 * オリジナル版シミュレーションを作成（内部用）
 */
async function createOriginalSimulationInternal(
    supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
    linkId: string, 
    responseData: Partial<CollectionResponse>
) {
    // リンク情報取得
    const { data: link } = await (supabase as any)
        .from('ma_collection_links')
        .select('owner_id, name')
        .eq('id', linkId)
        .single()
    
    if (!link) {
        console.error('Link not found for original simulation')
        return { success: false }
    }
    
    // SimulationData形式に変換
    const simulationData = convertResponseToSimulationData(responseData)
    
    // オリジナル版として保存
    const { error } = await (supabase as any)
        .from('ma_simulations')
        .insert({
            user_id: link.owner_id,
            title: `📥 オリジナル: ${link.name || '申請データ'}`,
            simulation_data: simulationData,
            source_link_id: linkId,
            version_type: 'original',
            version_number: 1
        })
    
    if (error) {
        console.error('Failed to create original simulation:', error)
        return { success: false }
    }
    
    return { success: true }
}
