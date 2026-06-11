-- ============================================================
-- 每日打卡 · Supabase 建表脚本
-- 在 Supabase 后台 → SQL Editor 中执行
-- ============================================================

-- 1. users（用户）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pin TEXT NOT NULL,
  avatar_emoji TEXT DEFAULT '👤',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. items（打卡项目）
CREATE TABLE IF NOT EXISTS items (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '✅',
  duration REAL DEFAULT 1,
  note TEXT DEFAULT '',
  type TEXT DEFAULT 'routine' CHECK(type IN ('routine','check')),
  points INTEGER DEFAULT 5,
  steps JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id, user_id)
);

-- 3. slots（时段安排）
CREATE TABLE IF NOT EXISTS slots (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📋',
  item_ids JSONB DEFAULT '[]',
  PRIMARY KEY (id, user_id)
);

-- 4. daily_logs（每日完成记录）
CREATE TABLE IF NOT EXISTS daily_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- 5. points_state（金币余额）
CREATE TABLE IF NOT EXISTS points_state (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. point_logs（金币流水）
CREATE TABLE IF NOT EXISTS point_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('earn','redeem')),
  item_id TEXT DEFAULT '',
  reward_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. rewards（奖励卡片模板）
CREATE TABLE IF NOT EXISTS rewards (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🎁',
  cost INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. backpack（背包=已兑换卡片）
CREATE TABLE IF NOT EXISTS backpack (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id BIGINT REFERENCES rewards(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🎁',
  cost INTEGER DEFAULT 0,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security（行级安全）
-- ============================================================

-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE backpack ENABLE ROW LEVEL SECURITY;

-- users 表：任何人都可查询用户列表（用于登录选择）
CREATE POLICY "users_select_all" ON users FOR SELECT USING (true);

-- items：用户只能操作自己的数据
CREATE POLICY "items_own" ON items FOR ALL USING (auth.uid() = user_id);

-- slots：用户只能操作自己的数据
CREATE POLICY "slots_own" ON slots FOR ALL USING (auth.uid() = user_id);

-- daily_logs：用户只能操作自己的数据
CREATE POLICY "daily_logs_own" ON daily_logs FOR ALL USING (auth.uid() = user_id);

-- points_state：用户只能操作自己的数据
CREATE POLICY "points_state_own" ON points_state FOR ALL USING (auth.uid() = user_id);

-- point_logs：用户只能操作自己的数据
CREATE POLICY "point_logs_own" ON point_logs FOR ALL USING (auth.uid() = user_id);

-- rewards：用户只能操作自己的数据
CREATE POLICY "rewards_own" ON rewards FOR ALL USING (auth.uid() = user_id);

-- backpack：用户只能操作自己的数据
CREATE POLICY "backpack_own" ON backpack FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 索引（加速查询）
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_slots_user ON slots(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_point_logs_user_date ON point_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_rewards_user ON rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_backpack_user ON backpack(user_id);

-- ============================================================
-- 创建默认用户（用于测试）
-- 运行后请修改 PIN！
-- ============================================================
INSERT INTO users (name, pin) VALUES ('儿子', '1234'), ('女儿', '5678');
