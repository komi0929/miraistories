'use server'

import { createClient } from '@/lib/supabase/server'

// 型定義
interface CollectionLink {
    id: string
    token: string
    status: 'pending' | 'submitted' | 'expired'
    name: string | null
    expires_at: string | null
}

interface CollectionRespondent {
    id: string
    link_id: string
    email: string
    verification_code: string | null
    verified: boolean
    verified_at: string | null
}

interface CollectionResponse {
    id: string
    link_id: string
    respondent_id: string
    is_draft: boolean
    skeleton_cost: number
    rent: number
    utilities: number
    labor_cost_total: number
    labor_details: any[]
    other_expenses_total: number
    lease_details: any[]
    use_detailed_expenses: boolean
    cost_ratio: number
    sales_strategy_mode: 'simple' | 'detailed'
    monthly_sales_simple: number
    yearly_sales_baseline: { year1: number; year2: number; year3: number }
    deals: any[]
    factory_fee_percentage: number
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
 * メールアドレスで認証コードを送信（簡易版: コードを返す）
 */
export async function requestVerification(linkId: string, email: string) {
    try {
        const supabase = await createClient()
        
        // 6桁の認証コードを生成
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
        
        // 既存の回答者をチェック
        const { data: existing, error: fetchError } = await (supabase as any)
            .from('ma_collection_respondents')
            .select('*')
            .eq('link_id', linkId)
            .eq('email', email)
            .single()
        
        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "Relation not found" or "No rows"? No, it's "0 rows". 
            // "Relation does not exist" is 42P01.
            console.error('Database fetch error:', fetchError)
            return { success: false, error: 'データベースエラーが発生しました（テーブル未作成の可能性があります）' }
        }

        if (existing) {
            // 既存のレコードを更新
            const { error: updateError } = await (supabase as any)
                .from('ma_collection_respondents')
                .update({ verification_code: verificationCode })
                .eq('id', existing.id)
            
            if (updateError) throw updateError
        } else {
            // 新規レコードを作成
            const { error: insertError } = await (supabase as any)
                .from('ma_collection_respondents')
                .insert({
                    link_id: linkId,
                    email,
                    verification_code: verificationCode,
                    verified: false
                })
                
            if (insertError) {
                console.error('Database insert error:', insertError)
                return { success: false, error: 'データの保存に失敗しました' }
            }
        }
        
        // TODO: 実際のメール送信（現在はコンソールに出力）
        console.log(`[MA Collection] Verification code for ${email}: ${verificationCode}`)
        
        return { 
            success: true, 
            message: '認証コードを送信しました。メールをご確認ください。',
            // DEMO用: 本番環境でも認証コードを表示（本来は猶予期間後に削除すべき）
            devCode: verificationCode 
        }
    } catch (error) {
        console.error('Request Verification Error:', error)
        return { success: false, error: 'サーバー接続エラーが発生しました' }
    }
}

/**
 * 認証コードを検証
 */
export async function verifyCode(linkId: string, email: string, code: string) {
    const supabase = await createClient()
    
    const { data: respondent, error } = await (supabase as any)
        .from('ma_collection_respondents')
        .select('*')
        .eq('link_id', linkId)
        .eq('email', email)
        .eq('verification_code', code)
        .single()
    
    if (error || !respondent) {
        return { success: false, error: '認証コードが正しくありません' }
    }
    
    // 認証済みに更新
    await (supabase as any)
        .from('ma_collection_respondents')
        .update({ 
            verified: true, 
            verified_at: new Date().toISOString(),
            verification_code: null 
        })
        .eq('id', respondent.id)
    
    return { 
        success: true, 
        respondentId: respondent.id 
    }
}

/**
 * 回答者の認証状態を確認
 */
export async function checkRespondentAuth(linkId: string, email: string) {
    const supabase = await createClient()
    
    const { data: respondent } = await (supabase as any)
        .from('ma_collection_respondents')
        .select('*')
        .eq('link_id', linkId)
        .eq('email', email)
        .eq('verified', true)
        .single()
    
    if (!respondent) {
        return { success: false, authenticated: false }
    }
    
    return { 
        success: true, 
        authenticated: true,
        respondentId: respondent.id 
    }
}

/**
 * 回答データを保存（下書き保存対応）
 */
export async function saveResponse(
    linkId: string, 
    respondentId: string, 
    responseData: Partial<CollectionResponse>,
    isDraft: boolean = true
) {
    const supabase = await createClient()
    
    // 既存の回答をチェック
    const { data: existing } = await (supabase as any)
        .from('ma_collection_responses')
        .select('id')
        .eq('link_id', linkId)
        .eq('respondent_id', respondentId)
        .single()
    
    const payload = {
        ...responseData,
        link_id: linkId,
        respondent_id: respondentId,
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
    
    // 送信完了の場合はリンクステータスを更新
    if (!isDraft) {
        await (supabase as any)
            .from('ma_collection_links')
            .update({ status: 'submitted' })
            .eq('id', linkId)
    }
    
    return { success: true, message: isDraft ? '下書きを保存しました' : '送信が完了しました' }
}

/**
 * 既存の回答データを取得
 */
export async function getExistingResponse(linkId: string, respondentId: string) {
    const supabase = await createClient()
    
    const { data, error } = await (supabase as any)
        .from('ma_collection_responses')
        .select('*')
        .eq('link_id', linkId)
        .eq('respondent_id', respondentId)
        .single()
    
    if (error || !data) {
        return { success: false, data: null }
    }
    
    return { success: true, data: data as CollectionResponse }
}
