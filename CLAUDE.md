# CLAUDE.md — 每日打卡 · Daily Training

## 项目定位
家庭用每日打卡工具，零依赖单页 HTML 应用，部署在 GitHub Pages。

## 核心约束
- **不可引入任何框架或构建工具** — 保持零依赖
- **移动端优先** — 基于 375px 视口宽度设计（`font-size: calc(100vw / 375 * 16)`）
- **所有代码在 index.html 中** — CSS 在 `<style>`，JS 在 `<script>`
- **数据流：** localStorage（本地缓存 + 离线基线）↔ Supabase（云端持久层）
- **写入策略：** 先写 localStorage（秒级响应），异步同步到 Supabase
- **读取策略：** 先读 localStorage，Supabase 数据覆盖非空字段
- **用户认证：** 自定义 PIN 码，不走 Supabase Auth，RLS 已禁用
- **不内置神经功能评估** — APP 定位为执行和记录工具

## 技术栈速查
- Supabase URL: `https://pkxmsfyzcphzvuangrzs.supabase.co`
- Supabase anon key: 硬编码在 index.html 中（`SUPABASE_ANON_KEY`）
- GitHub 仓库: `wangju8765/neuro-training`
- 部署地址: `https://wangju8765.github.io/neuro-training/`
- TTS: 阿里云 NLS，sitong 童声，107条预生成 MP3

## 代码结构（index.html ~4027行）
1. **L1-L352:** CSS 样式（所有页面和组件）
2. **L354-L988:** HTML 结构（所有页面的 DOM）
3. **L989-L1052:** Supabase REST API 封装（SB 对象）
4. **L1054-L1198:** 标签定义 + 默认数据（DEF_ITEMS 50个 + DEF_SLOTS）
5. **L1206-L1805:** 用户系统 + 登录流程 + Supabase 同步
6. **L1815-L1900:** 每日记录 + 金币系统
7. **L1945-L2270:** 首页渲染 + 跟练逻辑 + 弹窗控制
8. **L2273-L2509:** 节拍器（Web Audio API）
9. **L2511-L2900:** 数字盘（序列生成 + TTS 播报）
10. **L2900-L4027:** 统计页 + 编辑器 + 设置页 + 商店 + 背包 + 音效

## 项目类型体系
- `routine` — 跟练型（步骤 + 倒计时 + TTS语音）
- `self` — 自助打卡（步骤说明 + 道具清单 + 一键完成）
- 工具通过 `item.toolLink = { type: 'metronome'|'numberpad', bpm?: number }` 绑定
- 兼容旧 `type==='tool'` → 运行时转 `self + toolLink`
- `self` + `toolLink` → 点击打开工具页，完成后自动打卡+加金币
- 工具中心入口 → 独立使用工具，不打卡不加金币

## 关键变量
- `DC` — 全局数据容器 { items, slots, settings, trash }
- `Dn` — 今日完成记录数组（格式: `"itemId_slotId"`）
- `PS` — 金币系统 { points, dailyPoints, pointLog, rewards, redeemed }
- `St` — 跟练状态 { pi, ex, cy, cs, st, ss, ... }
- `currentUser` — 当前登录用户对象（来自 Supabase users 表）

## 修改注意事项
- 修改 DEF_ITEMS 后需同步更新 Supabase（新用户创建时使用默认数据）
- 改数据库 schema 需同步更新 sync 和 load 函数
- TTS 音频命名规则: `tts-{projectId}-{stepKey}.mp3`
- 旧数据兼容逻辑分散在多处（getItem, sX, 编辑器），修改类型体系时需全部更新
- 金幣操作后需调用 `flushPS()` + `enqueueSync(...)` 
