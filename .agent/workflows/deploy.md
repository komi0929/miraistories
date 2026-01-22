---
description: 改善後にGitHub/Vercel本番環境へ自動デプロイ
---
# 本番デプロイワークフロー

## 前提条件
- GitHubリポジトリ: `https://github.com/komi0929/miraistories`
- Vercel: GitHub連携済み（mainブランチへのプッシュで自動デプロイ）

## 手順

### 1. 変更をステージング
// turbo
```bash
git add -A
```

### 2. コミット
// turbo
```bash
git commit -m "fix/feat: [変更内容の説明]"
```

### 3. GitHubにプッシュ（Vercel自動デプロイ開始）
// turbo
```bash
git push origin main
```

## 注意事項
- Vercel環境変数が設定されていることを確認
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ビルドエラーがないことを `npm run build` で確認してからプッシュ
