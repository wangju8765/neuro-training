/**
 * TTS 语速参数测试脚本 — 用选定音色在不同 speech_rate 下生成倒计时
 *
 * 输出目录: ./tts-test-speed/
 * 
 * 用法:
 *   source .env && node tts-test-speed.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEY_ID = process.env.ALIYUN_TTS_KEY_ID;
const KEY_SECRET = process.env.ALIYUN_TTS_KEY_SECRET;
const APPKEY = process.env.ALIYUN_TTS_APPKEY;

if (!KEY_ID || !KEY_SECRET || !APPKEY) {
  console.error('请设置环境变量');
  process.exit(1);
}

const VOICE = 'sitong';  // 选定音色
const OUTPUT_DIR = path.join(__dirname, 'tts-test-speed');

// 试验 speech_rate 参数列表
// speech_rate: -500~500, 0=默认语速
// 先大跨度扫一遍，再精调
const RATES = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];

// 8秒倒计时文本（不含引导语）
const TEST_TEXT = '8、7、6、5、4、3、2、1。';

// 期待的纯倒计时时长（8个数，每1秒一个，间隔7秒+读数时间≈8秒）
const TARGET_DURATION = 8;

// ===== Aliyun TTS =====
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

async function callTts(token, speechRate) {
  const params = new URLSearchParams({
    token,
    appkey: APPKEY,
    text: TEST_TEXT,
    voice: VOICE,
    format: 'mp3',
    sample_rate: '16000',
    volume: '50',
    speech_rate: String(speechRate),
    pitch_rate: '0',
  });

  const ttsUrl = `https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/tts?${params}`;
  const res = await fetch(ttsUrl);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`TTS 失败 rate=${speechRate}: ${res.status} ${errText.slice(0, 200)}`);
  }
  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}

async function getDurationMp3(filePath) {
  const { execSync } = require('child_process');
  try {
    const dur = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}" 2>/dev/null`
    ).toString().trim();
    return parseFloat(dur);
  } catch {
    return null;
  }
}

// ===== 主流程 =====
async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`🔊 TTS 语速测试 — 音色: ${VOICE}`);
  console.log(`📝 文本: "${TEST_TEXT}"`);
  console.log(`🎯 目标时长: ~${TARGET_DURATION}秒\n`);

  const token = await getToken();
  console.log('✅ Token 获取成功\n');

  const results = [];

  for (let i = 0; i < RATES.length; i++) {
    const rate = RATES[i];
    const fileName = `speed-${rate}.mp3`;
    process.stdout.write(`[${i + 1}/${RATES.length}] speech_rate=${rate} ... `);

    try {
      const audioBuf = await callTts(token, rate);
      const filePath = path.join(OUTPUT_DIR, fileName);
      fs.writeFileSync(filePath, audioBuf);

      const duration = await getDurationMp3(filePath);
      const diff = duration ? (duration - TARGET_DURATION).toFixed(1) : '?';
      results.push({ rate, duration, filePath });

      console.log(`${duration ? duration.toFixed(1) + 's' : '?'} (偏差: ${diff}s)`);
    } catch (e) {
      console.log(`❌ ${e.message.substring(0, 50)}`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  // 结果排序
  console.log('\n📊 结果汇总（按偏差从小到大）:');
  console.log(`    ${'速率'.padEnd(12)} ${'时长'.padEnd(10)} ${'偏差'.padEnd(10)}`);
  console.log('    ' + '-'.repeat(35));

  const sorted = results
    .filter(r => r.duration !== null)
    .sort((a, b) => Math.abs(a.duration - TARGET_DURATION) - Math.abs(b.duration - TARGET_DURATION));

  for (const r of sorted) {
    const diff = (r.duration - TARGET_DURATION).toFixed(1);
    const marker = Math.abs(r.duration - TARGET_DURATION) < 0.5 ? ' ⭐' : '';
    console.log(`    ${String(r.rate).padEnd(12)} ${r.duration.toFixed(1)}s${' '.repeat(7)} ${diff}s${marker}`);
  }

  console.log('\n🏆 最接近的语速参数:', sorted.length > 0 ? `speech_rate=${sorted[0].rate}` : '?');
}

main().catch(e => {
  console.error('❌ 脚本异常:', e.message);
  process.exit(1);
});
