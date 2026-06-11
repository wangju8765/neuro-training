# 实施计划：Supabase 迁移

## 配置信息

| 项目 | 值 |
|------|-----|
| Supabase URL | `https://pkxmsfyzcphzvuangrzs.supabase.co` |
| anon key | 已提供 |
| service_role key | 已提供 |

## 步骤

### Step 1: 建表（SQL）
用 Supabase SQL Editor 执行 DDL 脚本，创建 8 张表 + RLS 策略。

### Step 2: 前端改造
加载 Supabase JS SDK（CDN），修改 index.html：

**2a. 新增页面：登录页**
- 显示已有用户列表（头像+名字）
- 点选用户 → 弹出 PIN 输入 → 验证 → 进入首页
- 底部"新用户"按钮 → 输入名字+设 PIN → 创建用户

**2b. 数据层重构**
- 所有 `initDC()` / `flushDC()` / `loadDn()` / `svDn()` / `initPS()` / `flushPS()` 改为操作 Supabase API
- localStorage 保留做缓存（首次加载后存一份，离线可看）
- 每次修改数据：先写 localStorage（秒级响应），再异步同步到 Supabase

**2c. 锁定用户数据**
- 登录成功后 `currentUserId` 存入 localStorage（非敏感，仅用于标识当前用户）
- 所有查询加 `user_id` 过滤
- 注销或切换用户清除 localStorage 缓存

### Step 3: 测试
- 创建两个用户（儿子/女儿）
- 各自添加项目、安排时段、打卡、得金币、兑换
- 确认数据互不干扰
- 确认刷新后数据在
- 确认清缓存后重新登录数据还在
