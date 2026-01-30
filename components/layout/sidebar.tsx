'use client'

import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    TrendingUp,
    Factory,
    Package,
    ShoppingCart,
    Users,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface NavItem {
    href: string
    label: string
    labelEn: string
    icon: React.ElementType
}

const navItems: NavItem[] = [
    {
        href: '/dashboard',
        label: 'ダッシュボード',
        labelEn: 'Dashboard',
        icon: LayoutDashboard,
    },
    {
        href: '/dashboard/strategy',
        label: '経営・M&A',
        labelEn: 'Strategy',
        icon: TrendingUp,
    },
    {
        href: '/dashboard/production',
        label: '商品・製造',
        labelEn: 'Production',
        icon: Factory,
    },
    {
        href: '/dashboard/supply-chain',
        label: '在庫・発注',
        labelEn: 'Supply Chain',
        icon: Package,
    },
    {
        href: '/dashboard/sales',
        label: '販売・顧客',
        labelEn: 'Sales',
        icon: ShoppingCart,
    },
    {
        href: '/dashboard/hr',
        label: '人事・シフト',
        labelEn: 'HR',
        icon: Users,
    },
]

export function Sidebar() {
    const pathname = usePathname()
    const [isCollapsed, setIsCollapsed] = useState(false)

    return (
        <div
            className={cn(
                'flex flex-col h-full bg-slate-900 text-white transition-all duration-300',
                isCollapsed ? 'w-16' : 'w-64'
            )}
        >
            {/* Logo / Brand */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-slate-700">
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="miraistories" className="h-8 w-auto" />
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-white hover:bg-slate-800"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <ChevronLeft className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4">
                <ul className="space-y-1 px-2">
                    {navItems.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            (item.href !== '/dashboard' && pathname.startsWith(item.href))
                        const Icon = item.icon

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                                        'hover:bg-slate-800',
                                        isActive
                                            ? 'bg-blue-600 text-white'
                                            : 'text-slate-300'
                                    )}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <Icon className="h-5 w-5 flex-shrink-0" />
                                    {!isCollapsed && (
                                        <span className="font-medium">{item.label}</span>
                                    )}
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>

            {/* Footer */}
            {!isCollapsed && (
                <div className="p-4 border-t border-slate-700">
                    <p className="text-xs text-slate-500">
                        miraistories • v1.0
                    </p>
                </div>
            )}
        </div>
    )
}
