# 开发日志 · Daily Training

---

## 2026-06-12 — v4.5 会话总结：数据持久化深度修复

### 本日改动链条
v4.3 → v4.4 → v4.5，围绕一个核心问题：**页面刷新/重登后数据丢失**。

### v4.3 — 四项反馈修复（commit: `7386493`）
1. 退出登录彻底清理（停止计时器/TTS，重置内存，清除 localStorage）
2. 详情页去掉"已收藏（点击取消）"行
3. 工具/跟练自然完成直接回首页，不弹回详情页；npFinish 补 logCompletion
4. 拖拽排序触屏体验重写（preventDefault 防滚动，touchmove 实时高亮）

### v4.4 — 修复刷新数据丢失第一轮（commit: `989bfb4`）
- `syncItems()` 去掉 `!isAdmin()` 限制，普通用户按 `_createdBy` 同步
- `loadFavorites()` Supabase 空数据不覆盖 localStorage
- `loadUserDataFromSupabase()` Supabase 无数据时保留本地项目
- `startup()` fallback 补 `loadFavorites()` + `fetchTodayLogs()`
- `saveItem()` 标记 `_createdBy`

### v4.5 — 修复编辑持久化（commit: `97a5fa7` → `7e7d40c`）
**根因发现：** 两次独立 bug 叠加导致编辑丢失：
1. **合并逻辑 bug：** 项目在 Supabase 和 localStorage 同时存在时，Supabase 旧版覆盖本地修改。改为本地优先。
2. **logout 清除共享数据：** `doLogout()` 里 `localStorage.removeItem('dc_items')` 把项目库清空了。项目库是共享的，退出登录不应清除。
3. **保存时机：** `saveItem()` 改为直接 `syncItems()` 等待完成，不经过队列。

### 当前架构要点
- **项目库(`dc_items`)是全局共享的**，所有用户共用一个 localStorage 副本，退出登录不清除
- **用户专属数据**（收藏 `dc_fav_<pin>`、金币 `dc_points_state`、设置 `dc_settings`）退出时清除
- **合并策略：本地优先** — 刷新/重登时，本地有编辑的项目优先于 Supabase 版本
- **同步：** 管理员同步全部项目，普通用户仅同步 `_createdBy` 匹配的

### 代码量追踪
- index.html: 4382 → 4489 行（本日 +107行）
- 总 commit: 5 个（v4.3 × 1 + v4.4 × 1 + v4.5 × 2 + 已计入之前的一个），全部已推送

### 待验证
- 非管理员创建项目 → 刷新 → 项目仍在
- 编辑项目内容 → 退出登录 → 重新登录 → 编辑生效
- 切换账户 → 项目库保持一致

---

## 2026-06-12 — v4.4 修复刷新数据丢失

### 根因分析
刷新页面后所有设置（收藏/自建项目/金币）丢失，有三个层面问题：
1. **`syncItems()` 只有管理员能执行**（`!isAdmin()` 守卫），非管理员创建的项目只写 localStorage，从不写 Supabase
2. **`loadFavorites()` 在 Supabase 返回空数据时，用空数组覆盖了 localStorage 缓存**
3. **`loadUserDataFromSupabase()` 直接替换 `DC.items`**，不合并本地独有项目

### 修复
1. `syncItems()`：移除管理员限制，普通用户同步自己创建的项目（按 `_createdBy` 过滤）
2. `loadFavorites()`：Supabase 空数据时保留 localStorage 缓存，不再覆盖
3. `loadUserDataFromSupabase()`：合并 Supabase 项目 + 本地独有项目（自建未同步的）
4. `startup()` fallback 路径补上 `loadFavorites()` 和 `fetchTodayLogs()` 调用
5. `saveItem()`：新建项目自动标记 `_createdBy` 字段

### 代码量
- index.html: 4439 → 4481 行（+42行）
- commit: `989bfb4`（待 push，GitHub 暂时不可达）

---

## 2026-06-12 — v4.3 反馈修复

### 修复一：退出登录彻底清理
- `doLogout()` 重写：停止所有计时器/TTS，重置全部内存变量（userFavorites/DC/PS/Dn/todayLogs/reorderMode）
- 清除 localStorage：dc_points_state/dc_items/dc_slots/dc_settings/dc_trash/dc_fav_*
- 删除无效的 `PS_clear` 引用

### 修复二：详情页去掉收藏行
- 删除 `#selfFav` div 和 `toggleFavoriteInDetail()` 函数
- 收藏管理统一在项目库中操作

