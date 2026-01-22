'use client'

import { cn } from '@/lib/utils'
import {
    TrendingUp,
    Factory,
    Package,
    Users,
    MapPin,
    Sparkles,
    ArrowRight,
    FileText,
    Calendar,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface DashboardOverviewProps {
    kpis: {
        scenarios: number
        assets: number
        products: number
        staff: number
        locations: number
        draftShifts: number
        draftPOs: number
    }
}

export function DashboardOverview({ kpis }: DashboardOverviewProps) {
    const kpiCards = [
        {
            label: 'シナリオ数',
            value: kpis.scenarios,
            icon: TrendingUp,
            href: '/dashboard/strategy',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
        },
        {
            label: '資産数',
            value: kpis.assets,
            icon: Factory,
            href: '/dashboard/strategy',
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
        },
        {
            label: '商品数',
            value: kpis.products,
            icon: Package,
            href: '/dashboard/production',
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
        },
        {
            label: '従業員数',
            value: kpis.staff,
            icon: Users,
            href: '/dashboard/hr',
            color: 'text-green-600',
            bgColor: 'bg-green-50',
        },
        {
            label: '拠点数',
            value: kpis.locations,
            icon: MapPin,
            href: '/dashboard/production',
            color: 'text-rose-600',
            bgColor: 'bg-rose-50',
        },
    ]

    const hasDrafts = kpis.draftShifts > 0 || kpis.draftPOs > 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
                <p className="text-slate-600">
                    Sweets Core ERP の概要を確認できます
                </p>
            </div>

            {/* AI Drafts Alert */}
            {hasDrafts && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                            <Sparkles className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium text-yellow-800">
                                AIドラフトが承認待ちです
                            </h3>
                            <p className="text-sm text-yellow-700 mt-1">
                                {kpis.draftShifts > 0 && `シフト提案: ${kpis.draftShifts}件`}
                                {kpis.draftShifts > 0 && kpis.draftPOs > 0 && ' / '}
                                {kpis.draftPOs > 0 && `発注提案: ${kpis.draftPOs}件`}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {kpis.draftShifts > 0 && (
                                <Button size="sm" variant="outline" asChild>
                                    <Link href="/dashboard/hr">
                                        <Calendar className="h-4 w-4 mr-1" />
                                        シフト確認
                                    </Link>
                                </Button>
                            )}
                            {kpis.draftPOs > 0 && (
                                <Button size="sm" variant="outline" asChild>
                                    <Link href="/dashboard/supply-chain">
                                        <FileText className="h-4 w-4 mr-1" />
                                        発注確認
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-5 gap-4">
                {kpiCards.map((card) => {
                    const Icon = card.icon
                    return (
                        <Link
                            key={card.label}
                            href={card.href}
                            className="bg-white rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow group"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className={cn('p-2 rounded-lg', card.bgColor)}>
                                    <Icon className={cn('h-5 w-5', card.color)} />
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                            </div>
                            <div className="text-3xl font-bold text-slate-900">
                                {card.value}
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                                {card.label}
                            </div>
                        </Link>
                    )
                })}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border shadow-sm p-6">
                    <h3 className="font-semibold text-slate-900 mb-2">経営・M&A</h3>
                    <p className="text-sm text-slate-500 mb-4">
                        資産交渉シミュレーションとカーブアウト分析
                    </p>
                    <Button asChild>
                        <Link href="/dashboard/strategy">
                            シミュレーション開始
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                    </Button>
                </div>

                <div className="bg-white rounded-lg border shadow-sm p-6">
                    <h3 className="font-semibold text-slate-900 mb-2">商品・製造</h3>
                    <p className="text-sm text-slate-500 mb-4">
                        商品マスタとレシピ（BOM）管理
                    </p>
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/production">
                            商品管理へ
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                    </Button>
                </div>

                <div className="bg-white rounded-lg border shadow-sm p-6">
                    <h3 className="font-semibold text-slate-900 mb-2">人事・シフト</h3>
                    <p className="text-sm text-slate-500 mb-4">
                        従業員管理とAIシフト自動生成
                    </p>
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/hr">
                            シフト管理へ
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                    </Button>
                </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="font-semibold text-slate-900 mb-4">システム情報</h3>
                <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                        <span className="text-slate-500">バージョン:</span>
                        <span className="ml-2 font-mono">2.0.0</span>
                    </div>
                    <div>
                        <span className="text-slate-500">フェーズ:</span>
                        <span className="ml-2">Phase 2 (ERP統合)</span>
                    </div>
                    <div>
                        <span className="text-slate-500">データベース:</span>
                        <span className="ml-2 text-green-600">● 接続中</span>
                    </div>
                    <div>
                        <span className="text-slate-500">AIエンジン:</span>
                        <span className="ml-2 text-green-600">● 利用可能</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
