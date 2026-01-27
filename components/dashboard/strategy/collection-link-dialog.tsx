'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCollectionLink } from '@/app/dashboard/strategy/collection/actions'
import { Link2, Copy, Check } from 'lucide-react'

interface CollectionLinkDialogProps {
    scenarioId?: string
}

export function CollectionLinkDialog({ scenarioId }: CollectionLinkDialogProps) {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [generatedLink, setGeneratedLink] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleCreate = async () => {
        setIsLoading(true)
        setError(null)
        
        const result = await createCollectionLink(scenarioId, name || undefined)
        
        if (result.success && result.data) {
            const fullUrl = `${window.location.origin}${result.data.url}`
            setGeneratedLink(fullUrl)
        } else {
            setError(result.error || 'リンクの作成に失敗しました')
        }
        
        setIsLoading(false)
    }

    const handleCopy = async () => {
        if (generatedLink) {
            await navigator.clipboard.writeText(generatedLink)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleClose = () => {
        setOpen(false)
        // ダイアログを閉じても状態をリセットしない（リンクを再確認できるように）
    }

    const handleReset = () => {
        setName('')
        setGeneratedLink(null)
        setError(null)
        setCopied(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Link2 className="h-4 w-4" />
                    情報収集リンクを発行
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-blue-600" />
                        情報収集リンクの発行
                    </DialogTitle>
                    <DialogDescription>
                        譲渡元の方に条件を入力していただくためのリンクを発行します。
                        発行されたリンクを相手にお送りください。
                    </DialogDescription>
                </DialogHeader>

                {!generatedLink ? (
                    <>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="link-name">リンク名（任意）</Label>
                                <Input
                                    id="link-name"
                                    placeholder="例: 福岡ファクトリー案件"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                                <p className="text-xs text-slate-500">
                                    管理用の名前です。相手には表示されません。
                                </p>
                            </div>
                            
                            {error && (
                                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                                    {error}
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={handleClose}>
                                キャンセル
                            </Button>
                            <Button onClick={handleCreate} disabled={isLoading}>
                                {isLoading ? '作成中...' : 'リンクを発行'}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <div className="space-y-4 py-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                                    <Check className="h-5 w-5" />
                                    リンクが発行されました
                                </div>
                                <p className="text-sm text-green-600 mb-3">
                                    以下のリンクを譲渡元の方にお送りください。
                                </p>
                                
                                <div className="flex gap-2">
                                    <Input
                                        value={generatedLink}
                                        readOnly
                                        className="flex-1 bg-white text-sm font-mono"
                                    />
                                    <Button 
                                        variant="outline" 
                                        size="icon"
                                        onClick={handleCopy}
                                        className="shrink-0"
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 border rounded-lg p-4 text-sm text-slate-600 space-y-2">
                                <p className="font-medium text-slate-700">📝 相手への案内文サンプル</p>
                                <div className="bg-white p-3 rounded border text-xs leading-relaxed">
                                    この度はお時間をいただきありがとうございます。<br />
                                    譲渡条件のご確認のため、以下のリンクより必要事項のご入力をお願いいたします。<br />
                                    <br />
                                    入力を中断されても、下書きとして保存されますのでご安心ください。<br />
                                    <br />
                                    ▼ 入力フォーム<br />
                                    <span className="text-blue-600 break-all">{generatedLink}</span>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={handleReset}>
                                新しいリンクを発行
                            </Button>
                            <Button onClick={handleClose}>
                                閉じる
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
