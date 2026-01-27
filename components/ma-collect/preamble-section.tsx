'use client'

import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export function PreambleSection() {
    return (
        <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
                <div className="flex gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-3 text-sm text-amber-900">
                        <p className="font-medium text-base">
                            この度は貴重な機会をありがとうございます。
                        </p>
                        
                        <p>
                            譲渡の検討条件として、<strong>福岡ファクトリー単体の経常利益で、3年以内に確実に初期投資およびスケルトン費用が回収できること</strong>を前提にさせていただいています。
                        </p>
                        
                        <div className="bg-white/50 rounded-md p-3 border border-amber-200">
                            <p className="text-xs text-amber-700">
                                ※「確実」の定義: 新規営業なし。ただし、機器の故障や設備の改修は一旦考慮しません。
                            </p>
                        </div>
                        
                        <p>
                            その条件を満たすか判断するため、以下の項目をご記入ください。
                        </p>
                        
                        <p className="font-medium text-amber-800 bg-amber-100 rounded px-3 py-2">
                            📝 すべての金額は<strong>税込み</strong>でご記入をお願いいたします。
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
