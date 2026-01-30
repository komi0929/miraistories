'use server'

import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'

// 型定義（マイグレーション適用後にSupabaseの型を再生成すること）
interface CollectionLink {
    id: string
    token: string
    scenario_id: string | null
    owner_id: string
    name: string | null
    status: 'pending' | 'submitted' | 'expired'
    created_at: string
    expires_at: string | null
}

/**
 * 情報収集リンクを発行する
 */
export async function createCollectionLink(scenarioId?: string, name?: string) {
    const supabase = await createClient()
    
    // 現在のユーザーを取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: '認証が必要です' }
    }
    
    // ユニークなトークンを生成
    const token = randomBytes(32).toString('hex')
    
    // リンクを作成（型キャストで対応）
    const { data, error } = await (supabase as any)
        .from('ma_collection_links')
        .insert({
            token,
            owner_id: user.id,
            scenario_id: scenarioId || null,
            name: name || `情報収集 ${new Date().toLocaleDateString('ja-JP')}`,
            status: 'pending'
        })
        .select()
        .single()
    
    if (error) {
        console.error('Failed to create collection link:', error)
        return { success: false, error: `リンクの作成に失敗しました: ${error.message}` }
    }
    
    const linkData = data as CollectionLink
    
    revalidatePath('/dashboard/strategy')
    
    return { 
        success: true, 
        data: {
            id: linkData.id,
            token: linkData.token,
            url: `/ma/collect/${token}`
        }
    }
}

/**
 * 発行済みの情報収集リンク一覧を取得
 */
export async function getCollectionLinks() {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: '認証が必要です', data: [] }
    }
    
    // 1. リンクとレスポンスを取得
    const { data: linksData, error: linksError } = await (supabase as any)
        .from('ma_collection_links')
        .select(`
            *,
            ma_collection_responses (
                id,
                is_draft,
                updated_at
            )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
    
    if (linksError) {
        console.error('Failed to get collection links:', linksError)
        return { success: false, error: 'リンクの取得に失敗しました', data: [] }
    }

    if (!linksData || linksData.length === 0) {
        return { success: true, data: [] }
    }

    // 2. 関連するシミュレーションを取得
    const linkIds = linksData.map((l: any) => l.id)
    const { data: simulationsData, error: simsError } = await (supabase as any)
        .from('ma_simulations')
        .select('id, title, version_type, version_number, check_result, created_at, source_link_id')
        .in('source_link_id', linkIds)
        .eq('user_id', user.id)
        .order('version_number', { ascending: true })

    if (simsError) {
        console.warn('Failed to get related simulations:', simsError)
        // シミュレーション取得失敗は致命的ではないので続行
    }

    // 3. データを結合
    const combinedData = linksData.map((link: any) => {
        const relatedSims = simulationsData?.filter((s: any) => s.source_link_id === link.id) || []
        return {
            ...link,
            simulations: relatedSims
        }
    })
    
    return { success: true, data: combinedData }
}

/**
 * 収集データを取得（管理者用）
 */
export async function getCollectionResponse(linkId: string) {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: '認証が必要です' }
    }
    
    const { data, error } = await (supabase as any)
        .from('ma_collection_responses')
        .select('*')
        .eq('link_id', linkId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()
    
    if (error) {
        console.error('Failed to get collection response:', error)
        return { success: false, error: 'データの取得に失敗しました' }
    }
    
    return { success: true, data }
}

/**
 * リンクのステータスを更新
 */
export async function updateLinkStatus(linkId: string, status: 'pending' | 'submitted' | 'expired') {
    const supabase = await createClient()
    
    const { error } = await (supabase as any)
        .from('ma_collection_links')
        .update({ status })
        .eq('id', linkId)
    
    if (error) {
        console.error('Failed to update link status:', error)
        return { success: false, error: 'ステータスの更新に失敗しました' }
    }
    
    revalidatePath('/dashboard/strategy')
    return { success: true }
}

/**
 * 送信済み案件のデータを取得（最新1件）
 */
export async function getSubmittedCollection() {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: '認証が必要です', data: null }
    }
    
    // 送信済みのリンクを取得（最新1件）
    const { data: link, error: linkError } = await (supabase as any)
        .from('ma_collection_links')
        .select('*')
        .eq('owner_id', user.id)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
    
    if (linkError || !link) {
        return { success: false, error: '送信済みの案件がありません', data: null }
    }
    
    // 対応するレスポンスを取得
    const { data: response, error: responseError } = await (supabase as any)
        .from('ma_collection_responses')
        .select('*')
        .eq('link_id', link.id)
        .eq('is_draft', false)
        .single()
    
    if (responseError || !response) {
        return { success: false, error: '回答データがありません', data: null }
    }
    
    return { 
        success: true, 
        data: {
            link,
            response
        }
    }
}

/**
 * 収集データをSimulationData形式に変換（内部用）
 */
function convertResponseToSimulationData(response: any) {
    return {
        // 初期投資
        acquisitionCost: response.desired_transfer_price || 0,
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
        maxCapacitySales: response.max_capacity_sales || 0,
        
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
 * オリジナル版シミュレーションを自動作成
 */
export async function createOriginalSimulation(linkId: string, responseData: any) {
    const supabase = await createClient()
    
    // リンク情報取得（owner_id確認用）
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
    
    revalidatePath('/dashboard/strategy')
    return { success: true }
}

/**
 * 対象リンクに紐づくシミュレーション版一覧を取得
 */
export async function getSimulationsByLink(linkId: string) {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: '認証が必要です', data: [] }
    }
    
    const { data, error } = await (supabase as any)
        .from('ma_simulations')
        .select('*')
        .eq('source_link_id', linkId)
        .eq('user_id', user.id)
        .order('version_number', { ascending: true })
    
    if (error) {
        console.error('Failed to get simulations by link:', error)
        return { success: false, error: 'シミュレーションの取得に失敗しました', data: [] }
    }
    
    return { success: true, data: data || [] }
}

/**
 * [DEBUG] 全データのリセット（申請リセット＆リンク再アクティブ化）
 */
export async function resetAllCollectionData() {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: '認証が必要です' }
    }

    // 1. ユーザー所有のリンクを取得
    const { data: links } = await (supabase as any)
        .from('ma_collection_links')
        .select('id')
        .eq('owner_id', user.id)
    
    if (!links || links.length === 0) {
        return { success: true, message: 'データはありませんでした' }
    }

    const linkIds = links.map((l: any) => l.id)

    // 2. 関連データの削除
    // Simulation (original)
    await (supabase as any)
        .from('ma_simulations')
        .delete()
        .in('source_link_id', linkIds)
        .eq('version_type', 'original')

    // Responses
    await (supabase as any)
        .from('ma_collection_responses')
        .delete()
        .in('link_id', linkIds)

    // Respondents (認証もリセットする場合)
    await (supabase as any)
        .from('ma_collection_respondents')
        .delete()
        .in('link_id', linkIds)

    // 3. リンクステータスをpendingに戻す
    await (supabase as any)
        .from('ma_collection_links')
        .update({ status: 'pending' })
        .in('id', linkIds)

    revalidatePath('/dashboard/strategy')
    return { success: true, message: '全ての収集データをリセットしました' }
}
