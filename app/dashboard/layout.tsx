import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/top-bar'
// import { createClient } from '@/lib/supabase/server'
// import { redirect } from 'next/navigation'

// ============================================
// 🔒 認証一時無効化中 - 復旧時は下記コメントを解除
// ============================================
// const supabase = await createClient()
// const { data: { user } } = await supabase.auth.getUser()
// if (!user) { redirect('/auth/login') }
// TopBar に user={user} を渡す
// ============================================

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // 認証無効化中: ダミーユーザー
    const mockUser = {
        id: 'dev-user',
        email: 'dev@test.local',
        user_metadata: { full_name: '開発テストユーザー' }
    }

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <TopBar user={mockUser as any} />

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