### 修复三：工具/跟练完成自动完成
- `closeMetronome()`：自然完成直接回首页 + 弹框；手动停止才回详情页
- `npFinish()`：直接回首页，不再跳回详情页二次确认
- `npFinish()` 补充缺失的 `logCompletion()` 调用（之前只有注释未执行）

### 修复四：首页拖拽排序体验
- 触摸拖拽重写：`touchstart` preventDefault 防滚动 + `touchmove` 实时高亮 + `touchend` 执行交换
- 拖拽手柄加大（padding + margin），touch-action:none
- 排序模式下卡片 onclick 禁用，防误触

### 代码量
- index.html: 4382 → 4439 行（+57行）
- commit: `7386493`，已推送

---

## 2026-06-12 — v4 架构升级：公共项目库 + 权限分离

### 背景
Zeno 提出三个整体方向调整：取消时段、建立公共项目库+管理员权限、数据上 Supabase。这是一次架构性重构。

### 数据库迁移（migrate-v4.sql）
- `users` 表加 `role` 字段，王巨(PIN=8765)设为 `admin`
- `items` 表加 `active`、`created_by`，改为公共项目库
- 新建 `user_favorites` 表（收藏系统）
- 删除 `slots` 表
- 已有项目自动初始化到各用户的收藏

### 数据流改造
- Dn localStorage 数组废除
- 每日完成记录改为 `daily_logs` 逐条实时写入 Supabase
- 收藏同步到 `user_favorites`，支持跨设备

### 功能变更
| 模块 | 变化 |
|------|------|
| 时段系统 | 全部删除：上午/下午/晚上标签、时段编排、slots 表 |
| 首页 | 显示收藏列表（可拖拽排序），点击进入详情页 |
| 今日看板 | 紧凑横条：emoji 滑动 + 次数/金币统计 |
| 项目库 | 新页面📚：浏览全部项目、⭐收藏圆圈打勾、管理员可增删改 |
| 详情页 | 统一入口：所有项目必须经过详情页确认才能完成 |
| 权限 | 管理员专属：项目管理/奖励/回收站；普通用户仅可见工具和称呼设置 |
| 完成 | 可重复打卡，每次实时写 daily_logs |

### v4.1 优化
- 详情页根据类型显示不同按钮（跟练/工具/完成）
- 首页拖拽排序（HTML5 drag + touch）
- 看板固定高度防挤占
- 项目库收藏按钮移至最左

### v4.2 修复
- 看板改为紧凑横条（仅 emoji 滑动）
- 编辑器关闭后回到来源页（项目库/管理页）
- 工具完成后返回详情页而非首页
- 详情页去编辑按钮

### 代码量
- index.html: 4317 → 4382 行（净增约 65 行）
- 新增 migrate-v4.sql
- 总 commit: 3 个（v4 重构 + v4.1 优化 + v4.2 修复），已推送

**待执行：** Supabase Dashboard 运行 migrate-v4.sql（已完成）

---

## 2026-06-12 — 脚步罗盘全面改造

### 背景
Zeno 反馈了脚步罗盘（数字盘）的四个核心问题，逐一修复。

### 改动一：数字生成规则重写
- 旧规则仅禁止相邻数字连续（1↔2, 2↔3），无法保证跨中线
- 新规则三大约束：
  1. **禁止同号连续**：3→3 ❌
  2. **禁止同侧连续**：右侧 1-4 后必须接 0/5/6/7/8/9；左侧 6-9 后必须接 0/1/2/3/4/5
  3. **中线桥接**：0/5 可连任意数字（但不能同号）
- 算法烟雾测试：0 违规

### 改动二：难度调整
- 每级减 1-2 个数字：[5,8,10,10] → [4,6,8,8]
- 单脚 33→26，双脚 66→52

### 改动三：手动控制模式
- 移除 5 秒自动超时推进
- 新增「▶ 下一个数字」大按钮
- 用户按一次 → 念下一个数字 → 用脚去点 → 再按再继续
- 暂停/停止按钮保留

### 改动四：语音分离
- 引导语（开场/换脚/过渡/完成）→ 阿里云 TTS sitong 童声
- 数字播报 → 浏览器 SpeechSynthesis（不变，够用）
- 新增 5 条 MP3：numpad-left-intro / numpad-group-next / numpad-left-done / numpad-right-intro / numpad-all-done
- 新增独立生成脚本 `tts-numpad.js`

### 仓库修复
- Daily-Training 目录重新初始化 git，关联 origin，文件从 Openclaw-Workspace 迁回
- 项目记忆更新：工作目录指向 Daily-Training

