'use client'

import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { InventoryLot, Product, PurchaseOrder } from '@/types/database.types'
import { useState } from 'react'
import { Package, FileText, AlertTriangle, Clock, CheckCircle2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateReplenishmentDrafts } from './actions'
import { useToast } from '@/components/ui/use-toast'

interface SupplyChainClientProps {
    initialInventoryLots: (InventoryLot & {
        products: { id: string; name: string; unit: string } | null
        locations: { id: string; name: string; type: string } | null
    })[]
    initialPurchaseOrders: PurchaseOrder[]
    products: Product[]
}

const statusLabels: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    draft: { label: 'ドラフト', color: 'bg-yellow-100 text-yellow-800', icon: Sparkles },
    ordered: { label: '発注済', color: 'bg-blue-100 text-blue-800', icon: Clock },
    received: { label: '入荷済', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
}

export function SupplyChainClient({
    initialInventoryLots,
    initialPurchaseOrders,
    products,
}: SupplyChainClientProps) {
    const [inventoryLots] = useState(initialInventoryLots)
    const [purchaseOrders] = useState(initialPurchaseOrders)
    const [isGenerating, setIsGenerating] = useState(false)
    const { toast } = useToast()

    const handleGenerateDraft = async () => {
        setIsGenerating(true)
        try {
            const result = await generateReplenishmentDrafts()
            if (result.success) {
                toast({
                    title: "AI提案完了",
                    description: result.message,
                    variant: "default", // Using default for success in this UI lib usually
                })
            } else {
                toast({
                    title: "エラー",
                    description: result.message,
                    variant: "destructive",
                })
            }
        } catch (error) {
            toast({
                title: "エラー",
                description: "予期せぬエラーが発生しました",
                variant: "destructive",
            })
        } finally {
            setIsGenerating(false)
            // Router refresh or state update would optionally go here if not relying solely on server component prop update
            // But since this is a client component receiving initial props, we might need to refresh the page to see new data
            // For now, let's rely on revalidatePath in the action + router.refresh() if available, 
            // or just let the user see it on next nav.
            // Ideally: router.refresh()
            window.location.reload() // Brute force refresh for this MVP step to ensure data matches
        }
    }

    // Calculate days until expiration
    const getDaysUntilExpiration = (expirationDate: string | null): number | null => {
        if (!expirationDate) return null
        const today = new Date()
        const expiry = new Date(expirationDate)
        const diffTime = expiry.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
    }

    // Count expiring soon items
    const expiringSoonCount = inventoryLots.filter(lot => {
        const days = getDaysUntilExpiration(lot.expiration_date)
        return days !== null && days <= 3 && days >= 0
    }).length

    const expiredCount = inventoryLots.filter(lot => {
        const days = getDaysUntilExpiration(lot.expiration_date)
        return days !== null && days < 0
    }).length

    const draftPOCount = purchaseOrders.filter(po => po.status === 'draft').length

    return (
        <div className="space-y-4">
            {/* Alert Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className={cn(
                    "p-4 rounded-lg border shadow-sm",
                    expiredCount > 0 ? "bg-red-50 border-red-200" : "bg-white"
                )}>
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <AlertTriangle className={cn("h-4 w-4", expiredCount > 0 && "text-red-500")} />
                        <span className="text-sm">期限切れ</span>
                    </div>
                    <span className={cn("text-2xl font-bold", expiredCount > 0 ? "text-red-600" : "text-slate-900")}>
                        {expiredCount}
                    </span>
                </div>
                <div className={cn(
                    "p-4 rounded-lg border shadow-sm",
                    expiringSoonCount > 0 ? "bg-amber-50 border-amber-200" : "bg-white"
                )}>
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <Clock className={cn("h-4 w-4", expiringSoonCount > 0 && "text-amber-500")} />
                        <span className="text-sm">3日以内に期限</span>
                    </div>
                    <span className={cn("text-2xl font-bold", expiringSoonCount > 0 ? "text-amber-600" : "text-slate-900")}>
                        {expiringSoonCount}
                    </span>
                </div>
                <div className={cn(
                    "p-4 rounded-lg border shadow-sm",
                    draftPOCount > 0 ? "bg-blue-50 border-blue-200" : "bg-white"
                )}>
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <Sparkles className={cn("h-4 w-4", draftPOCount > 0 && "text-blue-500")} />
                        <span className="text-sm">AIドラフト発注</span>
                    </div>
                    <span className={cn("text-2xl font-bold", draftPOCount > 0 ? "text-blue-600" : "text-slate-900")}>
                        {draftPOCount}
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="inventory" className="w-full">
                <TabsList className="bg-white border">
                    <TabsTrigger value="inventory" className="gap-2">
                        <Package className="h-4 w-4" />
                        在庫ロット
                    </TabsTrigger>
                    <TabsTrigger value="orders" className="gap-2">
                        <FileText className="h-4 w-4" />
                        発注書
                    </TabsTrigger>
                </TabsList>

                {/* Inventory Tab */}
                <TabsContent value="inventory" className="mt-4">
                    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead>商品名</TableHead>
                                    <TableHead>拠点</TableHead>
                                    <TableHead className="text-right">数量</TableHead>
                                    <TableHead>賞味期限</TableHead>
                                    <TableHead>状態</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inventoryLots.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                            在庫データがありません
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    inventoryLots.map((lot) => {
                                        const daysUntil = getDaysUntilExpiration(lot.expiration_date)
                                        let statusColor = 'bg-green-100 text-green-800'
                                        let statusText = '良好'

                                        if (daysUntil !== null) {
                                            if (daysUntil < 0) {
                                                statusColor = 'bg-red-100 text-red-800'
                                                statusText = '期限切れ'
                                            } else if (daysUntil <= 3) {
                                                statusColor = 'bg-amber-100 text-amber-800'
                                                statusText = `残り${daysUntil}日`
                                            }
                                        }

                                        return (
                                            <TableRow key={lot.id}>
                                                <TableCell className="font-medium">
                                                    {lot.products?.name || '不明'}
                                                </TableCell>
                                                <TableCell>
                                                    {lot.locations?.name || '不明'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {lot.quantity.toLocaleString()} {lot.products?.unit || ''}
                                                </TableCell>
                                                <TableCell>
                                                    {lot.expiration_date
                                                        ? new Date(lot.expiration_date).toLocaleDateString('ja-JP')
                                                        : '-'
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={statusColor}>
                                                        {statusText}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                {/* Purchase Orders Tab */}
                <TabsContent value="orders" className="mt-4">
                    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-semibold">発注書一覧</h3>
                            <Button
                                size="sm"
                                onClick={handleGenerateDraft}
                                disabled={isGenerating}
                                className={cn(isGenerating && "opacity-80")}
                            >
                                <Sparkles className={cn("h-4 w-4 mr-2", isGenerating && "animate-pulse")} />
                                {isGenerating ? 'AI分析中...' : 'AI: 発注提案を生成'}
                            </Button>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead>発注ID</TableHead>
                                    <TableHead>仕入先</TableHead>
                                    <TableHead className="text-right">金額</TableHead>
                                    <TableHead>ステータス</TableHead>
                                    <TableHead>作成日</TableHead>
                                    <TableHead className="w-[100px]">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {purchaseOrders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                            発注書がありません
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    purchaseOrders.map((po) => {
                                        const statusInfo = statusLabels[po.status]
                                        const StatusIcon = statusInfo?.icon || Clock

                                        return (
                                            <TableRow
                                                key={po.id}
                                                className={po.status === 'draft' ? 'bg-yellow-50/50' : ''}
                                            >
                                                <TableCell className="font-mono text-sm">
                                                    {po.id.slice(0, 8)}...
                                                </TableCell>
                                                <TableCell>
                                                    {po.supplier_name || '未設定'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    ¥{po.total_amount?.toLocaleString() || 0}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={cn("gap-1", statusInfo?.color)}>
                                                        <StatusIcon className="h-3 w-3" />
                                                        {statusInfo?.label || po.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(po.created_at).toLocaleDateString('ja-JP')}
                                                </TableCell>
                                                <TableCell>
                                                    {po.status === 'draft' && (
                                                        <div className="flex gap-1">
                                                            <Button variant="outline" size="sm">
                                                                承認
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
