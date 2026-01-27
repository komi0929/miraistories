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
        return { success: false, error: 'リンクの作成に失敗しました' }
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
    
    const { data, error } = await (supabase as any)
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
    
    if (error) {
        console.error('Failed to get collection links:', error)
        return { success: false, error: 'リンクの取得に失敗しました', data: [] }
    }
    
    return { success: true, data: data || [] }
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
