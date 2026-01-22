export default function SalesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">販売・顧客</h1>
                <p className="text-slate-600">
                    卸売管理、POSデータ分析、請求書発行を行います
                </p>
            </div>

            <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
                <div className="text-6xl mb-4">🛒</div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                    販売モジュール
                </h2>
                <p className="text-slate-500 max-w-md mx-auto">
                    このモジュールは今後のアップデートで実装予定です。
                    卸売顧客管理、POSデータ連携、請求書自動発行機能が含まれます。
                </p>
            </div>
        </div>
    )
}
