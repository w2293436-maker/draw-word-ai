// 画词AI · Draw Word - 后端服务器
// 技术栈: Node.js + Express

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { generateComic, generateAudio } = require('./services/ai');
const { logGeneration, logPageview, getKPISummary, getDailyTrend, getHourlyDistribution, getUserList, getUserSegmentation, getRetention } = require('./services/analytics');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// ============ 数据埋点中间件 ============
app.use((req, res, next) => {
  const start = Date.now();
  const originalJson = res.json.bind(res);

  // 匿名化 IP
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const ipHash = crypto.createHash('md5').update(ip).digest('hex').slice(0, 8);

  // Session ID（简单方案：IP + UserAgent hash）
  const ua = req.get('user-agent') || '';
  const sessionId = crypto.createHash('md5').update(ip + ua).digest('hex').slice(0, 12);

  // 注入响应拦截器
  res.json = function (body) {
    // 记录生成事件
    if (req.path === '/api/generate-comic' && req.method === 'POST') {
      const duration = Date.now() - start;
      logGeneration({
        lang: req.body.lang || 'en',
        style: req.body.style || 'manga',
        textLength: (req.body.text || '').length,
        sceneCount: body?.scenes?.length || 0,
        duration,
        success: !body?.error,
        error: body?.error || null,
        imageProvider: body?.imageProvider || 'none',
        sessionId,
        ipHash,
      });
    }

    return originalJson(body);
  };

  // 记录页面访问（非 API 请求）
  if (!req.path.startsWith('/api/') && req.method === 'GET') {
    logPageview({
      path: req.path,
      referrer: req.get('referrer') || '',
      sessionId,
      ipHash,
    });
  }

  next();
});

// 托管前端静态文件
app.use(express.static(path.join(__dirname, '..', 'public')));

// ============ API 路由 ============

// 生成漫画
app.post('/api/generate-comic', async (req, res) => {
  try {
    const { text, style, lang } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: '请输入短文' });
    }
    if (text.length > 5000) {
      return res.status(400).json({ error: '文本过长，请限制在5000字符以内' });
    }

    console.log(`📖 生成请求, 语言: ${lang === 'es' ? '西语' : '英语'}, 风格: ${style || '默认'}, 长度: ${text.length}`);

    const comicData = await generateComic(text, style || 'manga', lang || 'en');
    res.json(comicData);
  } catch (err) {
    console.error('生成失败:', err.message);
    if (err.message.includes('401') || err.message.includes('Unauthorized')) {
      res.status(500).json({ error: 'AI 服务认证失败，请检查 API Key' });
    } else {
      res.status(500).json({ error: `生成失败: ${err.message}` });
    }
  }
});

// TTS 语音合成（优先微软 Edge，兜底 Google）
app.post('/api/tts', async (req, res) => {
  try {
    const { text, lang } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: '请输入文本' });
    }

    const buffer = await ttsWithFallback(text, lang);

    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('TTS 失败:', err.message);
    res.status(500).json({ error: `语音合成失败` });
  }
});

async function ttsWithFallback(text, lang) {
  // 尝试微软 Edge TTS（纯正发音，需要 Python）
  try {
    const voice = lang === 'es' ? 'es-ES-AlvaroNeural' : 'en-US-JennyNeural';
    const tmpFile = require('path').join(require('os').tmpdir(), `tts_${Date.now()}.mp3`);

    const { execSync } = require('child_process');
    execSync(`python -m edge_tts --voice "${voice}" --text "${text.replace(/"/g, '\\"')}" --write-media "${tmpFile}"`, {
      timeout: 15000,
      stdio: 'pipe',
    });

    const buffer = require('fs').readFileSync(tmpFile);
    require('fs').unlinkSync(tmpFile);

    if (buffer.length > 0) {
      console.log(`TTS: Edge ${voice}`);
      return buffer;
    }
  } catch (e) {
    console.log('Edge TTS 不可用，降级到 Google');
  }

  // 兜底：Google TTS（无需额外依赖）
  const chunks = splitGoogleTTSText(text);
  const bufs = [];

  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(chunk)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    bufs.push(Buffer.from(await res.arrayBuffer()));
  }

  console.log(`TTS: Google (${lang})`);
  return Buffer.concat(bufs);
}

function splitGoogleTTSText(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > 180 && current) { chunks.push(current.trim()); current = s; }
    else { current += ' ' + s; }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text.slice(0, 180)];
}

// 文本分段
function splitText(text, maxLen) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let current = '';

  for (const s of sentences) {
    if ((current + s).length > maxLen && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += ' ' + s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text.slice(0, maxLen)];
}

// 音频（保留兼容）
app.post('/api/generate-audio', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: '请输入文本' });
    }
    const audioData = await generateAudio(text);
    res.json(audioData);
  } catch (err) {
    res.status(500).json({ error: `音频生成失败: ${err.message}` });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  const hasApiKey = !!process.env.AI_API_KEY &&
    process.env.AI_API_KEY !== 'sk-your-api-key-here';
  res.json({ status: 'running', provider: 'DeepSeek', hasApiKey, mode: hasApiKey ? '正式模式' : '演示模式' });
});

// ============ 数据看板 API ============

// KPI 汇总
app.get('/api/analytics/summary', (req, res) => {
  res.json(getKPISummary());
});

// 每日趋势
app.get('/api/analytics/daily', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  res.json(getDailyTrend(days));
});

// 小时分布
app.get('/api/analytics/hourly', (req, res) => {
  res.json(getHourlyDistribution());
});

// 用户分层
app.get('/api/analytics/users/segments', (req, res) => {
  res.json(getUserSegmentation());
});

// 用户留存
app.get('/api/analytics/users/retention', (req, res) => {
  res.json(getRetention());
});

// 用户列表（支持分页排序）
app.get('/api/analytics/users', (req, res) => {
  const sortBy = req.query.sortBy || 'totalGenerations';
  const order = req.query.order || 'desc';
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  res.json(getUserList({ sortBy, order, limit, offset }));
});

// ============ 启动 ============

app.listen(PORT, () => {
  const hasApiKey = !!process.env.AI_API_KEY &&
    process.env.AI_API_KEY !== 'sk-your-api-key-here';

  console.log('');
  console.log('🎨  画词AI · Draw Word 已启动！');
  console.log(`🌐  主页: http://localhost:${PORT}`);
  console.log(`📊  看板: http://localhost:${PORT}/dashboard.html`);
  console.log(`📋  模式: ${hasApiKey ? '正式模式 ✅' : '演示模式 🎭'}`);
  console.log('');
});
