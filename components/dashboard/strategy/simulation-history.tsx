'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Save, History, Trash2, RotateCcw } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { SimulationData } from '@/lib/ma-simulation'
import { saveSimulation, getSimulations, deleteSimulation } from '@/app/dashboard/strategy/actions'

interface SimulationHistoryProps {
    data: SimulationData
    onLoad: (data: SimulationData) => void
}

export function SimulationHistory({ data, onLoad }: SimulationHistoryProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [history, setHistory] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [saveTitle, setSaveTitle] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const { toast } = useToast()

    // 履歴ロード
    const fetchHistory = async () => {
        setIsLoading(true)
        try {
            const res = await getSimulations()
            setHistory(res)
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    // ダイアログが開いたときに履歴を取得
    useEffect(() => {
        if (isOpen) {
            fetchHistory()
        }
    }, [isOpen])

    // 新規保存
    const handleSave = async () => {
        if (!saveTitle.trim()) return
        setIsSaving(true)
        try {
            await saveSimulation(data, saveTitle)
            toast({
                title: "保存しました",
                description: `シナリオ「${saveTitle}」を保存しました。`,
            })
            setSaveTitle('')
            await fetchHistory() // リスト更新
        } catch (e) {
            toast({
                title: "エラー",
                description: "保存に失敗しました。",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    // 削除
    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('本当に削除しますか？')) return

        try {
            await deleteSimulation(id)
            setHistory(prev => prev.filter(item => item.id !== id))
            toast({
                title: "削除しました",
            })
        } catch (e) {
            toast({
                title: "エラー",
                description: "削除に失敗しました。",
                variant: "destructive"
            })
        }
    }

    // ロード
    const handleLoad = (item: any) => {
        if (confirm(`シナリオ「${item.title}」を復元しますか？\n現在の入力内容は失われます。`)) {
            onLoad(item.simulation_data)
            setIsOpen(false)
            toast({
                title: "復元完了",
                description: "データを読み込みました。",
            })
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <History className="h-4 w-4" />
                    シナリオ保存・履歴
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>シミュレーション履歴</DialogTitle>
                    <DialogDescription>
                        現在の設定を保存したり、過去のシミュレーションを復元できます。
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* 新規保存エリア */}
                    <div className="flex gap-2 items-end bg-slate-50 p-3 rounded-lg border">
                        <div className="grid w-full gap-1.5">
                            <Label htmlFor="title" className="text-xs text-slate-500">現在の状態を新規保存</Label>
                            <Input
                                id="title"
                                placeholder="例: 交渉前プランA"
                                value={saveTitle}
                                onChange={(e) => setSaveTitle(e.target.value)}
                                className="h-8"
                            />
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={!saveTitle.trim() || isSaving}
                            size="sm"
                            className="h-8"
                        >
                            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3mr-1" />}
                            保存
                        </Button>
                    </div>

                    {/* 履歴リスト */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">保存済みシナリオ</Label>
                        {/* ScrollAreaを削除し、divで代替 */}
                        <div className="h-[300px] w-full rounded-md border p-2 overflow-y-auto">
                            {isLoading ? (
                                <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                            ) : history.length === 0 ? (
                                <div className="text-center text-sm text-slate-400 py-8">履歴はありません</div>
                            ) : (
                                <div className="space-y-2">
                                    {history.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-slate-50 cursor-pointer transition-colors group"
                                            onClick={() => handleLoad(item)}
                                        >
                                            <div className="space-y-1">
                                                <div className="font-medium text-sm flex items-center gap-2">
                                                    {item.title}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {new Date(item.created_at).toLocaleString('ja-JP')}
                                                </div>
                                            </div>
                                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600">
                                                    <RotateCcw className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-red-400 hover:text-red-600"
                                                    onClick={(e) => handleDelete(item.id, e)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
