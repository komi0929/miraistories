import { StrategyClient } from './strategy-client'
import { ResetButton } from '@/components/dashboard/strategy/reset-button'

export const dynamic = 'force-dynamic'

export default function StrategyPage() {
    // デバッグ用の一時的なリセットボタン
    // ユーザーがクリックして実行するためにクライアントコンポーネント内に追加すべきですが、
    // ここではStrategyClient内に渡すか、一時的に直書きします。
    // クライアントコンポーネントであるStrategyClient側で呼ぶのが適切です。
    return (
        <div className="relative">
             <StrategyClient />

             <ResetButton />
        </div>
    )
}
