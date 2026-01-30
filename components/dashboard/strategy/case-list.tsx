'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
    Loader2, 
    ExternalLink, 
    ArrowRight, 
    PlayCircle, 
    Clock, 
    AlertCircle, 
    ChevronDown, 
    ChevronRight,
    FileText,
    History,
    Search
} from 'lucide-react'
import { CollectionLinkDialog } from './collection-link-dialog'
import { useState } from 'react'

export interface CollectionLink {
    id: string
    scenario_id: string
    name: string | null
    url: string
    status: 'pending' | 'active' | 'completed' | 'expired'
    created_at: string
    expires_at: string
    responses?: {
        id: string
        is_draft: boolean
        updated_at: string
    }[]
    simulations?: {
        id: string
        title: string
        version_type: 'original' | 'custom'
        version_number: number
        created_at: string
    }[]
}

interface CaseListProps {
    links: CollectionLink[]
    isLoading: boolean
    onSelectCase: (linkId: string, responseId: string) => void
    onRefresh: () => void
}

export function CaseList({ links, isLoading, onSelectCase, onRefresh }: CaseListProps) {
    
    // Status Logic
    const getStatusDisplay = (link: CollectionLink) => {
        const submittedResponse = link.responses?.find(r => !r.is_draft)
        
        if (submittedResponse) {
            return {
                label: '受領済み',
                color: 'bg-green-100 text-green-700 border-green-200',
                icon: <PlayCircle className="w-3 h-3 mr-1" />,
                canSimulate: true,
                responseId: submittedResponse.id
            }
        }
        
        if (link.status === 'expired') {
            return {
                label: '期限切れ',
                color: 'bg-slate-100 text-slate-500 border-slate-200',
                icon: <AlertCircle className="w-3 h-3 mr-1" />,
                canSimulate: false
            }
        }
        
        return {
            label: '入力待ち',
            color: 'bg-blue-50 text-blue-600 border-blue-200',
            icon: <Clock className="w-3 h-3 mr-1" />,
            canSimulate: false
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">M&A案件一覧（履歴）</h2>
                    <p className="text-slate-500">
                        発行したリンクごとの履歴と分析結果を管理します。
                    </p>
                </div>
                <CollectionLinkDialog />
            </div>

            {links.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                        <div className="p-4 rounded-full bg-blue-50 text-blue-600">
                            <ExternalLink className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-semibold text-lg">案件がありません</h3>
                            <p className="text-slate-500 max-w-sm mx-auto">
                                新しいM&A案件（情報収集リンク）を発行してスタートしましょう。
                            </p>
                        </div>
                        <div className="pt-2">
                            <CollectionLinkDialog />
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {links.map((link) => (
                        <CaseItem 
                            key={link.id} 
                            link={link} 
                            status={getStatusDisplay(link)} 
                            onSelectCase={onSelectCase}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function CaseItem({ link, status, onSelectCase }: { 
    link: CollectionLink, 
    status: any, 
    onSelectCase: (linkId: string, responseId: string) => void 
}) {
    const [isOpen, setIsOpen] = useState(true) // Default open to show recent activity
    const hasHistory = (link.responses && link.responses.length > 0) || (link.simulations && link.simulations.length > 0)

    // Sort all history items by date desc
    const historyItems = [
        ...(link.responses?.map(r => ({ ...r, type: 'response', date: r.updated_at })) || []),
        ...(link.simulations?.map(s => ({ ...s, type: 'simulation', date: s.created_at })) || [])
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return (
        <Card className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <div className="p-4 flex items-center gap-4 bg-white/50">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-1 hover:bg-slate-100 shrink-0">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                    </CollapsibleTrigger>

                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Title & Badge */}
                        <div className="md:col-span-5 flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="font-bold text-slate-900 truncate">
                                    {link.name || '名称未設定の案件'}
                                </div>
                                <div className="text-xs text-slate-500 font-mono truncate">
                                    {window.location.host}{link.url}
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="md:col-span-3">
                            <Badge variant="outline" className={`${status.color} border py-1 px-3`}>
                                {status.icon}
                                {status.label}
                            </Badge>
                        </div>
                        
                        {/* Date */}
                        <div className="md:col-span-2 text-sm text-slate-500">
                             {format(new Date(link.created_at), 'yyyy/MM/dd', { locale: ja })}
                        </div>

                        {/* Action */}
                        <div className="md:col-span-2 flex justify-end">
                            {!status.canSimulate ? (
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}${link.url}`)}
                                >
                                    URLコピー
                                </Button>
                            ) : (
                                <Button 
                                    size="sm" 
                                    className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                                    onClick={() => onSelectCase(link.id, status.responseId)}
                                >
                                    詳細・分析
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <CollapsibleContent>
                    <div className="border-t bg-slate-50/50 p-4 pl-[4.5rem]">
                        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <History className="w-3 h-3" />
                            アクティビティ履歴
                        </div>

                        <div className="relative border-l-2 border-slate-200 pl-4 space-y-6 py-2">
                             {/* Initial Link Created */}
                             <div className="relative">
                                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
                                <div className="text-sm text-slate-500">
                                    <span className="font-medium text-slate-700">リンク発行</span>
                                    <span className="mx-2 text-slate-300">|</span>
                                    {format(new Date(link.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                                </div>
                            </div>

                            {/* Dynamic History Items */}
                            {historyItems.map((item: any) => (
                                <div key={item.id} className="relative group">
                                    <div className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                                        item.type === 'response' ? 'bg-green-500' : 'bg-blue-500'
                                    }`} />
                                    
                                    <div className="flex items-start justify-between group-hover:bg-slate-100/50 p-2 -ml-2 rounded-lg transition-colors">
                                        <div>
                                            <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                                                {item.type === 'response' ? (
                                                    <>
                                                        <span className="text-green-600">📥</span>
                                                        <span>譲渡元から回答を受信</span>
                                                        {item.is_draft && <Badge variant="outline" className="text-xs h-5">下書き</Badge>}
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-blue-600">📝</span>
                                                        <span>{item.title}</span>
                                                        <Badge variant="secondary" className="text-xs h-5">Ver.{item.version_number}</Badge>
                                                    </>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {format(new Date(item.date), 'yyyy/MM/dd HH:mm', { locale: ja })}
                                            </div>
                                        </div>

                                        {/* Action Button for Simulation History */}
                                        {item.type === 'simulation' && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => onSelectCase(link.id, status.responseId)} // Ideally open specific version
                                            >
                                                開く
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}

                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    )
}
