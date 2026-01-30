import { getLinkByToken } from '../actions'
import { CollectFormClient } from './collect-form-client'

interface PageProps {
    params: Promise<{ token: string }>
}

export default async function CollectPage({ params }: PageProps) {
    const { token } = await params
    
    // リンクの存在確認
    const result = await getLinkByToken(token)
    
    if (!result.success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">😔</div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">
                        アクセスできません
                    </h1>
                    <p className="text-slate-600">
                        {result.error || 'このリンクは無効か、有効期限が切れています。'}
                    </p>
                </div>
            </div>
        )
    }
    
    // 送信済みでもフォームクライアントに誘導（認証後に読み取り専用モードで表示）
    
    return <CollectFormClient token={token} linkId={result.data!.id} />
}
