import { getLinkByToken } from '../actions'
import { redirect } from 'next/navigation'
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
    
    // 既に送信済みの場合
    if (result.data?.status === 'submitted') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">
                        ご入力ありがとうございました
                    </h1>
                    <p className="text-slate-600">
                        条件のご入力は既に完了しています。<br />
                        ご不明点がございましたら、担当者までお問い合わせください。
                    </p>
                </div>
            </div>
        )
    }
    
    return <CollectFormClient token={token} linkId={result.data!.id} />
}
