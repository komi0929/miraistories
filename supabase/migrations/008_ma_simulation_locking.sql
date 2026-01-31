-- =====================================================
-- MA シミュレーション オリジナル版ロック機能と親子関係
-- =====================================================

-- 1. オリジナル版のロック機能（編集不可にする）
ALTER TABLE ma_simulations ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- 2. 親シミュレーションへの参照（編集版がオリジナルを参照）
ALTER TABLE ma_simulations ADD COLUMN IF NOT EXISTS parent_simulation_id UUID REFERENCES ma_simulations(id) ON DELETE SET NULL;

-- 3. インデックス追加
CREATE INDEX IF NOT EXISTS idx_ma_simulations_parent ON ma_simulations(parent_simulation_id);
CREATE INDEX IF NOT EXISTS idx_ma_simulations_locked ON ma_simulations(is_locked);

-- 4. 既存のoriginal版をロック
UPDATE ma_simulations SET is_locked = TRUE WHERE version_type = 'original' AND is_locked IS NOT TRUE;
