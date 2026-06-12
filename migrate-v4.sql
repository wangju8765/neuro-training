-- ===== 每日打卡 v4 数据库迁移 =====
-- 运行方式：在 Supabase Dashboard → SQL Editor 中执行
-- 日期：2026-06-12

BEGIN;

-- 1. users 表：添加 role 字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
-- 将王巨（PIN=8765）设为管理员
UPDATE users SET role = 'admin' WHERE pin = '8765';

-- 2. items 表：添加 public 相关字段
ALTER TABLE items ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE items ADD COLUMN IF NOT EXISTS created_by TEXT;
-- 现有项目：标记 created_by 为各用户的 pin（从 user_id 反查）
UPDATE items SET created_by = (SELECT pin FROM users WHERE users.id = items.user_id);
-- 如果 created_by 为空，设为 '8765'（王巨）
UPDATE items SET created_by = '8765' WHERE created_by IS NULL;
-- 旧 deleted=true 的项目标记为 inactive
UPDATE items SET active = false WHERE deleted = true;

-- 3. 新建 user_favorites 表
CREATE TABLE IF NOT EXISTS user_favorites (
  id BIGSERIAL PRIMARY KEY,
  user_pin TEXT NOT NULL,
  item_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_pin, item_id)
);

-- 4. 为每个用户初始化 favorites（他们当前拥有的项目）
INSERT INTO user_favorites (user_pin, item_id, sort_order)
SELECT u.pin, i.item_id, i.sort_order
FROM items i
JOIN users u ON u.id = i.user_id
WHERE i.deleted = false OR i.deleted IS NULL
ON CONFLICT (user_pin, item_id) DO NOTHING;

-- 5. daily_logs 表优化（如果表不存在则创建）
-- 增强索引
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date_key);

-- 6. 删除 slots 表（不再需要时段排程）
DROP TABLE IF EXISTS slots;

COMMIT;
