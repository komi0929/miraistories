---
description: 改善後に自動的にGitコミット&プッシュ
---

# 自動コミットワークフロー

// turbo-all

## 手順

1. 変更をステージング
```bash
git add -A
```

2. コミット作成
```bash
git commit -m "改善: [自動検出された変更内容]"
```

3. リモートにプッシュ
```bash
git push origin main
```

## 使用タイミング
- コード修正完了後
- バグ修正後
- 機能追加後
