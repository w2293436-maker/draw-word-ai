// 画词AI · Draw Word - 后端服务器
// 🇨🇳 默认使用 DeepSeek API（国内直连，无需翻墙）
// 技术栈: Node.js + Express

const express = require('express');
const path = require('path');
const { generateComic, generateAudio } = require('./services/ai');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// 解析 JSON 请求体
app.use(express.json({ limit: '10mb' }));

// 托管前端静态文件
app.use(express.static(path.join(__dirname, '..', 'public')));

// ============ API 路由 ============

// 生成漫画
app.post('/api/generate-comic', async (req, res) => {
  try {
    const { text, style, lang } = req.body;

    // 参数校验
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: '请输入短文' });
    }
    if (text.length > 5000) {
      return res.status(400).json({ error: '文本过长，请限制在5000字符以内' });
    }

    console.log(`📖 收到生成请求, 语言: ${lang === 'es' ? '西语' : '英语'}, 风格: ${style || '默认'}, 文本长度: ${text.length}`);

    const comicData = await generateComic(text, style || 'manga', lang || 'en');
    res.json(comicData);
  } catch (err) {
    console.error('生成漫画失败:', err.message);

    // 判断是否是 API Key 问题
    if (err.message.includes('401') || err.message.includes('Unauthorized')) {
      res.status(500).json({
        error: 'AI 服务认证失败，请检查 API Key 是否正确',
        tip: '请确保 .env 文件中 AI_API_KEY 的值正确（在 platform.deepseek.com 获取）'
      });
    } else {
      res.status(500).json({ error: `生成失败: ${err.message}` });
    }
  }
});

// 生成朗读音频（后续接入）
app.post('/api/generate-audio', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: '请输入文本' });
    }

    console.log(`🔊 收到音频生成请求, 文本长度: ${text.length}`);

    const audioData = await generateAudio(text);
    res.json(audioData);
  } catch (err) {
    console.error('生成音频失败:', err.message);
    res.status(500).json({ error: `音频生成失败: ${err.message}` });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  const hasApiKey = !!process.env.AI_API_KEY &&
    process.env.AI_API_KEY !== 'sk-your-api-key-here';

  res.json({
    status: 'running',
    provider: 'DeepSeek',
    hasApiKey,
    mode: hasApiKey ? '正式模式' : '演示模式',
  });
});

// ============ 启动服务器 ============

app.listen(PORT, () => {
  const hasApiKey = !!process.env.AI_API_KEY &&
    process.env.AI_API_KEY !== 'sk-your-api-key-here';

  console.log('');
  console.log('🎨  画词AI · Draw Word 已启动！');
  console.log(`🌐  访问地址: http://localhost:${PORT}`);
  console.log(`🤖  AI 服务: DeepSeek（国内直连）`);
  console.log(`📋  运行模式: ${hasApiKey ? '正式模式 ✅' : '演示模式 🎭 (需设置 API Key)'}`);
  console.log('');
  if (!hasApiKey) {
    console.log('💡 配置 API Key 步骤:');
    console.log('   1. 访问 https://platform.deepseek.com 注册（中国手机号即可）');
    console.log('   2. 进入 API Keys 页面创建 Key');
    console.log('   3. 复制 .env.example 为 .env');
    console.log('   4. 将 Key 填入 .env 文件');
    console.log('   5. 重启服务器');
    console.log('');
  }
});
