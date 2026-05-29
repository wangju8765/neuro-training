// P1+P2 数据定义：标签系统 + 新项目数据
// 由子 agent 读取并集成到 index.html 的 DEF_ITEMS 中

// ===== 标签定义（7个推荐标签 + 1个兜底） =====
const TAG_DEFS = [
  { emoji:'🧩', name:'原始反射整合', color:'#7c4dff' },
  { emoji:'🌀', name:'前庭-小脑训练', color:'#26c6da' },
  { emoji:'👁️', name:'视觉训练', color:'#42a5f5' },
  { emoji:'🌬️', name:'自主神经调节', color:'#ff7043' },
  { emoji:'✋', name:'精细运动', color:'#ec407a' },
  { emoji:'⚡', name:'节奏与时序', color:'#ffca28' },
  { emoji:'🧘', name:'姿势与本体感觉', color:'#66bb6a' },
];

// helper: tag string → {emoji,name,color}
function getTagInfo(tagStr) {
  if (!tagStr) return null;
  const found = TAG_DEFS.find(t => `${t.emoji}${t.name}` === tagStr);
  if (found) return found;
  return { emoji:'📋', name:'自建项目', color:'#90a4ae' };
}

// ===== 已有15个项目加 tag 字段 =====
// 这些是 DEF_ITEMS 中已有项目的 tag 映射
const EXISTING_TAGS = {
  cold:     ['🌬️自主神经调节'],
  bee:      ['🌬️自主神经调节'],
  crawl:    ['🧩原始反射整合','⚡节奏与时序'],
  starfish: ['🧩原始反射整合'],
  snow:     ['🧩原始反射整合'],
  ball:     ['🌀前庭-小脑训练'],
  spin:     ['🌀前庭-小脑训练'],
  oneLeg:   ['🌀前庭-小脑训练'],
  bounce:   ['🌀前庭-小脑训练'],
  yawn:     ['🌬️自主神经调节'],
  ear:      ['🌬️自主神经调节'],
  shake:    ['🧘姿势与本体感觉'],
  yawn2:    ['🌬️自主神经调节'],
  finger:   ['✋精细运动'],
  rubber:   ['✋精细运动'],
};

