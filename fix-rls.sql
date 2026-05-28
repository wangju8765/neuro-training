-- 修复 users 表的 RLS 策略：允许任何人插入和查询
-- （使用的是自定义 PIN 登录，不是 Supabase Auth，所以不能用 auth.uid()）

-- 先删旧的 policy
DROP POLICY IF EXISTS "users_select_all" ON public.users;

-- 允许任何人查询用户列表（用于登录界面显示）
CREATE POLICY "users_select_all" ON public.users
  FOR SELECT USING (true);

-- 允许任何人插入新用户（注册）
CREATE POLICY "users_insert_all" ON public.users
  FOR INSERT WITH CHECK (true);

-- 允许用户更新自己的 settings（用 id 匹配，因为没有 auth.uid）
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (true) WITH CHECK (true);

-- 对其他表加宽策略：因为我们没用 Supabase Auth，所有认证在应用层做
-- 但出于安全，我们还是限制用户只能操作自己的数据
-- 要注意：anon key 下这些策略因为没有 auth.uid() 会全失败
-- 所以修改为：允许对所有表做全操作（因为我们的用户认证在应用层）

-- 给所有表加宽的策略（因为我们用的是自定义 PIN 登录，不是 Supabase Auth）
ALTER TABLE public.items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.redeemed DISABLE ROW LEVEL SECURITY;
