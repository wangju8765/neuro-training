/**
 * TTS 音色测试脚本 — 生成 10 个音色的同一段语音
 *
 * 用法:
 *   ALIYUN_TTS_KEY_ID=xxx ALIYUN_TTS_KEY_SECRET=*** ALIYUN_TTS_APPKEY=xxx node tts-test-voices.js
 *
 * 输出目录: ./tts-test-voices/
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEY_ID = process.env.ALIYUN_TTS_KEY_ID;
const KEY_SECRET = process.env.ALIYUN_TTS_KEY_SECRET;
const APPKEY = process.env.ALIYUN_TTS_APPKEY;

if (!KEY_ID || !KEY_SECRET || !APPKEY) {
  console.error('请设置环境变量 ALIYUN_TTS_KEY_ID, ALIYUN_TTS_KEY_SECRET, ALIYUN_TTS_APPKEY');
  process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, 'tts-test-voices');

// 测试文本：含引导语 + 8 秒倒计时数字
const TEST_TEXT = '好，深吸一口气，吸满——然后慢慢地、慢慢地呼出来，像蒸汽一样。8、7、6、5、4、3、2、1。';

// 要测试的音色
const VOICES = [
  { id: 'aifei',   desc: '激昂解说男声' },
  { id: 'xiaogang',desc: '标准男声' },
  { id: 'xiaoyun', desc: '标准女声' },
  { id: 'xiaomei', desc: '甜美女声' },
  { id: 'xiaowei', desc: '活泼女声' },
  { id: 'sitong',  desc: '童声女' },
  { id: 'siqi',    desc: '童声女' },
  { id: 'aimei',   desc: '可爱女声' },
  { id: 'aishuo',  desc: '标准男声2' },
  { id: 'ainiu',   desc: '东北女声' },
];

// ===== Aliyun TTS Token =====
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

  if (!res.ok) throw new Error(`Token 获取失败: ${res.status}`);
  const xml = await res.text();
  const m = xml.match(/<Id>([^<]+)<\/Id>/);
  if (!m) throw new Error(`Token 解析失败: ${xml.slice(0, 200)}`);
  return m[1];
}

async function callTts(token, voiceId, text) {
  const params = new URLSearchParams({
    token,
    appkey: APPKEY,
    text: text.trim(),
    voice: voiceId,
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

// ===== 主流程 =====
async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('🔊 TTS 音色测试脚本\n');
  console.log(`📝 测试文本: "${TEST_TEXT}"\n`);

  const token = await getToken();
  console.log('✅ Token 获取成功\n');

  for (let i = 0; i < VOICES.length; i++) {
    const { id, desc } = VOICES[i];
    const fileName = `test-${id}.mp3`;
    process.stdout.write(`[${i + 1}/${VOICES.length}] ${id} (${desc}) ... `);

    try {
      const audioBuf = await callTts(token, id, TEST_TEXT);
      fs.writeFileSync(path.join(OUTPUT_DIR, fileName), audioBuf);
      console.log(`✅ ${(audioBuf.length / 1024).toFixed(0)}KB`);
    } catch (e) {
      console.log(`❌ ${e.message.substring(0, 50)}`);
    }

    // 限速 500ms
    await new Promise(r => setTimeout(r, 500));
  }

  // 打印时长
  console.log('\n📊 音频时长汇总（秒）:');
  for (const { id, desc } of VOICES) {
    const filePath = path.join(OUTPUT_DIR, `test-${id}.mp3`);
    if (fs.existsSync(filePath)) {
      try {
        const { execSync } = require('child_process');
        const dur = execSync(
          `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}" 2>/dev/null`
        ).toString().trim();
        console.log(`  ${id} (${desc}): ${parseFloat(dur).toFixed(1)}s`);
      } catch {
        console.log(`  ${id} (${desc}): 无法获取时长`);
      }
    }
  }

  console.log(`\n📁 输出: ${OUTPUT_DIR}/`);
}

main().catch(e => {
  console.error('❌ 脚本异常:', e.message);
  process.exit(1);
});
