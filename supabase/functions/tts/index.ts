// ===== Supabase Edge Function: TTS 代理 =====
// 接收前端请求，调用阿里云语音合成，返回音频
//
// 环境变量（在 Supabase Dashboard 设置）:
//   ALIYUN_TTS_KEY_ID
//   ALIYUN_TTS_KEY_SECRET
//
// POST /tts
//   Body: { "text": "你好", "voice": "xiaoyun" }
//   Returns: audio/mpeg 音频流

const ALIYUN_KEY_ID = Deno.env.get('ALIYUN_TTS_KEY_ID')!;
const ALIYUN_KEY_SECRET = Deno.env.get('ALIYUN_TTS_KEY_SECRET')!;

// 阿里云支持的声线
const VOICES: Record<string, string> = {
  xiaoyun:  '标准女声',
  xiaogang: '标准男声',
  xiaomei:  '甜美女声',
  xiaowei:  '活泼女声',
  sitong:   '童声（女）',
  siqi:     '童声（女）',
  aimei:    '可爱女声',
};

async function getAliyunToken(): Promise<string> {
  const params: Record<string, string> = {
    Action: 'CreateToken',
    Version: '2019-02-28',
    AccessKeyId: ALIYUN_KEY_ID,
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: crypto.randomUUID(),
  };

  // 1. 排序参数
  const keys = Object.keys(params).sort();
  const canonicalQuery = keys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');

  // 2. 构造待签字符串
  const strToSign = `POST&%2F&${encodeURIComponent(canonicalQuery)}`;

  // 3. HMAC-SHA1 签名
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`${ALIYUN_KEY_SECRET}&`),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(strToSign));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));

  // 4. 发送请求
  const reqBody = new URLSearchParams({ ...params, Signature: signature });
  const res = await fetch('https://nls-meta.cn-shanghai.aliyuncs.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: reqBody.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`阿里云 Token 获取失败: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.Token.Id;
}

serve(async (req) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('仅支持 POST', { status: 405 });
  }

  try {
    const { text, voice = 'xiaoyun', speed = 0, pitch = 0 } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: '缺少 text 参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 获取 Token
    const token = await getAliyunToken();

    // 调用阿里云 TTS
    const ttsParams = new URLSearchParams({
      token,
      text,
      voice,
      format: 'mp3',
      sample_rate: '16000',
      volume: '50',
      speech_rate: String(speed),
      pitch_rate: String(pitch),
    });

    const ttsUrl = `https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/tts?${ttsParams}`;
    const ttsRes = await fetch(ttsUrl);

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      throw new Error(`TTS 请求失败: ${ttsRes.status} ${errText}`);
    }

    // 返回音频流
    return new Response(ttsRes.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Length',
      },
    });
  } catch (e) {
    console.error('TTS error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
