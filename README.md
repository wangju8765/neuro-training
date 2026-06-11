# 每日打卡 · Daily Training

**定位：** 家庭用每日打卡工具，可自定义打卡项目，按时段分配管理，含金币/奖励/背包系统  
**部署：** GitHub Pages — https://wangju8765.github.io/neuro-training/  
**仓库：** github.com/wangju8765/neuro-training  
**负责人：** 史蒂夫老师（AI 辅助全栈开发）

---

## 项目概述

从神经功能训练跟练应用重构为通用每日打卡工具：
- 支持**跟练型**（步骤引导+倒计时+语音）和**自助打卡**（图文说明+一键完成）两种模式
- 三个固定时段：上午/下午/晚上，项目自由分配
- 软删除+回收站，可恢复已删除项目
- 金币系统：每个项目可设金币值，完成即得金币
- 金币商店：可自定义奖励卡片，用金币兑换
- 背包系统：已购卡片存入背包，使用后消耗
- 工具中心：节拍器（Web Audio API）、数字盘（TTS语音引导）
- 分类标签：7个训练类别标签 + 统计视图
- 多用户：PIN码登录，各自独立数据

---

## 技术架构

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | 单文件 HTML (~4000行) | 零外部构建依赖，CDN免部署 |
| 样式 | 内嵌 CSS，rem + 视口缩放 | 移动端优先，适配 375px 基准 |
| 数据库 | Supabase PostgreSQL | 8张表，REST API 直连 |
| 认证 | 自定义 PIN 码 | 应用层认证，非 Supabase Auth |
| 存储 | Supabase Storage | TTS 音频文件（tts-audio bucket） |
| TTS | 阿里云 NLS（sitong 童声） | 107条预生成 MP3 + Edge Function 代理 |
| 离线 | localStorage 缓存 | 本地优先，异步同步到 Supabase |
| 部署 | GitHub Pages | 静态 HTML，自动部署 |

### 数据表结构

```
users ──┬── items          （打卡项目，含标签/工具绑定/步骤说明）
        ├── slots           （时段安排：上午/下午/晚上）
        ├── daily_logs      （每日完成记录）
        ├── points_state    （金币余额）
        ├── point_logs      （金币流水）
        ├── rewards         （奖励卡片模板）
        └── redeemed        （背包：已兑换卡片）
```

### 项目类型体系（v2）

```
项目类型
├── 跟练型（routine）      — 步骤引导 + 倒计时 + TTS 语音
│   └── 可选绑定工具（toolLink: metronome | numberpad）
└── 自助打卡（self）        — 步骤说明 + 道具清单 + 一键完成
    └── 可选绑定工具（toolLink: metronome | numberpad）
```

---

## 目录结构

```
/Users/zeno/Documents/Daily-Training/
├── index.html                 ← 主应用（核心代码，约4027行）
├── README.md                  ← 项目概述（本文件）
├── PLAN.md                    ← 开发规划 + 里程碑 + 待办
├── LOG.md                     ← 开发运行日志
│
├── supabase/                  ← Supabase 配置
│   ├── config.toml            ← 项目配置
│   └── functions/tts/index.ts ← Edge Function: TTS 代理
│
├── tts-batch-v2.js            ← TTS 批量生成脚本（sitong 童声）
├── tts-server.js              ← TTS 代理服务器（本地调试用）
├── tts-scripts.md             ← TTS 剧本文档（107条语音参考）
├── tts-workflow.md            ← TTS 工作流指南
│
├── p1-p2-data.js              ← 标签定义 + 新项目数据参考
├── init-supabase.sql          ← 初始建表 SQL
├── supabase-schema.sql        ← 另一个 schema 版本
├── fix-rls.sql                ← RLS 策略修复（已应用）
│
├── supabase-schema-design.md  ← 数据库设计文档（参考）
├── implement-plan.md          ← Supabase 迁移实施计划（已完成）
├── 应用功能梳理方案.md         ← 历史设计文档（归档）
└── 实施方案.md                ← 历史实施方案（归档）
```

---

## 当前版本状态

**版本：** v2.x  
**状态：** 🟢 功能完整，正常使用中  

### 已完成的核心功能

- ✅ 50个打卡项目（15原有 + 35新增）
- ✅ 多用户系统（PIN码登录，Supabase 数据同步）
- ✅ 跟练型项目（步骤引导 + 倒计时 + TTS语音）
- ✅ 自助打卡详情页（步骤说明 + 道具清单 + 完成按钮）
- ✅ 工具绑定机制（toolLink：节拍器 / 数字盘）
- ✅ 节拍器工具（Web Audio API，强弱拍，BPM预设 40-72）
- ✅ 数字盘工具（钟面布局，跨中线约束，TTS语音播报）
- ✅ 工具中心（独立使用工具，不打卡不加金币）
- ✅ 7分类标签系统 + 自建项目兜底
- ✅ 统计视图（本周各标签完成次数条形图）
- ✅ 107条 TTS 语音（sitong 童声，SSML break=1s）
- ✅ 金币/商店/背包系统
- ✅ 软删除 + 回收站
- ✅ 旧数据兼容（type==='tool' → self + toolLink）

### 待处理/暂缓

- ⏸️ 跟练页视觉填充（倒计时文字移除后画面空）
- ⏸️ 数字盘语音播报时机优化
- ⏸️ 跟练交互体验优化（M23）

---

## 运行方式

### 本地开发
```bash
# 仅需静态文件服务器
cd /Users/zeno/Documents/Daily-Training
python3 -m http.server 8080
# 访问 http://localhost:8080
```

### 部署
推送到 GitHub 仓库 `wangju8765/neuro-training` 的 main 分支 → GitHub Pages 自动部署。

### TTS 音频生成
```bash
source .env && node tts-batch-v2.js
```

---

## 环境变量

| 变量 | 用途 |
|------|------|
| `ALIYUN_TTS_KEY_ID` | 阿里云 AccessKey ID |
| `ALIYUN_TTS_KEY_SECRET` | 阿里云 AccessKey Secret |
| `ALIYUN_TTS_APPKEY` | 阿里云 NLS AppKey |

---

## 记忆要点

- 这是一个**零依赖**单页应用 — 不引入任何框架或打包工具
- 移动端优先 — 所有UI基于 375px 视口宽度设计
- 数据流：localStorage（缓存+离线）↔ Supabase（云端+跨设备）
- 用户认证不走 Supabase Auth，用自己的 PIN 码验证
- RLS 已禁用 — 因为不用 auth.uid()，安全在应用层做
- 远程仓库在 GitHub，本地可能不是 git 初始化的
