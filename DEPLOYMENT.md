# CI/CD 自動デプロイ設定ガイド

## 概要

mainブランチへのプッシュで以下が自動実行されます:

1. Supabaseデータベースマイグレーション適用
2. ビルド検証
3. Vercel本番デプロイ（GitHub連携済み）

## GitHub Secrets設定（必須）

リポジトリの Settings > Secrets and variables > Actions で以下を設定:

| Secret名                        | 値                     | 取得方法                                      |
| ------------------------------- | ---------------------- | --------------------------------------------- |
| `SUPABASE_PROJECT_REF`          | `ovwiikjnjwicgdemfkqa` | Supabaseダッシュボード > Project Settings     |
| `SUPABASE_ACCESS_TOKEN`         | アクセストークン       | https://supabase.com/dashboard/account/tokens |
| `NEXT_PUBLIC_SUPABASE_URL`      | プロジェクトURL        | Supabaseダッシュボード > API設定              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/publicキー        | Supabaseダッシュボード > API設定              |

## 使い方

```bash
git add -A
git commit -m "feat: 新機能"
git push
```

これだけで本番環境に完全反映されます。