### 代码量
- index.html: 4317 → 4435 行（+118行）
- 新增 tts-numpad.js（100行）
- commit: `62493eb`，已推送

---

## 2026-06-11 — v3 UX 全面优化

### 项目交接 + 文档重建
1. 全面扫描项目代码和文档，理解完整架构
2. 梳理当前开发状态：v2.x 功能完整
3. 重建项目文档：README.md / PLAN.md / LOG.md / CLAUDE.md
4. 清理 Daily-Training 目录，统一到 Git 仓库
5. commit: `291b1e5`

### 改动一：首页一键打卡
- 自助打卡项目点击卡片直接完成（1步代替2步）
- 卡片新增 📋 箭头入口，可查看步骤说明
- Toast 轻提示替代全屏弹窗
- 提取 `completeItem()` 共享函数
- commit: `a3e1053`

### 改动二：快速记录入口
- 首页右下角 ✏️ FAB 浮动按钮
- 半屏弹窗：自由文本 + 关联项目搜索
- 关联项目自动标记完成 + 加金币
- 首页「📝 今日记录」区域实时显示
- localStorage 按天存储
- commit: `a3e1053` + `f69b397`

### 改动三：节拍器快捷入口 + 增强
- Header 新增 🎵 一键打开节拍器
- 多拍子模式选择（2拍/3拍/4拍）
- BPM 输入框加大到 4rem，范围 20-300
- 脉冲圆视觉指示替代文字
- commit: `a3e1053` + `7343565`

### 改动四：跟练页视觉填充
- 进度环（conic-gradient 扇形）
- 倒计时数字回归环中心
- 步名和提示文字清晰展示
- commit: `a3e1053`

### 修复
- Toast 默认 opacity:0，修复初始可见残影
- FAB 移入 #pH 内部，只在首页出现
- commit: `7343565`

### 代码量
- index.html: 4027 → 4317 行（+290行）
- 总 commit: 4 个，全部已推送

**发现的问题：**
- 本地目录不是 git 仓库（可能需要重新 clone 或 init）
- 部分历史文档（应用功能梳理方案.md、实施方案.md）已完成使命，可归档
- index.html 约 4027 行，单文件维护成本渐高
- 跟练页视觉空白问题仍待解决

**下一步建议：**
- 初始化 git 仓库并关联 GitHub remote
- 与 Zeno 确认当前使用中的痛点
- 根据反馈确定下一阶段开发重点

---

## 2026-05-29 — P0/P1/P2 全部上线

### 架构重构：工具型→工具绑定
- 去掉「工具型」项目类型，编辑器只剩跟练型/自助打卡
- 新增「关联工具(可选)」选择（无/节拍器/数字盘）
- 设置页新增「🧰 工具中心」独立入口
- 旧数据(type==='tool')运行时自动兼容
- commit: `ea579ac` ✅

### 后续修复
- 节拍器启动 bug 修复（paused 状态冲突）
- 首页去标签徽章（视觉拥挤）
- 跨设备同步 toolLink/tag/desc/props 字段补全
- 节拍器运行中改 BPM 生效
- 数字盘语音修复（逐位报数 + 引导语）

---

## 2026-05-28 — TTS v2 + 数字盘 + 节拍器

### TTS v2（sitong 童声 + SSML break）
- 从 aifei（激昂男声）切换为 sitong（童声女）
- 引入 SSML `<break time="1s"/>` 解决倒计时过快问题
- 107条音频全部重新生成
- 部署方式从 Supabase Storage 迁移到 GitHub Pages 本地音频

### 节拍器（M19）
- Web Audio API 实现，两拍一组强弱交替
- BPM 预设：40摇篮/50摇摆/54标准/60拍手/72进阶
- 时长可调，倒计时联动

### 数字盘（M22）
- 钟面布局，10个数字位置
- 8组练习，跨中线约束算法
- Web Speech API 语音播报

### 其他
- M20: 自助打卡详情页（防误触）
- M18: 设置页退出登录

---

## 2026-05-27 — Supabase 迁移 + 多用户系统

- 8张数据表建立（users/items/slots/daily_logs/points_state/point_logs/rewards/backpack）
- PIN码登录系统
- localStorage ↔ Supabase 双向同步
- 自定义认证（不用 Supabase Auth）
- RLS 策略修复（因为不用 auth.uid()，改为应用层安全）

---

## 2026-05-26 — 项目启动

- 项目从「主宰」交接给「史蒂夫老师」
- 初始版本：神经功能训练跟练应用
- 5轮大规模改造：数据层重构→UI优化→Bug修复→细节优化→分类体系重构
