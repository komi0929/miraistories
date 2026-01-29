-- =====================================================
-- MA シミュレーション版管理機能: スキーマ拡張
-- 相手方の申請データに基づく複数パターンのシミュレーション管理
-- =====================================================

-- 1. ma_simulations テーブルにカラム追加
-- source_link_id: 元となった申請リンク（1案件前提で1つのlink_id）
ALTER TABLE ma_simulations ADD COLUMN IF NOT EXISTS source_link_id UUID REFERENCES ma_collection_links(id) ON DELETE SET NULL;

-- version_type: original（相手の申請そのまま）/ custom（管理者作成）
ALTER TABLE ma_simulations ADD COLUMN IF NOT EXISTS version_type TEXT DEFAULT 'custom' CHECK (version_type IN ('original', 'custom'));

-- version_number: 版番号（表示用、同一source_link_id内でのシーケンス）
ALTER TABLE ma_simulations ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;

-- 2. インデックス追加（source_link_idでの検索最適化）
CREATE INDEX IF NOT EXISTS idx_ma_simulations_source_link ON ma_simulations(source_link_id);
CREATE INDEX IF NOT EXISTS idx_ma_simulations_version_type ON ma_simulations(version_type);

-- 3. 既存データのversion_type設定（既存はすべてcustom扱い）
-- ※ 既存データがある場合に備えてUPDATE
UPDATE ma_simulations SET version_type = 'custom' WHERE version_type IS NULL;
