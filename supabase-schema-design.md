# Supabase 数据库设计方案

## 概览

当前每日打卡应用的数据全部存放在浏览器 localStorage，共涉及以下数据。

转换成 Supabase 后，每个用户的数据独立存储在云端的 PostgreSQL 数据库中。

---

## 数据表设计

### 表1: `users` — 用户

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键（自动生成） |
| name | text | 用户昵称（如"爸爸"、"哥哥"、"妹妹"） |
| pin | text | 4位数 PIN 码 |
| avatar_emoji | text | 头像 emoji（默认 👤） |
| created_at | timestamptz | 创建时间 |

无需邮箱、无需密码，一个 PIN 码一个身份。Supabase Auth 的 email 认证我们不需要用，直接用这张表做用户管理。

---

### 表2: `items` — 打卡项目

对应现在的 `DC.items`。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 项目 id（如 'cold', 'bee'） |
| user_id | UUID | 所属用户（外键 → users） |
| name | text | 项目名称（如"冷水唤醒"） |
| icon | text | emoji 图标 |
| duration | real | 持续时间（分钟，0.5=30秒） |
| note | text | 备注（可选，如"需瑜伽球"） |
| type | text | 类型：'routine'(跟练) 或 'check'(纯打卡) |
| points | integer | 完成所得金币数（默认5） |
| steps | jsonb | 跟练步骤数组（纯打卡为空） |
| sort_order | integer | 排序序号 |
| created_at | timestamptz | 创建时间 |
| deleted | boolean | 是否软删除（替代 trash 数组） |

**steps 结构（jsonb）：**
```json
[
  {"t": "冷水拍脸颊眼周", "h": "洗漱时做", "d": 8},
  {"t": "冷水拍脖子前侧", "h": "", "d": 6}
]
```

---

### 表3: `slots` — 时段安排

对应现在的 `DC.slots`。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 时段 id：'morning' / 'afternoon' / 'evening' |
| user_id | UUID | 所属用户 |
| name | text | 时段名称（"上午"/"下午"/"晚上"） |
| icon | text | emoji 图标 |
| item_ids | jsonb | 安排的项目 id 数组，如 `["cold","bee","crawl"]` |

---

### 表4: `daily_logs` — 每日完成记录

对应现在的 `Dn`（`dc_YYYY-M-D`）。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint | 主键（自动生成） |
| user_id | UUID | 所属用户 |
| date | date | 完成日期 |
| item_id | text | 完成的项目 id |
| completed_at | timestamptz | 完成时间 |

**每天每条记录一个完成项。** 替代 localStorage 中每天一个 JSON 数组。

---

### 表5: `points_state` — 金币状态

对应现在的 `PS`。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint | 主键 |
| user_id | UUID | 所属用户 |
| balance | integer | 当前金币余额 |
| updated_at | timestamptz | 最近更新时间 |

---

### 表6: `point_logs` — 金币流水

对应现在的 `PS.pointLog`。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint | 主键 |
| user_id | UUID | 所属用户 |
| date | date | 发生日期 |
| amount | integer | 变动量（正=获得，负=消耗） |
| type | text | 类型：'earn'(打卡获得) 或 'redeem'(兑换消耗) |
| item_id | text | 关联项目 id（可选） |
| created_at | timestamptz | 发生时间 |

---

### 表7: `rewards` — 奖励卡片

对应现在的 `PS.rewards`（奖励模板列表）。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint | 主键 |
| user_id | UUID | 所属用户 |
| name | text | 奖励名称 |
| icon | text | emoji 图标 |
| cost | integer | 所需金币 |
| created_at | timestamptz | 创建时间 |

---

### 表8: `backpack` — 背包

对应现在的 `PS.redeemed`（已兑换放入背包的物品）。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint | 主键 |
| user_id | UUID | 所属用户 |
| reward_id | bigint | 关联的奖励卡片 id（外键 → rewards） |
| redeemed_at | timestamptz | 兑换时间 |
| used | boolean | 是否已使用 |
| used_at | timestamptz | 使用时间（可选） |

---

## 关系图

```
users
  ├─ items (user_id)        ← 用户的打卡项目
  ├─ slots (user_id)        ← 用户的时段安排
  ├─ daily_logs (user_id)   ← 用户的每日完成记录
  ├─ points_state (user_id) ← 用户的金币余额
  ├─ point_logs (user_id)   ← 用户的流水记录
  └─ rewards (user_id)      ← 用户的奖励卡片
       └─ backpack (reward_id) ← 背包中的卡片副本
```

---

## 应用流程

### 登录
1. 打开应用 → 显示用户选择页（users 表中已有的用户列表）
2. 点自己名字 → 输 PIN 码 → 验证通过后进入
3. 后续所有请求带上 `user_id`

### 数据加载
首次登录或刷新页面时：
1. 调 Supabase API 按 `user_id` 拉取：items → slots → daily_logs → points_state → point_logs → rewards → backpack
2. 写入 localStorage 做缓存（清缓存不影响云端）
3. 离线时可读缓存数据

### 数据写入
每次操作：
1. 改本地缓存（秒级响应）
2. 异步调 Supabase API 同步到云端
3. 同步失败不阻塞 UI，下次打开自动重试

### 换设备
登录同一 PIN → 从 Supabase 拉取所有数据 → 和刷缓存没区别

---

## 技术细节

| 项目 | 方案 |
|------|------|
| 数据库 | Supabase PostgreSQL |
| 客户端 | Supabase JS SDK（通过 CDN 引入，不依赖打包工具） |
| 认证 | 自定义 PIN 码（Supabase Auth 的 email/password 不用，我们自己验证） |
| 安全 | Row Level Security (RLS) — 每个用户只能看到自己的数据 |
| 离线 | localStorage 加速缓存 |
| 部署 | 代码仍在 GitHub Pages（index.html 单页），通过 Supabase JS SDK 连后端 |

---

## 2026-05-27 Zeno 确认

- ✅ PIN 码登录 — 接受
- ✅ 不要家长控制 — 各管各的
- ✅ 不要老数据 — 从新建系统开始
- ✅ 目前 2 用户（儿子、女儿），未来可扩展
