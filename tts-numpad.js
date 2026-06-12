/**
 * TTS 脚步罗盘引导语生成 — 仅 5 条
 * 用法: source .env && node tts-numpad.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEY_ID = process.env.ALIYUN_TTS_KEY_ID;
const KEY_SECRET = process.env.ALIYUN_TTS_KEY_SECRET;
const APPKEY = process.env.ALIYUN_TTS_APPKEY;

if (!KEY_ID || !KEY_SECRET || !APPKEY) {
  console.error('请设置环境变量: source .env');
  process.exit(1);
}

const VOICE = 'sitong';
const OUTPUT_DIR = path.join(__dirname, 'tts-output-v2');
const SUPABASE_URL = 'https://pkxmsfyzcphzvuangrzs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBreG1zZnl6Y3BoenZ1YW5ncnpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDkxNzcsImV4cCI6MjA5NDYyNTE3N30.K1_niR4ZylqzbDPFnmTs5HRo2aEbObkGw3V9clM1czo';
const BUCKET = 'tts-audio';

const TTS_TEXTS = [
  { key: 'numpad-left-intro',  text: '小朋友请你准备好，现在我们用左脚单脚站，准备好了就点下一个数字' },
  { key: 'numpad-group-next',  text: '好，我们现在完成了一组，接下来下一组难度要升级了哟' },
  { key: 'numpad-left-done',   text: '左脚练习全部完成，休息一下，等下我们换右脚继续' },
  { key: 'numpad-right-intro', text: '现在换右脚单脚站，请准备好' },
  { key: 'numpad-all-done',    text: '太棒了！双脚练习全部完成！' },
];

function getIsoTimestamp() { return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); }
function hmacSha1(m, s) { return crypto.createHmac('sha1', s).update(m).digest('base64'); }

async function getToken() {
  const p = { Action:'CreateToken', Version:'2019-02-28', AccessKeyId:KEY_ID,
    Timestamp:getIsoTimestamp(), SignatureMethod:'HMAC-SHA1', SignatureVersion:'1.0',
    SignatureNonce:crypto.randomUUID() };
  const k = Object.keys(p).sort();
  const cq = k.map(x=>encodeURIComponent(x)+'='+encodeURIComponent(p[x])).join('&');
  p.Signature = hmacSha1('POST&%2F&'+encodeURIComponent(cq), KEY_SECRET+'&');
  const r = await fetch('https://nls-meta.cn-shanghai.aliyuncs.com/', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams(p).toString()
  });
  if (!r.ok) throw new Error(`Token 获取失败: ${r.status}`);
  const xml = await r.text();
  const m = xml.match(/<Id>([^<]+)<\/Id>/);
  if (!m) throw new Error(`Token 解析失败: ${xml.slice(0,200)}`);
  return m[1];
}

async function callTts(token, text) {
  const params = new URLSearchParams({
    appkey: APPKEY, token, text, voice: VOICE,
    format: 'mp3', sample_rate: '16000', volume: '50',
    speech_rate: '0', pitch_rate: '0'
  });
  const r = await fetch(`https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/tts?${params}`);
  if (!r.ok) throw new Error(`TTS 失败: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function uploadToStorage(key, buffer) {
  const filePath = `tts-${key}.mp3`;
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filePath}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'audio/mpeg',
      'x-upsert': 'true'
    },
    body: buffer
  });
  if (!r.ok && r.status !== 409) {
    const errText = await r.text();
    throw new Error(`上传失败 ${r.status}: ${errText.slice(0,100)}`);
  }
  return r.ok;
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('🔊 脚步罗盘 TTS 引导语生成');
  console.log(`📢 音色: ${VOICE}（童声女）`);
  console.log(`📝 共 ${TTS_TEXTS.length} 条语音\n`);

  const token = await getToken();
  console.log('✅ Token 获取成功\n');

  for (let i = 0; i < TTS_TEXTS.length; i++) {
    const { key, text } = TTS_TEXTS[i];
    const fileName = `tts-${key}.mp3`;
    process.stdout.write(`[${i+1}/${TTS_TEXTS.length}] ${fileName} ... `);

    try {
      const audioBuf = await callTts(token, text);
      const localPath = path.join(OUTPUT_DIR, fileName);
      fs.writeFileSync(localPath, audioBuf);
      console.log(`✅ 本地 ${(audioBuf.length/1024).toFixed(1)}KB`);

      // 上传到 Supabase
      process.stdout.write(`  上传中 ... `);
      await uploadToStorage(key, audioBuf);
      console.log(`✅ 已上传`);

      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.log(`❌ ${e.message.substring(0, 80)}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n🎉 脚步罗盘引导语全部生成完成！');
  console.log(`📁 本地目录: ${OUTPUT_DIR}`);
  console.log(`☁️  已上传到 Supabase Storage: ${BUCKET}/`);
}

main().catch(e => { console.error(e); process.exit(1); });
