
-- M&Aシミュレーション履歴テーブル
create table if not exists ma_simulations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  title text not null, -- シナリオ名
  simulation_data jsonb not null, -- 入力データ一式 (SimulationData型)
  created_at timestamptz default now() not null
);

-- RLSポリシー
alter table ma_simulations enable row level security;

create policy "Users can view their own simulations"
  on ma_simulations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own simulations"
  on ma_simulations for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own simulations"
  on ma_simulations for delete
  using (auth.uid() = user_id);
