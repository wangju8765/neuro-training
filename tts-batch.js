/**
 * TTS 批量生成脚本
 *
 * 一次性生成所有跟练项目的 TTS 音频，上传到 Supabase Storage。
 *
 * 用法:
 *   ALIYUN_TTS_KEY_ID=xxx ALIYUN_TTS_KEY_SECRET=*** ALIYUN_TTS_APPKEY=xxx node tts-batch.js
 *
 * 流程:
 *   1. 生成 MP3 → 保存到 ./tts-output/
 *   2. 上传到 Supabase Storage (tts-audio 存储桶)
 *   3. 打印结果汇总
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ===== 配置 =====
const KEY_ID = process.env.ALIYUN_TTS_KEY_ID;
const KEY_SECRET = process.env.ALIYUN_TTS_KEY_SECRET;
const APPKEY = process.env.ALIYUN_TTS_APPKEY;
const VOICE = 'aifei';                // 艾飞·激昂解说
const OUTPUT_DIR = path.join(__dirname, 'tts-output');
const SUPABASE_URL = 'https://pkxmsfyzcphzvuangrzs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBreG1zZnl6Y3BoenZ1YW5ncnpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDkxNzcsImV4cCI6MjA5NDYyNTE3N30.K1_niR4ZylqzbDPFnmTs5HRo2aEbObkGw3V9clM1czo';
const BUCKET = 'tts-audio';

// ===== 所有 TTS 文本 =====
// 格式: { key: '文件名(不含前缀)', text: 'TTS朗读文本' }
const TTS_TEXTS = [

  // ===== 1. 冷水唤醒 =====
  { key: 'cold-op', text: '哇！准备好感受冰冰凉凉的力量了吗？我们来做一个冷水唤醒！想象你是冰霜行者，用冷水给自己加一个防御buff！' },
  { key: 'cold-1', text: '小手捧点凉水，轻轻拍在脸颊和眼睛周围——醒醒脑！坚持一下，8、7、6、5、4、3、2、1。' },
  { key: 'cold-2', text: '再来，凉水拍拍脖子前侧，让整个身体都精神起来。6、5、4、3、2、1。' },
  { key: 'cold-3', text: '好，深吸一口气，吸满——然后慢慢地、慢慢地呼出来，像蒸汽一样。8、7、6、5、4、3、2、1。' },
  { key: 'cold-4', text: '再来一次深呼吸，吸——呼——感受凉凉的清爽。8、7、6、5、4、3、2、1。' },
  { key: 'cold-5', text: '最后一次，深吸气——然后长长的呼出……好！冰霜行者buff已激活！' },

  // ===== 2. 蜜蜂呼吸 =====
  { key: 'bee-op', text: '嘘……安静下来。我们来当一只小蜜蜂，用嗡嗡声给自己充充电。坐好了吗？开始咯。' },
  { key: 'bee-1', text: '第一步，坐直、闭眼。就像蜜蜂停在花朵上一样安静。' },
  { key: 'bee-2', text: '深吸一口气，把气吸到肚子里——4、3、2、1。' },
  { key: 'bee-3', text: '呼气，发出嗡嗡嗡的声音——像小蜜蜂扇动翅膀，让整个胸腔都跟着震动。8、7、6、5、4、3、2、1。' },
  { key: 'bee-4', text: '再来一次，吸气——把新鲜空气吸满——4、3、2、1。' },
  { key: 'bee-5', text: '嗡嗡嗡——让声音平稳又持久，像蜜蜂在花丛中飞来飞去。8、7、6、5、4、3、2、1。' },
  { key: 'bee-6', text: '最后一次深呼吸，吸——满————4、3、2、1。' },
  { key: 'bee-7', text: '嗡嗡嗡——然后……慢慢睁开眼睛。感觉怎么样？像不像充满电的小蜜蜂？10、9、8、7、6、5、4、3、2、1。' },

  // ===== 3. 交叉爬行 =====
  { key: 'crawl-op', text: '现在——左右大脑连线时间！像MC里的苦力怕一样爬行吧！准备好了吗？三、二、一——出发！' },
  { key: 'crawl-1', text: '抬起右手，同时抬起左膝盖，放下，再来一次……让左边和右边一起工作。15、14、13、12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'crawl-2', text: '换边！抬起左手，抬起右膝盖。对侧配合，像是在搭建红石电路，两边要同步。15、14、13、12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'crawl-3', text: '来，加速！左右左右——像在矿道里快速前进！15、14、13、12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'crawl-4', text: '放慢——最后5次，每个动作做到位。5……4……3……2……1！停！大脑连线完成！' },

  // ===== 4. 海星呼吸（5轮） =====
  { key: 'starfish-op', text: '躺下来吧……我们来当深海里的守卫者。你的神经系统就像守卫者，有时候会太紧张。海星呼吸就是教它：放心，这里很安全。' },
  { key: 'starfish-r1-1', text: '仰卧，手脚展开，像一只大海星漂在海底。' },
  { key: 'starfish-r1-2', text: '慢慢吸气——手臂和腿向外展开到最大，越远越好！4、3、2、1。' },
  { key: 'starfish-r1-3', text: '屏住呼吸，像飘在海底一动不动。2、1。' },
  { key: 'starfish-r1-4', text: '慢慢呼气——收回手脚，抱在胸前，腿弯回来。6、5、4、3、2、1。' },
  { key: 'starfish-r1-5', text: '放松……感受身体的节奏。3、2、1。' },
  { key: 'starfish-r2-1', text: '再来，手脚展开。' },
  { key: 'starfish-r2-2', text: '吸气——展开——4、3、2、1。' },
  { key: 'starfish-r2-3', text: '屏住。2、1。' },
  { key: 'starfish-r2-4', text: '呼气——收回——6、5、4、3、2、1。' },
  { key: 'starfish-r2-5', text: '休息。3、2、1。' },
  { key: 'starfish-r3-1', text: '展开。' },
  { key: 'starfish-r3-2', text: '吸气展开——4、3、2、1。' },
  { key: 'starfish-r3-3', text: '屏住。2、1。' },
  { key: 'starfish-r3-4', text: '呼气收回——6、5、4、3、2、1。' },
  { key: 'starfish-r3-5', text: '休息。3、2、1。' },
  { key: 'starfish-r4-1', text: '展开身体。' },
  { key: 'starfish-r4-2', text: '吸气——往外伸展——4、3、2、1。' },
  { key: 'starfish-r4-3', text: '屏住。2、1。' },
  { key: 'starfish-r4-4', text: '呼气——收回——6、5、4、3、2、1。' },
  { key: 'starfish-r4-5', text: '休息一下。3、2、1。' },
  { key: 'starfish-r5-1', text: '最后一次，手脚展开。' },
  { key: 'starfish-r5-2', text: '深吸气——展开到最大——告诉身体我在这里很安全。4、3、2、1。' },
  { key: 'starfish-r5-3', text: '屏住呼吸，感受身体的稳定。2、1。' },
  { key: 'starfish-r5-4', text: '慢慢呼气——收回——让全身彻底放松。6、5、4、3、2、1。' },
  { key: 'starfish-r5-5', text: '放松……你的神经系统收到消息了：这里很安全。守卫者模式解除！' },

  // ===== 5. 雪天使 =====
  { key: 'snow-op', text: '下雪啦！躺在雪地上画一个天使吧。想象你变成了雪傀儡，要在地上留下一对漂亮的翅膀。' },
  { key: 'snow-1', text: '仰卧躺好，手臂放在身体两侧，让后背贴紧地面。准备好了吗？' },
  { key: 'snow-2', text: '呼气——手臂沿着地面慢慢滑向头顶上方，在雪地里画出天使的翅膀！6、5、4、3、2、1。' },
  { key: 'snow-3', text: '吸气——手臂慢慢滑回来，回到身体两侧。6、5、4、3、2、1。' },
  { key: 'snow-4', text: '重复这个动作：呼——滑上去，吸——滑下来。跟着节奏，像在雪地里画画一样。24、23、22、21、20、19、18、17、16、15、14、13、12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'snow-5', text: '最后一次——手臂慢慢滑向头顶，然后轻轻放下来。6、5、4、3、2、1。雪天使完成！看看你画的翅膀，漂亮吗？' },

  // ===== 6. 球上平衡 =====
  { key: 'ball-op', text: '瑜伽球准备好了吗？我们要像史莱姆一样在球上弹跳！这需要你的全身来配合——准备好了吗？' },
  { key: 'ball-1', text: '趴在球上，手脚撑住地面。像史莱姆趴在地上一样——嗯？找到了平衡吗？' },
  { key: 'ball-2', text: '轻轻地前后滚动——感受身体在动，但保持不掉下来。看你能不能坚持住！20、19、18、17、16、15、14、13、12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'ball-3', text: '挑战升级！试着举起一只手——保持住！再换另一只手！16、15、14、13、12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'ball-4', text: '慢慢停下来，趴在球上深呼吸，让身体记住这个平衡的感觉。8、7、6、5、4、3、2、1。平衡等级提升！' },

  // ===== 7. 旋转脱敏 =====
  { key: 'spin-op', text: '想象你在下界堡垒里——周围都是危险，你需要快速转身锁定目标！旋转训练开始！' },
  { key: 'spin-1', text: '闭上眼睛，原地慢慢转3圈——像在战斗中快速转向。开始！12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'spin-2', text: '停下来！睁开眼睛，找一个固定点看着它。深呼吸，让世界慢慢稳定下来。8、7、6、5、4、3、2、1。' },
  { key: 'spin-3', text: '再来一次，闭眼——转3圈！这次更快更稳！10、9、8、7、6、5、4、3、2、1。' },
  { key: 'spin-4', text: '停——看固定点。有没有感觉这次稳多了？你的前庭系统在升级！8、7、6、5、4、3、2、1。' },
  { key: 'spin-5', text: '最后，深呼吸两次。吸——呼——再吸——呼——好了，旋转技能已解锁！' },

  // ===== 8. 单脚站 =====
  { key: 'oneLeg-op', text: '你知道火烈鸟为什么能单脚站那么久吗？因为它们的平衡感超强！我们来试试！' },
  { key: 'oneLeg-1', text: '双手叉腰，左脚抬起来——单脚站！像火烈鸟一样优雅……看看你能坚持多久。15、14、13、12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'oneLeg-2', text: '换脚——右脚抬起来。身体可能会晃，没关系，核心收紧！坚持住！15、14、13、12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'oneLeg-3', text: '难度升级！左脚抬起来，闭上眼睛——不用眼睛，你的身体还能保持平衡吗？10、9、8、7、6、5、4、3、2、1。' },
  { key: 'oneLeg-4', text: '换右脚，闭眼——终极挑战！10、9、8、7、6、5、4、3、2、1。' },
  { key: 'oneLeg-5', text: '太厉害了！抖抖腿，让肌肉放松下来。6、5、4、3、2、1。单脚站训练完成！' },

  // ===== 9. 弹跳训练 =====
  { key: 'bounce-op', text: '蹦起来！蹦起来！就像在MC里拿到跳跃药水一样！全身激活模式——启动！' },
  { key: 'bounce-1', text: '自由弹跳——想怎么跳就怎么跳！让身体热起来！20、19、18、17、16、15、14、13、12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'bounce-2', text: '跳高摸墙！每次都用尽全力往上跳，手臂往上够！像要打破天花板！20、19、18、17、16、15、14、13、12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'bounce-3', text: '边跳边拍手！跳起来的时候在头顶拍一下！看谁跳得高、拍得响！15、14、13、12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'bounce-4', text: '慢慢停下来……深呼吸……让心跳慢慢平复。8、7、6、5、4、3、2、1。跳跃训练完成！你蹦得真高！' },

  // ===== 10. 打哈欠激活 =====
  { key: 'yawn-op', text: '来做一件小事——打个哈欠！别看它简单，打哈欠能激活你的迷走神经，让大脑进入学习模式！' },
  { key: 'yawn-1', text: '用力打一个大大的哈欠！啊～～～打不出来？假装打，假哈欠很快会变成真哈欠！' },
  { key: 'yawn-2', text: '捏住鼻子，闭上嘴巴，用力呼气——但是不要让气跑出来。坚持住！8、7、6、5、4、3、2、1。' },
  { key: 'yawn-3', text: '松开！深呼吸，吸——呼——感觉氧气进来了。6、5、4、3、2、1。' },
  { key: 'yawn-4', text: '最后一次深呼吸，吸满——呼——好了，大脑已激活！可以开始学习了！' },

  // ===== 11. 耳朵拉拽 =====
  { key: 'ear-op', text: '你知道耳朵上藏着全身的穴位吗？轻轻拉一拉，就能让大脑更清醒。来试试！' },
  { key: 'ear-1', text: '用拇指和食指，从耳朵最上端开始，轻轻向下拉——沿着耳朵的外侧，一直拉到耳垂。舒服吗？8、7、6、5、4、3、2、1。' },
  { key: 'ear-2', text: '换另一只耳朵——从上到下，慢慢拉。8、7、6、5、4、3、2、1。' },
  { key: 'ear-3', text: '两只耳朵同时拉——从上到下。像给自己做一个小小的头部按摩。6、5、4、3、2、1。' },
  { key: 'ear-4', text: '最后，揉一揉耳朵，捏一捏，放松～4、3、2、1。好啦，耳朵也叫醒了！' },

  // ===== 12. 全身抖动 =====
  { key: 'shake-op', text: '站起来！想象你在游戏里被苦力怕炸了一下——抖一抖，把紧张和压力全部甩掉！' },
  { key: 'shake-1', text: '从手开始甩——甩手、甩手腕、甩手指！把紧张从指尖甩出去！8、7、6、5、4、3、2、1。' },
  { key: 'shake-2', text: '手臂一起甩起来！前后左右——像甩干机一样，把身体里的疲劳甩掉！8、7、6、5、4、3、2、1。' },
  { key: 'shake-3', text: '全身都抖起来！手、手臂、肩膀、腰、腿、脚——整个身体都在抖！像在MC里中了抖动药水！12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'shake-4', text: '慢慢停下来……深呼吸……感受一下——身体是不是轻松多了？6、5、4、3、2、1。紧张全部甩掉啦！' },

  // ===== 13. 哈欠深呼吸 =====
  { key: 'yawn2-op', text: '哈欠加吞咽加伸懒腰——这三个动作一起做，是放松身体的秘密组合技！' },
  { key: 'yawn2-1', text: '先打一个大大的哈欠——要打到你感觉下巴都酸了！6、5、4、3、2、1。' },
  { key: 'yawn2-2', text: '然后用力吞咽口水——咕嘟！感受到喉咙在动了吗？4、3、2、1。' },
  { key: 'yawn2-3', text: '伸一个大大的懒腰——手臂向上伸展，全身都拉长！想像要够到天花板！6、5、4、3、2、1。' },
  { key: 'yawn2-4', text: '再来一次——打哈欠……然后吞咽……咕嘟！6、5、4、3、2、1。' },
  { key: 'yawn2-5', text: '深呼吸——吸气——呼出——放松～好了，这个秘密组合技你学会了！以后觉得紧张的时候就做一遍！' },

  // ===== 14. 指尖对碰 =====
  { key: 'finger-op', text: '像MC里的建筑师一样，精确地控制每一根手指！指尖对碰训练——让你的手指更灵活！' },
  { key: 'finger-1', text: '右手大拇指，依次触碰食指、中指、无名指、小指——快速、准确地碰！像在键盘上敲击一样。12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'finger-2', text: '换左手——左手可能会慢一点，没关系，慢慢来，越练越快！12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'finger-3', text: '左右手同时做！看它们能不能配合好！12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'finger-4', text: '终极挑战——闭上眼睛做！不用眼睛看，你的手指还能找到彼此吗？12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'finger-5', text: '抖抖手，放松一下！4、3、2、1。手指灵活度提升！你可以去MC里建更厉害的建筑了！' },

  // ===== 15. 橡皮筋拉伸 =====
  { key: 'rubber-op', text: '拿出你的橡皮筋！这是手指的力量训练——像在MC里练精准操控，每根手指都要单独训练！' },
  { key: 'rubber-1', text: '把橡皮筋套在右手的手指指尖上——每个指尖都要套到哦。' },
  { key: 'rubber-2', text: '大拇指和食指——撑开！像在拉弓一样。12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'rubber-3', text: '大拇指和中指——撑开！12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'rubber-4', text: '大拇指和无名指——撑开！无名指是不是有点不听话？多练练就好了。12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'rubber-5', text: '大拇指和小指——撑开！最远的两根手指，加油！12、11、10、9、8、7、6、5、4、3、2、1。' },
  { key: 'rubber-6', text: '换左手——大拇指依次撑开食指、中指、无名指、小指。把右边的训练复制到左边！20、19、18、17、16、15、14、13、12、11、10、9、8、7、6、5、4、3、2、1。手指力量训练完成！' },
];

// ===== Aliyun TTS 调用 =====
function getIsoTimestamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function hmacSha1(message, secret) {
  return crypto.createHmac('sha1', secret).update(message).digest('base64');
}

async function getToken() {
  const params = {
    Action: 'CreateToken',
    Version: '2019-02-28',
    AccessKeyId: KEY_ID,
    Timestamp: getIsoTimestamp(),
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: crypto.randomUUID(),
  };

  const keys = Object.keys(params).sort();
  const canonicalQuery = keys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');

  const strToSign = `POST&%2F&${encodeURIComponent(canonicalQuery)}`;
  params.Signature = hmacSha1(strToSign, `${KEY_SECRET}&`);

  const formBody = new URLSearchParams(params).toString();
  const res = await fetch('https://nls-meta.cn-shanghai.aliyuncs.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody,
  });

  if (!res.ok) {
    throw new Error(`Token 获取失败: ${res.status}`);
  }

  const xml = await res.text();
  const m = xml.match(/<Id>([^<]+)<\/Id>/);
  if (!m) {
    throw new Error(`Token 解析失败: ${xml.slice(0, 200)}`);
  }

  return m[1];
}

async function callTts(token, text) {
  const params = new URLSearchParams({
    token,
    appkey: APPKEY,
    text: text.trim(),
    voice: VOICE,
    format: 'mp3',
    sample_rate: '16000',
    volume: '50',
    speech_rate: '0',
    pitch_rate: '0',
  });

  const ttsUrl = `https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/tts?${params}`;
  const res = await fetch(ttsUrl);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`TTS 失败: ${res.status} ${errText.slice(0, 200)}`);
  }

  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}

// ===== Supabase Storage 上传 =====
async function uploadToSupabase(key, audioBuffer) {
  const fileName = `tts-${key}.mp3`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'audio/mpeg',
    },
    body: audioBuffer,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`上传失败: ${res.status} ${errText.slice(0, 200)}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
}

// ===== 主流程 =====
async function main() {
  console.log('🔊 TTS 批量生成脚本 v1.0');
  console.log(`📢 音色: ${VOICE}（艾飞·激昂解说）`);
  console.log(`📝 共 ${TTS_TEXTS.length} 条语音\n`);

  // 创建输出目录
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 获取 Token
  console.log('🔑 获取阿里云 Token...');
  let token;
  try {
    token = await getToken();
    console.log('✅ Token 获取成功\n');
  } catch (e) {
    console.error('❌ Token 获取失败:', e.message);
    process.exit(1);
  }

  // 逐条生成
  let success = 0, fail = 0;
  for (let i = 0; i < TTS_TEXTS.length; i++) {
    const { key, text } = TTS_TEXTS[i];
    const fileName = `tts-${key}.mp3`;
    process.stdout.write(`[${i + 1}/${TTS_TEXTS.length}] ${fileName} ... `);

    try {
      const audioBuf = await callTts(token, text);

      // 保存本地
      const localPath = path.join(OUTPUT_DIR, fileName);
      fs.writeFileSync(localPath, audioBuf);

      // 上传到 Supabase
      const url = await uploadToSupabase(key, audioBuf);

      console.log(`✅ (${(audioBuf.length / 1024).toFixed(1)}KB)`);
      success++;

      // 限速 500ms
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.log(`❌ ${e.message.substring(0, 60)}`);
      fail++;
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // 汇总
  console.log('\n' + '='.repeat(50));
  console.log('📊 结果汇总');
  console.log(`  ✅ 成功: ${success}`);
  console.log(`  ❌ 失败: ${fail}`);
  console.log(`  📁 本地: ${OUTPUT_DIR}`);
  if (success > 0) {
    console.log(`  ☁️ Supabase: ${BUCKET} 存储桶`);
  }
  console.log('='.repeat(50));
}

main().catch(e => {
  console.error('❌ 脚本异常:', e.message);
  process.exit(1);
});
