'use client'

import { PokerFaceToggle } from '@/components/shared/poker-face-toggle'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { User } from '@supabase/supabase-js'

interface TopBarProps {
    user: User | null
}

export function TopBar({ user }: TopBarProps) {
    return (
        <header className="sticky top-0 z-50 h-14 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="flex h-full items-center justify-between px-6">
                {/* Left: Page Title Placeholder */}
                <div className="flex items-center gap-4">
                    {/* Breadcrumb or page title could go here */}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-4">
                    {/* Poker Face Mode */}
                    <PokerFaceToggle />

                    {/* User Info */}
                    <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-medium text-slate-900">
                                {user?.email?.split('@')[0] || 'ゲスト'}
                            </span>
                            <span className="text-xs text-slate-500">
                                管理者
                            </span>
                        </div>
                        <form action="/auth/signout" method="post">
                            <Button
                                variant="ghost"
                                size="icon"
                                title="ログアウト"
                                className="text-slate-600 hover:text-red-600"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </header>
    )
}
