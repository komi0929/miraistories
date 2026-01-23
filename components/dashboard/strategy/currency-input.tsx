'use client'

import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value: number
    onChange: (value: number) => void
    className?: string
}

export function CurrencyInput({ value, onChange, className, ...props }: CurrencyInputProps) {
    // 内部状態（文字列）
    const [displayValue, setDisplayValue] = useState('')

    // 外部からのvalue変更を同期
    useEffect(() => {
        if (value === 0 && displayValue === '') return
        setDisplayValue(value.toLocaleString())
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // カンマを除去して数値化
        const rawValue = e.target.value.replace(/,/g, '')

        if (rawValue === '' || rawValue === '-') {
            setDisplayValue(rawValue)
            onChange(0)
            return
        }

        const numValue = parseInt(rawValue, 10)

        if (!isNaN(numValue)) {
            // 入力中はカーソル位置の問題があるのでtoLocaleStringせずそのまま表示し更新
            // ただしBlur時にフォーマットするなどの工夫も可能だが、
            // ここではシンプルに入力は生の数字、Blurで整形、あるいは都度整形のUXにする
            // 日本語入力環境だと都度整形は使いにくいので、
            // 生入力を許容しつつ、バリデーションのみ行う

            // UX向上のため、やはり都度フォーマットする
            // 桁区切りが見えると入力しやすい
            setDisplayValue(numValue.toLocaleString())
            onChange(numValue)
        }
    }

    // 1万円単位などのショートカット機能（将来拡張用）
    // 例えば +1万 ボタンなどを横に配置する場合、親コンポーネントで制御する

    return (
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">¥</span>
            <Input
                {...props}
                type="text" // numberではなくtextにする
                value={displayValue}
                onChange={handleChange}
                className={`pl-7 text-right ${className}`}
                placeholder="0"
            />
        </div>
    )
}
