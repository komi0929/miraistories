import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error(
            'Supabase Admin環境変数が設定されていません。NEXT_PUBLIC_SUPABASE_URLとSUPABASE_SERVICE_ROLE_KEYを設定してください。'
        )
    }

    return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}
