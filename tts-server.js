/**
 * TTS 代理服务器 — 阿里云语音合成
 *
 * 环境变量:
 *   ALIYUN_TTS_KEY_ID     阿里云 AccessKey ID
 *   ALIYUN_TTS_KEY_SECRET 阿里云 AccessKey Secret
 *   ALIYUN_TTS_APPKEY     阿里云语音合成 AppKey
 *   PORT                  监听端口（可选，默认 3001）
 *
 * 启动:
 *   ALIYUN_TTS_KEY_ID=xxx ALIYUN_TTS_KEY_SECRET=yyy ALIYUN_TTS_APPKEY=zzz node tts-server.js
 *
 * 调用:
 *   POST /tts { "text": "你好", "voice": "xiaoyun" }
 *   返回 audio/mpeg 音频
 */

const http = require('http');
const crypto = require('crypto');

const KEY_ID = process.env.ALIYUN_TTS_KEY_ID;
const KEY_SECRET = process.env.ALIYUN_TTS_KEY_SECRET;
const APPKEY = process.env.ALIYUN_TTS_APPKEY;
const PORT = process.env.PORT || 3001;

if (!KEY_ID || !KEY_SECRET || !APPKEY) {
  console.error('请设置环境变量 ALIYUN_TTS_KEY_ID, ALIYUN_TTS_KEY_SECRET, ALIYUN_TTS_APPKEY');
  process.exit(1);
}

// 阿里云支持的声线
const VOICES = {
  xiaoyun:  '标准女声',
  xiaogang: '标准男声',
  xiaomei:  '甜美女声',
  xiaowei:  '活泼女声',
  sitong:   '童声（女）',
  siqi:     '童声（女）',
  aimei:    '可爱女声',
  aifei:    '激昂解说（男）',
};

// ------ 阿里云 Token 获取 ------

function getIsoTimestamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function hmacSha1(message, secret) {
  return crypto.createHmac('sha1', secret).update(message).digest('base64');
}

/** 从 CreateToken 的 XML 响应中提取 Token.Id */
function parseTokenId(xml) {
  const m = xml.match(/<Id>([^<]+)<\/Id>/);
  return m ? m[1] : null;
}

async function getAliyunToken() {
  const params = {
    Action: 'CreateToken',
    Version: '2019-02-28',
    AccessKeyId: KEY_ID,
    Timestamp: getIsoTimestamp(),
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: crypto.randomUUID(),
  };

  // 排序 → 构建规范查询字符串
  const keys = Object.keys(params).sort();
  const canonicalQuery = keys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');

  // 待签字符串
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
  const tokenId = parseTokenId(xml);

  if (!tokenId) {
    throw new Error(`Token 解析失败: ${xml.slice(0, 200)}`);
  }

  return tokenId;
}

// ------ HTTP 服务 ------

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || !req.url.startsWith('/tts')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }

  let body = '';
  req.on('data', chunk => (body += chunk));

  req.on('end', async () => {
    try {
      const { text, voice = 'xiaoyun' } = JSON.parse(body);

      if (!text || typeof text !== 'string' || !text.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '缺少 text' }));
        return;
      }

      console.log(`[TTS] text="${text.slice(0, 40)}..." voice=${voice}`);

      // 1. 获取 Token
      const token = await getAliyunToken();

      // 2. 调用阿里云 TTS
      const ttsParams = new URLSearchParams({
        token,
        appkey: APPKEY,
        text: text.trim(),
        voice,
        format: 'mp3',
        sample_rate: '16000',
        volume: '50',
        speech_rate: '0',
        pitch_rate: '0',
      });

      const ttsUrl = `https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/tts?${ttsParams}`;
      const ttsRes = await fetch(ttsUrl);

      if (!ttsRes.ok) {
        const errText = await ttsRes.text();
        throw new Error(`TTS 失败: ${ttsRes.status} ${errText.slice(0, 200)}`);
      }

      // 3. 流式返回音频
      const contentLength = ttsRes.headers.get('Content-Length');
      const headers = { 'Content-Type': 'audio/mpeg' };
      if (contentLength) headers['Content-Length'] = contentLength;

      res.writeHead(200, headers);

      const reader = ttsRes.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { res.end(); return; }
          res.write(Buffer.from(value));
        }
      };
      pump().catch(err => {
        console.error('流错误:', err.message);
        if (!res.writableEnded) res.end();
      });

    } catch (e) {
      console.error('[TTS Error]', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`TTS 代理服务器运行在 http://localhost:${PORT}`);
  console.log(`POST /tts { "text": "你好", "voice": "xiaoyun" }`);
});
