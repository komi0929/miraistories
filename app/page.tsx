import { redirect } from 'next/navigation'

// 認証無効化中: ダッシュボードに直接リダイレクト
export default function Home() {
  redirect('/dashboard')
}

// ============================================
// 🔒 認証復旧時は下記に戻す
// ============================================
// import { redirect } from 'next/navigation'
// export default function Home() {
//     redirect('/auth/login')
// }
// ============================================
