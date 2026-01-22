import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const supabase = await createClient()

    await supabase.auth.signOut()

    const url = request.url
    const loginUrl = new URL('/auth/login', url)
    return NextResponse.redirect(loginUrl)
}
