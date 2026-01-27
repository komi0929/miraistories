-- =====================================================
-- MA情報収集機能: データベーススキーマ
-- 譲渡元からの条件入力を収集するためのテーブル群
-- =====================================================

-- 1. 情報収集リンク管理テーブル
-- 管理者が発行するリンクを管理
CREATE TABLE IF NOT EXISTS ma_collection_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,              -- URLトークン（一意）
  scenario_id UUID REFERENCES scenarios,   -- 紐づくシナリオ（任意）
  owner_id UUID REFERENCES auth.users NOT NULL, -- 発行者（管理者）
  name TEXT,                               -- リンクの名前（任意）
  status TEXT CHECK (status IN ('pending', 'submitted', 'expired')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ                   -- 有効期限（任意）
);

-- 2. 譲渡元ユーザー（回答者）テーブル
-- メール認証用
CREATE TABLE IF NOT EXISTS ma_collection_respondents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES ma_collection_links ON DELETE CASCADE,
  email TEXT NOT NULL,
  verification_code TEXT,                  -- 認証コード
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 譲渡元入力データ（下書き対応）
-- 相手が入力した条件を保存
CREATE TABLE IF NOT EXISTS ma_collection_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES ma_collection_links ON DELETE CASCADE,
  respondent_id UUID REFERENCES ma_collection_respondents,
  is_draft BOOLEAN DEFAULT true,           -- 下書きフラグ
  
  -- デフォルト値（スケルトン費用）
  skeleton_cost NUMERIC DEFAULT 3000000,   -- スケルトン費用（税込）
  
  -- 販管費（月額）
  rent NUMERIC DEFAULT 0,                  -- 家賃
  utilities NUMERIC DEFAULT 0,             -- 光熱費
  labor_cost_total NUMERIC DEFAULT 0,      -- 人件費（簡易入力）
  labor_details JSONB DEFAULT '[]',        -- 人件費明細 [{ id, name, amount }]
  other_expenses_total NUMERIC DEFAULT 0,  -- その他経費（簡易入力）
  lease_details JSONB DEFAULT '[]',        -- リース明細 [{ id, name, amount }]
  use_detailed_expenses BOOLEAN DEFAULT false,
  
  -- 原価・売上
  cost_ratio NUMERIC DEFAULT 35,           -- 原価率（%）
  sales_strategy_mode TEXT DEFAULT 'simple' CHECK (sales_strategy_mode IN ('simple', 'detailed')),
  monthly_sales_simple NUMERIC DEFAULT 0,
  yearly_sales_baseline JSONB DEFAULT '{"year1": 0, "year2": 0, "year3": 0}',
  deals JSONB DEFAULT '[]',                -- 案件リスト [{ id, name, monthlyAmount, startMonth, durationMonths, probability, isFactoryFeeTarget }]
  
  -- 委託工場フィー（新規）
  factory_fee_percentage NUMERIC DEFAULT 0, -- 委託工場フィー率（%）
  
  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- RLS (Row Level Security) ポリシー
-- =====================================================

ALTER TABLE ma_collection_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE ma_collection_respondents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ma_collection_responses ENABLE ROW LEVEL SECURITY;

-- ma_collection_links: 管理者のみ全操作可能
CREATE POLICY "Admin full access ma_collection_links" ON ma_collection_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ma_collection_links: 匿名ユーザーはトークンで参照のみ
CREATE POLICY "Public read by token ma_collection_links" ON ma_collection_links
  FOR SELECT USING (true);

-- ma_collection_respondents: 管理者は全アクセス
CREATE POLICY "Admin full access ma_collection_respondents" ON ma_collection_respondents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ma_collection_respondents: 匿名ユーザーは挿入・更新可能（メール認証フロー）
CREATE POLICY "Public insert ma_collection_respondents" ON ma_collection_respondents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update own ma_collection_respondents" ON ma_collection_respondents
  FOR UPDATE USING (true);

CREATE POLICY "Public select ma_collection_respondents" ON ma_collection_respondents
  FOR SELECT USING (true);

-- ma_collection_responses: 管理者は全アクセス
CREATE POLICY "Admin full access ma_collection_responses" ON ma_collection_responses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ma_collection_responses: 匿名ユーザーは挿入・更新可能（条件入力フロー）
CREATE POLICY "Public insert ma_collection_responses" ON ma_collection_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update ma_collection_responses" ON ma_collection_responses
  FOR UPDATE USING (true);

CREATE POLICY "Public select ma_collection_responses" ON ma_collection_responses
  FOR SELECT USING (true);

-- =====================================================
-- 更新日時自動更新トリガー
-- =====================================================

CREATE OR REPLACE FUNCTION update_ma_collection_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ma_collection_responses_updated_at
  BEFORE UPDATE ON ma_collection_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_ma_collection_responses_updated_at();

-- =====================================================
-- インデックス
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ma_collection_links_token ON ma_collection_links(token);
CREATE INDEX IF NOT EXISTS idx_ma_collection_links_owner ON ma_collection_links(owner_id);
CREATE INDEX IF NOT EXISTS idx_ma_collection_respondents_link ON ma_collection_respondents(link_id);
CREATE INDEX IF NOT EXISTS idx_ma_collection_respondents_email ON ma_collection_respondents(email);
CREATE INDEX IF NOT EXISTS idx_ma_collection_responses_link ON ma_collection_responses(link_id);
