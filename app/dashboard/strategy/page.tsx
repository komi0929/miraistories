import { StrategyClient } from './strategy-client'

export const dynamic = 'force-dynamic'

export default function StrategyPage() {
    // デバッグ用の一時的なリセットボタン
    // ユーザーがクリックして実行するためにクライアントコンポーネント内に追加すべきですが、
    // ここではStrategyClient内に渡すか、一時的に直書きします。
    // クライアントコンポーネントであるStrategyClient側で呼ぶのが適切です。
    return (
        <div className="relative">
             <StrategyClient />
             <form action={async () => {
                 'use server'
                 const { resetAllCollectionData } = await import('./collection/actions')
                 await resetAllCollectionData()
             }}>
                 <button 
                    type="submit"
                    className="fixed bottom-4 left-4 z-50 bg-red-600 text-white px-4 py-2 rounded shadow-lg text-xs hover:bg-red-700 transition-colors"
                >
                    [DEBUG] 収集データリセット
                 </button>
             </form>
        </div>
    )
}
