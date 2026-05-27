-- ============================================================
-- Supabase DDL for 每日打卡 neuro-training
-- Run this in the Supabase SQL Editor (service_role)
-- ============================================================

-- 0. Create initial user (default PIN: 1234)
-- Run AFTER tables are created

-- 1. users table
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '小伙伴',
  pin TEXT NOT NULL DEFAULT '1234',
  avatar TEXT NOT NULL DEFAULT '😊',
  settings JSONB NOT NULL DEFAULT '{"userName": "小伙伴"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. items table (exercises / check-in items)
CREATE TABLE IF NOT EXISTS public.items (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL, -- e.g. 'cold', 'bee', 'item_12345'
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '✅',
  type TEXT NOT NULL DEFAULT 'simple', -- 'routine' | 'simple'
  duration REAL NOT NULL DEFAULT 1, -- in minutes
  time_label TEXT NOT NULL DEFAULT '1分钟',
  points INT NOT NULL DEFAULT 5,
  cycle_count INT DEFAULT 1,
  note TEXT DEFAULT '',
  steps JSONB DEFAULT '[]'::jsonb, -- array of {t,h,d}
  sort_order INT NOT NULL DEFAULT 0,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- 3. slots table (time slots: morning/afternoon/evening)
CREATE TABLE IF NOT EXISTS public.slots (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slot_id TEXT NOT NULL, -- 'morning' | 'afternoon' | 'evening'
  icon TEXT NOT NULL DEFAULT '☀️',
  name TEXT NOT NULL,
  item_ids TEXT[] NOT NULL DEFAULT '{}', -- array of item_id strings
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, slot_id)
);

-- 4. daily_logs table (which items completed on which day)
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date_key TEXT NOT NULL, -- 'YYYY-M-D' format
  completed_items TEXT[] NOT NULL DEFAULT '{}', -- array of item_id strings
  earned_points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date_key)
);

-- 5. points_state table (current balance for each user)
CREATE TABLE IF NOT EXISTS public.points_state (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  points INT NOT NULL DEFAULT 0,
  daily_points JSONB NOT NULL DEFAULT '{}'::jsonb, -- { "YYYY-M-D": { "earned": 0 } }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 6. point_logs table (transaction history)
CREATE TABLE IF NOT EXISTS public.point_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'earn' | 'redeem'
  amount INT NOT NULL DEFAULT 0,
  item_name TEXT NOT NULL DEFAULT '',
  balance_after INT NOT NULL DEFAULT 0,
  timestamp_ms BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. rewards table (reward templates per user)
CREATE TABLE IF NOT EXISTS public.rewards (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  icon TEXT NOT NULL DEFAULT '🎁',
  name TEXT NOT NULL,
  cost INT NOT NULL DEFAULT 10,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. redeemed table (purchased rewards / backpack)
CREATE TABLE IF NOT EXISTS public.redeemed (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  redeem_id TEXT NOT NULL, -- 'rd_' + timestamp
  icon TEXT NOT NULL DEFAULT '🎁',
  name TEXT NOT NULL,
  cost INT NOT NULL DEFAULT 0,
  purchased_at BIGINT NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, redeem_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_user_id ON public.items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_deleted ON public.items(deleted);
CREATE INDEX IF NOT EXISTS idx_slots_user_id ON public.slots(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs(user_id, date_key);
CREATE INDEX IF NOT EXISTS idx_point_logs_user_id ON public.point_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_user_id ON public.rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_redeemed_user_id ON public.redeemed(user_id);

-- Insert initial user (PIN: 1234)
INSERT INTO public.users (name, pin, avatar, settings)
VALUES ('小伙伴', '1234', '😊', '{"userName": "小伙伴"}'::jsonb);
