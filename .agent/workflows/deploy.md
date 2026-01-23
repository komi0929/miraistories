---
description: 改善後にGitHub/Vercel本番環境へ自動デプロイ
---

# 自動デプロイワークフロー

// turbo-all

## 手順

1. ビルドテスト実行
```bash
npm run build
```

2. ビルド成功を確認後、変更をステージング
```bash
git add -A
```

3. コミット作成（日本語メッセージ）
```bash
git commit -m "feat: [変更内容の説明]"
```

4. mainブランチにプッシュ
```bash
git push origin main
```

## 注意事項
- Vercelは自動的にmainブランチの変更を検知してデプロイ
- 環境変数はVercel管理画面で事前設定が必要
- ビルドエラーが発生した場合は自動で修正を試みる