// ===== 新项目数据（36个） =====
const NEW_ITEMS = [
  // --- 跟练型新增（6个） ---
  {i:'rock1', n:'摇篮式摇摆', ic:'🛞', t:'3min', dur:3, type:'routine', pt:5, tag:['🧩原始反射整合','🌀前庭-小脑训练'],
    s:[{t:'仰卧抱膝蜷成球',h:'',d:0},{t:'慢慢前后滚动',h:'',d:20},{t:'加大幅度滚动',h:'',d:20},{t:'侧向轻轻摇摆',h:'',d:20},{t:'慢慢停下深呼吸',h:'',d:8}]},
  {i:'rock2', n:'四点跪姿摇摆', ic:'🐱', t:'3min', dur:3, type:'routine', pt:5, tag:['🧩原始反射整合','🧘姿势与本体感觉'],
    s:[{t:'手膝着地四点跪姿',h:'',d:0},{t:'慢慢前后摇摆',h:'',d:20},{t:'加大幅度前后',h:'',d:20},{t:'试试左右轻摇',h:'',d:20},{t:'慢慢坐下放松',h:'',d:8}]},
  {i:'legcurl', n:'仰卧腿弯曲伸展', ic:'🦿', t:'3min', dur:3, type:'routine', pt:5, tag:['🧩原始反射整合'],
    s:[{t:'仰卧伸直双腿',h:'',d:0},{t:'慢慢弯曲双腿',h:'',d:12},{t:'慢慢伸直双腿',h:'',d:12},{t:'重复弯曲伸展',h:'',d:30},{t:'放松深呼吸',h:'',d:8}]},
  {i:'sideneck', n:'侧躺头部转向', ic:'😴', t:'2min', dur:2, type:'routine', pt:5, tag:['🧩原始反射整合','🧘姿势与本体感觉'],
    s:[{t:'侧躺手臂放松',h:'',d:0},{t:'慢慢转头看肩',h:'',d:8},{t:'换另一侧转头',h:'',d:8},{t:'交替两侧转头',h:'',d:20},{t:'放松深呼吸',h:'',d:8}]},
  {i:'sitsway', n:'坐姿前后摆动', ic:'🪑', t:'2min', dur:2, type:'routine', pt:5, tag:['🌀前庭-小脑训练'],
    s:[{t:'坐姿伸直腿',h:'',d:0},{t:'慢慢前倾摆动',h:'',d:10},{t:'慢慢后仰摆动',h:'',d:10},{t:'交替前后摆动',h:'',d:20},{t:'停下深呼吸',h:'',d:8}]},
  {i:'highlow', n:'高低位交替', ic:'⬆️⬇️', t:'2min', dur:2, type:'routine', pt:5, tag:['🧘姿势与本体感觉','🌀前庭-小脑训练'],
    s:[{t:'站直双手上举',h:'',d:0},{t:'慢慢蹲下抱膝',h:'',d:8},{t:'站起来举手',h:'',d:8},{t:'重复交替',h:'',d:20},{t:'慢慢停下放松',h:'',d:8}]},

  // --- 跟练型：中线性训练（2个） ---
  {i:'crossknee', n:'坐姿交叉触膝', ic:'✖️', t:'2min', dur:2, type:'routine', pt:5, tag:['🧩原始反射整合','⚡节奏与时序'],
    s:[{t:'坐直双腿伸直',h:'',d:0},{t:'右手碰左膝',h:'',d:8},{t:'左手碰右膝',h:'',d:8},{t:'交替加快速度',h:'',d:20},{t:'慢慢停下放松',h:'',d:8}]},
  {i:'crosslift', n:'四点跪姿交叉抬起', ic:'🐕', t:'2min', dur:2, type:'routine', pt:5, tag:['🧩原始反射整合','🧘姿势与本体感觉'],
    s:[{t:'手膝着地',h:'',d:0},{t:'抬右手左腿保持',h:'',d:6},{t:'换左手右腿保持',h:'',d:6},{t:'交替抬起',h:'',d:20},{t:'慢慢坐下放松',h:'',d:8}]},

  // --- 工具型：节拍器（5个） ---
  {i:'metro54', n:'节拍器踏步 54BPM', ic:'🎵', t:'5min', dur:5, type:'tool', toolType:'metronome', bpm:54, pt:5, tag:['⚡节奏与时序','🌀前庭-小脑训练']},
  {i:'metro72', n:'节拍器踏步进阶', ic:'🎵', t:'5min', dur:5, type:'tool', toolType:'metronome', bpm:60, pt:5, tag:['⚡节奏与时序','🌀前庭-小脑训练']},
  {i:'metro60', n:'节拍拍手同步', ic:'👏', t:'3min', dur:3, type:'tool', toolType:'metronome', bpm:60, pt:5, tag:['⚡节奏与时序']},
  {i:'tap54', n:'手指敲击节拍', ic:'🖐️', t:'3min', dur:3, type:'tool', toolType:'metronome', bpm:54, pt:5, tag:['⚡节奏与时序','✋精细运动']},
  {i:'stepclap', n:'踏步拍手组合', ic:'🦶👏', t:'5min', dur:5, type:'tool', toolType:'metronome', bpm:54, pt:5, tag:['⚡节奏与时序']},

  // --- 工具型：数字盘（1个） ---
  {i:'npad', n:'数字盘单脚点', ic:'🔢', t:'10min', dur:10, type:'tool', toolType:'numberpad', pt:10, tag:['✋精细运动','🌀前庭-小脑训练']},

  // --- 自助打卡：视觉训练（5个） ---
  {i:'pencilpu', n:'Pencil Push-ups', ic:'✏️', t:'5min', dur:5, type:'self', pt:5, tag:['👁️视觉训练'],
    props:'铅笔一支（带字母贴纸）',
    desc:'1. 坐直，铅笔握在一臂距离，笔尖朝上\n2. 双眼聚焦笔尖上的字母\n3. 慢慢将铅笔移向鼻尖，保持字母清晰\n4. 当字母模糊或变双时停住，保持3秒\n5. 慢慢退回原位\n6. 重复10次'},
  {i:'brock', n:'Brock String', ic:'🧵', t:'5min', dur:5, type:'self', pt:5, tag:['👁️视觉训练'],
    props:'1-2米绳子 + 3颗彩色珠子',
    desc:'1. 将绳子一端固定在门把手上\n2. 另一端拉至鼻尖高度\n3. 三颗珠子分别放在30cm/60cm/90cm处\n4. 先看最近的珠子，应看到绳子呈X交叉\n5. 依次看向三颗珠子，每次都确认看到X\n6. 重复3轮'},
  {i:'nearfar', n:'远近聚焦切换', ic:'🔭', t:'3min', dur:3, type:'self', pt:5, tag:['👁️视觉训练'],
    props:'两张写字纸',
    desc:'1. 手持一张纸在阅读距离\n2. 第二张纸贴在2-3米远的墙上\n3. 先读近处文字5秒\n4. 快速切换到远处文字5秒\n5. 交替20次，保持每次清晰聚焦'},
  {i:'saccade2', n:'双目标Saccade练习', ic:'👀', t:'3min', dur:3, type:'self', pt:5, tag:['👁️视觉训练'],
    props:'两张纸各画一个圆点',
    desc:'1. 将两张纸分开60cm贴在墙上\n2. 站在1米外，头不动\n3. 快速移动目光从左到右\n4. 每次在目标停留半秒\n5. 做20次来回'},
  {i:'saccades', n:'序列Saccade练习', ic:'🔴🟢', t:'3min', dur:3, type:'self', pt:5, tag:['👁️视觉训练'],
    props:'白纸 + 彩色笔',
    desc:'1. 在白纸上画5-8个不同颜色的圆点\n2. 贴在墙上，头不动\n3. 按颜色顺序快速移动目光\n4. 每点停留半秒\n5. 正向+反向各做3轮'},

  // --- 自助打卡：ATM姿势训练（3个） ---
  {i:'atmneck', n:'ATM肩颈放松', ic:'💆', t:'5min', dur:5, type:'self', pt:5, tag:['🧘姿势与本体感觉','🌬️自主神经调节'],
    desc:'1. 仰卧，膝盖弯曲，脚平踩地上\n2. 慢慢转头向左，眼睛也看向左\n3. 感觉左肩和颈部的连接\n4. 回到中间，转到右边\n5. 交替10次，动作越慢越好\n6. 完成后平躺感受1分钟'},
  {i:'atmpelv', n:'ATM骨盆稳定', ic:'🦴', t:'5min', dur:5, type:'self', pt:5, tag:['🧘姿势与本体感觉'],
    desc:'1. 仰卧，膝盖弯曲\n2. 慢慢将骨盆前后倾斜\n3. 感觉腰椎与地面的接触变化\n4. 找到最舒适的中立位\n5. 在中立位保持呼吸5次\n6. 重复倾斜-回中5次'},
  {i:'atmthor', n:'ATM胸椎伸展', ic:'🫁', t:'5min', dur:5, type:'self', pt:5, tag:['🧘姿势与本体感觉'],
    desc:'1. 坐直，双手交叉放胸前\n2. 慢慢向右旋转上半身\n3. 头跟着身体转，眼睛看右后方\n4. 保持5秒，回到中间\n5. 换左边\n6. 交替各做5次'},

  // --- 自助打卡：感觉刺激（3个） ---
  {i:'tempalt', n:'交替温度刺激', ic:'🌡️', t:'3min', dur:3, type:'self', pt:5, tag:['🌬️自主神经调节'],
    props:'温水 + 凉水（两个盆）',
    desc:'1. 准备一盆温水和一盆凉水\n2. 双手放入温水30秒\n3. 取出擦干，放入凉水15秒\n4. 交替3轮\n5. 结束在温水中'},
  {i:'brush', n:'刷子刺激', ic:'🪥', t:'3min', dur:3, type:'self', pt:5, tag:['🌬️自主神经调节'],
    props:'软刷或粗糙毛巾',
    desc:'1. 用软刷从手掌向手臂方向轻刷\n2. 每侧手臂刷30秒\n3. 换小腿，从脚踝向膝盖方向\n4. 感觉刷过的皮肤区域\n5. 每侧重复一次'},
  {i:'vibrate', n:'震动刺激', ic:'📳', t:'3min', dur:3, type:'self', pt:5, tag:['🌬️自主神经调节'],
    props:'按摩器或震动玩具',
    desc:'1. 从手掌开始，轻震10秒\n2. 移到前臂10秒\n3. 上臂10秒\n4. 换另一只手重复\n5. 最后轻轻抖动手臂放松'},

  // --- 自助打卡：前庭-视觉整合（5个） ---
  {i:'vorhead', n:'前庭-眼球整合（头固定）', ic:'👁️‍🗨️', t:'3min', dur:3, type:'self', pt:5, tag:['👁️视觉训练','🌀前庭-小脑训练'],
    props:'移动目标（手指或笔）',
    desc:'1. 头保持不动\n2. 手指在眼前30cm处左右移动\n3. 眼睛追随手指\n4. 移动速度由慢到快\n5. 再做上下移动\n6. 每种方向做10次来回'},
  {i:'voreye', n:'VOR训练（眼固定-头动）', ic:'🧿', t:'3min', dur:3, type:'self', pt:5, tag:['👁️视觉训练','🌀前庭-小脑训练'],
    props:'墙上贴一个目标',
    desc:'1. 墙上贴一个X或字母\n2. 站在1米外，眼睛盯住目标\n3. 头慢慢左右转动，眼睛不动\n4. 保持目标始终清晰\n5. 再做上下点头\n6. 每种做20次'},
  {i:'bodyeye', n:'身体运动-眼球固定', ic:'🏃', t:'3min', dur:3, type:'self', pt:5, tag:['👁️视觉训练','🌀前庭-小脑训练'],
    props:'一个注视目标',
    desc:'1. 墙上贴目标，站2米外\n2. 眼睛盯住目标不离开\n3. 身体慢慢左右移动\n4. 保持眼睛锁定目标\n5. 再做前后移动\n6. 各做10次'},
  {i:'okn', n:'视动性眼震（OKN）训练', ic:'📊', t:'3min', dur:3, type:'self', pt:5, tag:['👁️视觉训练'],
    props:'条纹纸或OKN视频',
    desc:'1. 准备黑白条纹纸或OKN视频\n2. 手持条纹在眼前30cm\n3. 条纹从左向右慢慢移动\n4. 眼睛追随但不追出视野\n5. 换方向从右到左\n6. 每种方向做1分钟'},
  {i:'rainbow', n:'彩虹绳训练', ic:'🌈', t:'3min', dur:3, type:'self', pt:5, tag:['👁️视觉训练','✋精细运动'],
    props:'彩带或绳子',
    desc:'1. 手持彩绳两端\n2. 眼睛追踪绳子的波浪运动\n3. 改变波浪的幅度和速度\n4. 换手重复\n5. 尝试闭眼凭手感做波浪'},

  // --- 自助打卡（纯打卡型，无desc） ---
  {i:'linearacc', n:'直线加速（秋千/滑板车）', ic:'🛴', t:'10min', dur:10, type:'self', pt:10, tag:['🌀前庭-小脑训练']},
  {i:'linearosc', n:'线性振荡（毯子摇摆）', ic:'🛏️', t:'5min', dur:5, type:'self', pt:5, tag:['🌀前庭-小脑训练'], props:'毯子 + 另一人协助',
    desc:'1. 躺在毯子上\n2. 另一人轻轻摇晃毯子\n3. 左右方向，匀速轻柔\n4. 每分钟换方向\n5. 全程闭眼效果更佳'},
  {i:'outdoor', n:'户外运动', ic:'🏃', t:'20min', dur:20, type:'self', pt:20, tag:['🌀前庭-小脑训练'],
    desc:'跑步/骑车/跳绳/球类均可'},
  {i:'478breath', n:'4-7-8呼吸法', ic:'💨', t:'3min', dur:3, type:'self', pt:5, tag:['🌬️自主神经调节'],
    desc:'1. 鼻子吸气4秒\n2. 屏住呼吸7秒\n3. 嘴巴呼气8秒\n4. 重复4轮'},

  // --- 自助打卡：交叉模式墙体 ---
  {i:'wallcross', n:'交叉模式墙体', ic:'🧱', t:'3min', dur:3, type:'self', pt:5, tag:['🧩原始反射整合','⚡节奏与时序'], props:'一面墙壁',
    desc:'1. 面对墙站立，一臂距离\n2. 右手触摸左肩高度墙壁位置\n3. 左手触摸右肩高度墙壁位置\n4. 交替60秒，节奏均匀\n5. 休息30秒\n6. 再交替60秒'},
];

// ===== 定义 DEF_SLOTS 更新（增加新项目到时段） =====
// 在原 DEF_SLOTS 的基础上扩展
const NEW_SLOTS = [
  { i:'morning', ic:'☀️', n:'上午', ids:['cold','bee','crawl','starfish','oneLeg','finger','rock1','metro54','478breath'] },
  { i:'afternoon', ic:'🌤️', n:'下午', ids:['snow','ball','spin','bounce','metro72','pencilpu','brock','linearacc','outdoor'] },
  { i:'evening', ic:'🌙', n:'晚上', ids:['yawn','ear','shake','yawn2','snow','starfish','metro60','atmneck','npad','nearfar'] }
];
