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
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, Send } from 'lucide-react'
import { useState } from 'react'

interface ConfirmDialogProps {
    open: boolean
    onClose: () => void
    onConfirm: (supplementalInfo?: string) => void
    paybackYears: number
    cumulativeOperatingProfit: number // New
    isPaybackOk: boolean
}

export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    paybackYears,
    cumulativeOperatingProfit,
    isPaybackOk
}: ConfirmDialogProps) {
    const isProfitable = cumulativeOperatingProfit > 0
    const yearsDisplay = paybackYears === Infinity ? '---' : paybackYears.toFixed(1)
    
    const [supplementalInfo, setSupplementalInfo] = useState('')

    const handleConfirm = () => {
        onConfirm(supplementalInfo)
        setSupplementalInfo('') // Reset
    }

    // OKの場合はダイアログを出さずに即送信するため、このダイアログは実質的にNG時専用となる
    // (親コンポーネント側で制御想定だが、念のため表示内容は汎用的にしておく)

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-amber-600 mb-2">
                        <AlertTriangle className="w-6 h-6" />
                        <DialogTitle>基準値との乖離がありますが、送信しますか？</DialogTitle>
                    </div>
                    <DialogDescription className="space-y-4 pt-2 text-left">
                        <div className="text-base text-slate-700 leading-relaxed">
                            現在のシミュレーション結果では、弊社の投資回収基準（3年以内）を満たすことが難しい状況です。
                            <br />
                            <span className="text-slate-500 text-sm">
                                ※ 設備の状態や将来の契約など、数値に表れない補足事項があれば以下にご記入ください。
                            </span>
                        </div>
                        
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-center">
                            <div className="text-sm text-amber-800 font-medium mb-1">現在の回収見込み</div>
                            
                            {!isProfitable ? (
                                <div className="text-xl font-bold text-red-600">
                                    回収不可（赤字推移）
                                </div>
                            ) : (
                                <div className="text-2xl font-bold text-amber-700 font-mono">
                                    約 {yearsDisplay} 年
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1.5">
                                補足事項（任意）
                            </label>
                            <Textarea 
                                placeholder="例：来年から大手取引先との契約が決まっているため、売上が増加する見込みです。設備は昨年入れ替えたばかりで新品同様です。"
                                className="resize-none min-h-[100px] text-sm"
                                value={supplementalInfo}
                                onChange={(e) => setSupplementalInfo(e.target.value)}
                            />
                        </div>
                        
                        <p className="text-sm text-slate-500 text-center">
                            この内容で送信しますか？
                        </p>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                        戻って修正する
                    </Button>
                    <Button onClick={handleConfirm} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white">
                        <Send className="w-4 h-4 mr-2" />
                        補足を入力して送信する
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
