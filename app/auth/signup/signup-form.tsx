'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

export function SignupForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (password !== confirmPassword) {
            setError('パスワードが一致しません')
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError('パスワードは6文字以上必要です')
            setLoading(false)
            return
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
        })

        if (error) {
            let errorMessage = error.message
            if (error.message.includes('already registered')) {
                errorMessage = 'このメールアドレスは既に登録されています'
            } else if (error.message.includes('Invalid email')) {
                errorMessage = 'メールアドレスの形式が正しくありません'
            }
            setError(errorMessage)
            setLoading(false)
        } else {
            setSuccess(true)
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/40">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle className="text-2xl text-center text-green-600">登録完了！</CardTitle>
                        <CardDescription className="text-center">
                            確認メールを送信しました。メール内のリンクをクリックしてアカウントを有効化してください。
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Link href="/auth/login" className="w-full">
                            <Button variant="outline" className="w-full">
                                ログイン画面へ
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">洋菓子店ERP 新規登録</CardTitle>
                    <CardDescription className="text-center">
                        アカウントを作成してシステムを利用開始
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSignup}>
                    <CardContent className="grid gap-4">
                        {error && (
                            <div className="text-sm font-medium text-destructive text-center">
                                {error}
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="email">メールアドレス</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="example@company.co.jp"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">パスワード</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="6文字以上"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirmPassword">パスワード（確認）</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading ? '登録中...' : 'アカウント作成'}
                        </Button>
                        <Link href="/auth/login" className="w-full">
                            <Button variant="link" className="w-full text-sm">
                                既にアカウントをお持ちの方はこちら
                            </Button>
                        </Link>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
