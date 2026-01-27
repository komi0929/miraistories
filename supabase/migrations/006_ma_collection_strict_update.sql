-- =====================================================
-- MA情報収集機能強化: 厳格シミュレーション用カラム追加
-- =====================================================

-- 1. 譲渡希望価格（税込）
-- 投資回収シミュレーションの分母となる金額
ALTER TABLE ma_collection_responses 
ADD COLUMN IF NOT EXISTS desired_transfer_price NUMERIC DEFAULT 0;

-- 2. 最大生産キャパシティ（月商目安）
-- 人員不足アラート判定用
ALTER TABLE ma_collection_responses 
ADD COLUMN IF NOT EXISTS max_capacity_sales NUMERIC DEFAULT 0;
