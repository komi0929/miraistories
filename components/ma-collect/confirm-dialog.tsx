'use client'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Send } from 'lucide-react'

interface ConfirmDialogProps {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    paybackYears: number
    monthlyOperatingProfit: number
}

export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    paybackYears,
    monthlyOperatingProfit
}: ConfirmDialogProps) {
    const isProfitable = monthlyOperatingProfit > 0
    const yearsDisplay = paybackYears === Infinity ? '---' : paybackYears.toFixed(1)

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-amber-600 mb-2">
                        <AlertTriangle className="w-6 h-6" />
                        <DialogTitle>確認</DialogTitle>
                    </div>
                    <DialogDescription className="space-y-4 pt-2">
                        <div className="text-base text-slate-700">
                            現在の条件では、弊社の投資回収基準（3年以内）を満たしていませんが、補足事項がある場合などはこのまま送信可能です。
                        </div>
                        
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-center">
                            <div className="text-sm text-amber-800 font-medium mb-1">現在の回収見込み</div>
                            
                            {!isProfitable ? (
                                <div className="text-xl font-bold text-red-600">
                                    回収不可（赤字）
                                </div>
                            ) : (
                                <div className="text-2xl font-bold text-amber-700 font-mono">
                                    約 {yearsDisplay} 年
                                </div>
                            )}
                        </div>
                        
                        <p className="text-sm text-slate-500">
                            このまま送信しますか？
                        </p>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                        キャンセル（修正する）
                    </Button>
                    <Button onClick={onConfirm} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700">
                        <Send className="w-4 h-4 mr-2" />
                        このまま送信する
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
