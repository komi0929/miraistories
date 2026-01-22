---
description: 改善後に自動的にGitコミット&プッシュ
---
# Auto Commit & Deploy

改善作業完了後にこのワークフローを実行すると、自動的にGitHubにコミット&プッシュされ、Vercelで本番デプロイが開始されます。

// turbo-all

## 1. ビルド確認
```bash
npm run build
```

## 2. 変更をステージング
```bash
git add -A
```

## 3. 自動コミット
```bash
git commit -m "chore: 自動コミット - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
```

## 4. 本番環境へプッシュ
```bash
git push origin main
```

## 完了
プッシュ後、Vercelが自動的にビルド&デプロイを開始します。
