/**
 * 批量上传所有音频到 Supabase Storage
 *
 * 用法:
 *   node upload-to-supabase.js
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://pkxmsfyzcphzvuangrzs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBreG1zZnl6Y3BoenZ1YW5ncnpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDkxNzcsImV4cCI6MjA5NDYyNTE3N30.K1_niR4ZylqzbDPFnmTs5HRo2aEbObkGw3V9clM1czo';
const BUCKET = 'tts-audio';
const AUDIO_DIR = path.join(__dirname, 'audio');

async function uploadFile(filePath) {
  const fileName = path.basename(filePath);
  const audioBuf = fs.readFileSync(filePath);
  
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'audio/mpeg',
    },
    body: audioBuf,
  });
  
  if (!res.ok && res.status !== 200) {
    const errText = await res.text();
    throw new Error(`${res.status}: ${errText.slice(0, 100)}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
}

async function main() {
  const files = fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith('.mp3')).sort();
  console.log(`📤 上传 ${files.length} 个文件到 Supabase Storage (${BUCKET})\n`);
  
  let success = 0, fail = 0;
  for (let i = 0; i < files.length; i++) {
    const filePath = path.join(AUDIO_DIR, files[i]);
    process.stdout.write(`[${i + 1}/${files.length}] ${files[i]} ... `);
    
    try {
      await uploadFile(filePath);
      console.log('✅');
      success++;
    } catch (e) {
      console.log(`❌ ${e.message.substring(0, 60)}`);
      fail++;
    }
    
    // 限速
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\n📊 汇总: ✅ ${success} 成功, ❌ ${fail} 失败`);
}

main().catch(e => console.error('❌', e.message));
