'use client'

import { useTransition } from 'react'
import { resetAllCollectionData } from '@/app/dashboard/strategy/collection/actions'
import { Loader2, Trash2 } from 'lucide-react'

export function ResetButton() {
    const [isPending, startTransition] = useTransition()

    const handleReset = () => {
        if (!confirm('【デバッグ機能】\n本当に全ての収集データとシミュレーション履歴を削除してもよろしいですか？\nこの操作は取り消せません。')) {
            return
        }

        startTransition(async () => {
            const result = await resetAllCollectionData()
            if (result.success) {
                alert('データをリセットしました。画面を更新します。')
                window.location.reload()
            } else {
                alert(`エラーが発生しました: ${result.error}`)
            }
        })
    }



    return (
        <button 
            onClick={handleReset}
            disabled={isPending}
            className="fixed bottom-4 left-4 z-50 bg-red-600 text-white px-4 py-2 rounded shadow-lg text-xs hover:bg-red-700 transition-colors flex items-center gap-2"
        >
            {isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
                <Trash2 className="w-3 h-3" />
            )}
            [DEBUG] 収集データリセット
        </button>
    )
}
