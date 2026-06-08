// 画词AI - AI 服务层
// 🇨🇳 DeepSeek 文本分析 + 通义万相 图片生成 + 内容安全审核

const OpenAI = require('openai');

// ============ 配置 ============
function getClient() {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey || apiKey === 'sk-your-api-key-here') return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_BASE_URL || 'https://api.deepseek.com',
  });
}

function getModel() {
  return process.env.AI_MODEL || 'deepseek-chat';
}

function getImageApiKey() {
  const key = process.env.IMAGE_API_KEY;
  if (!key || key === 'your-bailian-key-here') return null;
  return key;
}

// ====================================================================
// 内容安全审核
// ====================================================================
// 敏感词列表（中英文全覆盖）
// 色情 + 性暗示 + 低俗
const BLOCKED_SEXUAL = [
  // ---- 英文：直接色情 ----
  'sex', 'porn', 'xxx', 'nsfw', 'hentai', 'ero', 'slut', 'whore', 'dick', 'cock',
  'pussy', 'clit', 'penis', 'vagina', 'masturbat', 'orgasm', 'cum', 'anal',
  'fuck', 'blowjob', 'handjob', 'milf', 'bdsm', 'incest', 'rape', 'molest',
  // ---- 英文：性暗示 ----
  'no bra', 'braless', 'underwear', 'panties', 'lingerie', 'cleavage',
  'see through', 'wet t-shirt', 'wet clothes', 'wet shirt',
  'sweat soaked', 'sweaty skin', 'glistening skin',
  'revealing outfit', 'revealing clothes', 'exposed skin', 'exposed body',
  'strip', 'undress', 'undressing', 'topless', 'bottomless',
  'intimate touch', 'caress', 'fondle', 'making out',
  'sexy body', 'hot body', 'perfect figure', 'curvy body',
  'skimpy', 'tight dress', 'miniskirt', 'short skirt',
  'chest', 'breast', 'boob', 'nipple', 'butt', 'thigh gap',
  'bedroom eyes', 'suggestive', 'seductive', 'lewd', 'obscene',
  'moan', 'groan',
  // ---- 中文：直接色情 ----
  '色情', '黄色', '成人', '裸体', '裸照', '裸聊', '约炮', '一夜情',
  '做爱', '性交', '口交', '肛交', '自慰', '手淫', '高潮', '射精',
  '卖淫', '嫖娼', '强奸', '猥亵', '乱伦', '淫秽', '淫荡', '下流',
  // ---- 中文：性暗示 ----
  '不穿内衣', '没穿内衣', '真空', '凸点', '激凸',
  '透视装', '若隐若现', '若影若现', '朦胧美体',
  '湿透', '湿身', '汗水浸透', '汗湿', '浸湿衣衫',
  '看到里面', '里面的皮肤', '衣服贴身', '贴身勾勒',
  '露出', '裸露', '暴露', '走光', '春光', '春色',
  '性感', '诱惑', '撩人', '挑逗', '暧昧', '色诱', '勾引',
  '胴体', '玉体', '曲线毕露', '曼妙身材', '火辣身材',
  '胸部', '乳房', '乳沟', '双峰', '酥胸', '乳头', '乳晕',
  '大腿', '大腿根', '臀部', '翘臀', '美臀', '屁股',
  '脱衣', '脱光', '脱掉', '更衣', '换衣服',
  '洗澡', '沐浴', '淋浴', '出浴', '浴巾',
  '呻吟', '娇喘', '喘息', '娇吟',
  '蕾丝', '丝袜', '吊带袜', '肚兜', '抹胸',
  '内衣', '内裤', '底裤', '胸罩', '文胸', '丁字裤',
  '抚摸', '爱抚', '轻抚身体', '摩挲',
  '紧身裙', '包臀裙', '超短裙', '低胸装',
  '偷窥', '偷看', '偷拍', '窥视',
  '床戏', '床上的', '被窝', '同床',
  '意淫', '幻想身体',
];

// 暴力血腥
const BLOCKED_VIOLENCE = [
  'gore', 'blood', 'bloody', 'murder', 'kill', 'torture',
  'decapitat', 'dismember', 'mutilat', 'slaughter', 'massacre',
  'cannibal', 'corpse', 'dead body',
  '杀人', '血腥', '恐怖', '虐待', '肢解', '斩首', '分尸',
  '屠杀', '碎尸', '虐杀', '残杀', '暴尸', '尸体',
  '折磨致死', '酷刑', '凌迟',
];

// 其他违规
const BLOCKED_OTHER = [
  'drug', 'cocaine', 'heroin', 'meth', 'opium',
  'suicide', 'terrorist',
  '毒品', '吸毒', '海洛因', '冰毒', '大麻', '可卡因',
  '自杀', '自残', '割腕', '跳楼',
  '炸弹', '爆炸', '恐怖分子', '恐怖袭击',
];

// 西班牙语敏感词
const BLOCKED_ES = [
  // 色情/性暗示
  'sexo', 'porno', 'xxx', 'desnudo', 'desnuda', 'erotico', 'erotica',
  'sosten', 'sin sujetador', 'sin bra', 'bragas', 'ropa interior', 'lenceria',
  'transparente', 'transparencia', 'mojada', 'mojado', 'sudor', 'empapada',
  'escote', 'pecho', 'pechos', 'pezones', 'tetas', 'culo', 'nalgas', 'muslo',
  'cintura', 'desvestir', 'desnudar', 'quitar ropa', 'falda corta', 'minifalda',
  'apretado', 'ajustado', 'insinuante', 'sensual', 'seductor', 'obsceno',
  'gemido', 'gemir', 'jadeo', 'acariciar', 'tocar cuerpo', 'caricias',
  'intimo', 'intima', 'hacer el amor', 'masturbar', 'orgasmo', 'violar',
  'incesto', 'prostituta', 'prostituto',
  // 暴力
  'sangre', 'sangriento', 'asesinar', 'asesinato', 'matar', 'tortura',
  'decapitar', 'desmembrar', 'mutilacion', 'masacre', 'cadaver',
  'horror', 'gore', 'cruento', 'destazar',
  // 其他
  'droga', 'cocaina', 'heroina', 'suicidio', 'terrorista', 'bomba',
];

// 合并所有敏感词
const BLOCKED_PATTERNS = [...BLOCKED_SEXUAL, ...BLOCKED_VIOLENCE, ...BLOCKED_OTHER, ...BLOCKED_ES];

function contentReview(text) {
  const lower = text.toLowerCase();

  // 关键词拦截（英文用单词边界，中文直接匹配）
  for (const word of BLOCKED_PATTERNS) {
    // 中文或含空格词组，直接匹配
    if (/[一-鿿]/.test(word) || word.includes(' ')) {
      if (lower.includes(word)) {
        return { passed: false, reason: `内容包含不当词汇，请修改后重试` };
      }
    } else {
      // 英文单字用边界匹配，避免 butterfly 误杀 butt
      const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
      if (regex.test(lower)) {
        return { passed: false, reason: `内容包含不当词汇，请修改后重试` };
      }
    }
  }

  // 长度/格式检查
  if (!text || text.trim().length < 10) {
    return { passed: false, reason: '文章太短，至少输入10个字符' };
  }
  if (text.length > 5000) {
    return { passed: false, reason: '文章过长，请限制在5000字符以内' };
  }

  return { passed: true };
}

// 正则转义
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function deepContentReview(text, client, model) {
  try {
    const resp = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `你是一个严格的内容安全审核员。判断以下文本是否包含以下任何一种情况：
1. 色情、性暗示、低俗内容（包括隐晦的性描写、身体部位挑逗、暧昧场景、不恰当的身体接触、透视/湿身等）
2. 暴力、血腥、恐怖描写
3. 违法或政治敏感内容
4. 任何不适合青少年学习外语的内容（无论英语还是西班牙语）

注意：正常的童话故事、校园生活、日常对话不属于违规。
但要拦截：任何带有性暗示的描写、过度关注身体的描述、打擦边球的暧昧场景。
支持检测英语、西班牙语、中文文本。

只回复JSON：{"safe": true/false, "reason": "如果safe为false，用中文说明原因"}`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0,
      max_tokens: 200,
    });

    const raw = resp.choices[0].message.content.trim();
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    const result = JSON.parse(jsonStr);
    return result;
  } catch (e) {
    console.warn('深度审核失败，默认拦截以保证安全:', e.message);
    return { safe: false, reason: '审核服务异常，请稍后重试' };
  }
}

// ====================================================================
// 漫画风格配置（用具体动漫大师名锁定画风）
// ====================================================================
const STYLE_CONFIG = {
  manga: {
    name: '日式漫画',
    styleCore: 'hand-drawn black and white manga comic illustration, bold ink brush strokes, screentone dot shading patterns, cross-hatching shadows, dynamic action speed lines, dramatic panel composition, Japanese comic book panel art style, cel-shaded 2D flat illustration, pure monochrome grayscale only, pen and ink drawing technique.',
    negative: 'NO photorealistic, NO 3D render, NO photograph, NO CGI, NO oil painting, NO watercolor, NO realistic human face, NO color, NO gradient, grayscale monochrome only.',
    colors: { bg: '#FAFAFA', border: '#1A1A1A', accent: '#E60012', text: '#1A1A1A', panel: '#FFFFFF' },
  },
  illustration: {
    name: '现代插画',
    styleCore: '2D cel-shaded animation key visual illustration, vibrant atmospheric lighting with soft gradient sky backgrounds, clean line art, highly detailed environmental backgrounds, cinematic anime movie frame quality, flat 2D digital illustration, colorful and bright with warm sunlight glow.',
    negative: 'NO photorealistic, NO 3D render, NO photograph, NO CGI, NO oil painting, NO realistic human face, NO black and white, NO grayscale.',
    colors: { bg: '#F0F4FF', border: '#4A6FA5', accent: '#FF6B6B', text: '#2D3436', panel: '#FFFFFF' },
  },
  children: {
    name: '绘本风格',
    styleCore: 'hand-painted watercolor childrens book illustration, soft pastel color palette, cute round chibi character proportions, gentle warm lighting, traditional 2D cel animation style, soft rounded shapes and edges, cozy and gentle atmosphere with hand-drawn textures, minimal line art, dreamy art style.',
    negative: 'NO photorealistic, NO 3D render, NO photograph, NO CGI, NO oil painting, NO realistic human face, NO black and white, NO dark colors, NO sharp edges.',
    colors: { bg: '#FFF8F0', border: '#E8A87C', accent: '#F4845F', text: '#5D4037', panel: '#FFFDF9' },
  },
};

// ====================================================================
// 核心：生成漫画
// ====================================================================
async function generateComic(text, style = 'manga', lang = 'en') {
  const client = getClient();
  const styleConfig = STYLE_CONFIG[style] || STYLE_CONFIG.manga;

  const langLabel = lang === 'es' ? '西班牙语' : '英语';
  const langName = lang === 'es' ? 'español' : 'English';

  // ====== 内容审核 ======
  const basicCheck = contentReview(text);
  if (!basicCheck.passed) {
    throw new Error(basicCheck.reason);
  }

  if (!client) {
    console.log('🎭 演示模式');
    return generateDemoComic(text, style);
  }

  const model = getModel();

  // 深度AI审核
  console.log('🛡️  内容安全审核...');
  const deepCheck = await deepContentReview(text, client, model);
  if (!deepCheck.safe) {
    throw new Error(`内容未通过安全审核：${deepCheck.reason}`);
  }
  console.log('  ✅ 审核通过');

  // ====== 第1步：提取角色设定（含服装+场景+配色）======
  console.log('👤 提取角色设定...');
  const charPrompt = `分析以下${langLabel}短文，提取一份"视觉圣经"，确保所有漫画分镜的服装和场景统一。

返回纯JSON，每项都必须极其具体：
{
  "characters": "一段英文描述（80-120词），包含每个角色的：【外貌】精确到发色发型脸型眼睛颜色身高体型 | 【服装】从头到脚每件衣物的颜色、款式、材质，例如'白色短袖衬衫+藏蓝色领口、藏蓝色短裤、白色短袜、黑色学生皮鞋'而不是'穿校服' | 【标志特征】眼镜/雀斑/发夹等独特标记",
  "settingPalette": "整个故事的场景色调和风格（30词），例如'暖黄色调的卧室+浅蓝天空的街道+明亮白墙的教室，整体温暖柔和'",
  "visualStyle": "${styleConfig.styleCore}"
}

${langLabel}短文：
${text}`;

  const charResponse = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: '专业角色设计师。返回纯JSON。角色描述必须详细具体，确保每次画出来是同一个人。' },
      { role: 'user', content: charPrompt },
    ],
    temperature: 0.5,
    max_tokens: 600,
  });

  let characterBible = { characters: '', settingPalette: '', visualStyle: styleConfig.styleCore };
  try {
    const raw = charResponse.choices[0].message.content.trim();
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    characterBible = JSON.parse(jsonStr);
    console.log('  ✅ 角色设定完成（含服装+场景配色）');
  } catch (e) {
    console.warn('  ⚠️ 角色设定解析失败，使用默认');
    characterBible.characters = 'consistent cartoon character design, same outfit in all panels';
    characterBible.settingPalette = 'consistent warm lighting and color palette throughout all scenes';
  }

  // 生成固定seed（同一故事用同一个随机种子，确保画风统一）
  const storySeed = simpleHash(text);

  // ====== 第2步：拆分漫画分镜（强制镜头多样性）======
  console.log('📋 拆分分镜...');
  const scenePrompt = `你是电影级漫画分镜师和${langLabel}教师。将以下${langLabel}短文拆分为3-6个漫画分镜，每个分镜必须像一个完整故事的不同画面。

【🔥 镜头多样性 - 最重要】每个分镜必须有完全不同的构图，这是漫画不是证件照！

分镜1：全景/远景(wide shot) - 交代环境和氛围，角色在场景中很小
分镜2：中景(medium shot) - 展示角色动作，看到腰部以上
分镜3：特写(close-up) - 聚焦面部表情、手部动作或关键物品
分镜4（如有）：俯拍/仰拍/过肩镜头 - 特殊视角增加戏剧感
分镜5（如有）：动作镜头(action shot) - 动态姿势，速度线
分镜6（如有）：收尾全景 - 情绪落点

规则：
- ❌ 禁止：每张图都是两个人站在一起像合照
- ❌ 禁止：重复使用相同的构图和镜头距离
- ✅ 必须：每张图的镜头距离、角度、构图完全不同
- ✅ 必须：某几张图只聚焦一个人（看到另一个人=扣分）
- ✅ 必须：画面里的人是"正在做某件事"的瞬间，不是摆拍

【🔥 服装+场景一致性 - 极其重要】
- 所有分镜中角色穿完全相同的衣服！不能换衣服换鞋子换发型！
- 场景色调必须统一遵循这个基调：
  ${characterBible.settingPalette || '整体色调统一，场景风格一致'}
- 光线和色调在不同分镜间保持协调

【角色设定 - 每个imagePrompt开头完整复制】
${characterBible.characters}

【画风】
${styleConfig.styleCore}
${styleConfig.negative}

每个分镜JSON：
- "originalSentence": ${langLabel}原句
- "chineseTranslation": 中文翻译
- "shotType": 镜头类型（wide/medium/close-up/action/POV）
- "sceneDescription": 【🔥最关键】极其具体的画面动作描述（中文80-120字），必须包含：
  · 每个角色的精确肢体动作（手臂怎么摆、腿怎么站、身体角度）
  · 面部表情细节（眉毛、嘴角、眼神方向）
  · 角色在画面中的位置和大小关系
  · 背景环境的具体物品和颜色
  · 光线方向和氛围
  例如不写"他在跑"而写"上半身前倾45度，右腿在前膝盖弯曲90度，左腿蹬地向后伸直，双臂交替摆动，头发被风吹起，额头有汗珠"
- "imagePrompt": 英文生图prompt（100-150词）。结构：
  开头=角色设定 + 本格镜头类型和构图
  中间=sceneDescription的对应英文版，极度具体
  结尾=画风要求+禁止项。纯画面，无文字无对话
- "vocabulary": 2-4个${langLabel}重点单词 [{word, meaning, example}]
- "grammarNote": 1个语法知识点（中文）

返回JSON数组，不包裹markdown。

${langLabel}短文：
${text}`;

  const sceneResponse = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: `你是电影级漫画分镜师。sceneDescription必须极度具体——精确描述每个角色的肢体姿势、面部表情、环境细节。像给动画师写关键帧指示一样。不出现"他在跑"这种笼统描述，必须写成"上身45度前倾，右腿弯曲90度蹬地，左腿后伸"这种程度。originalSentence填入${langLabel}原文。` },
      { role: 'user', content: scenePrompt },
    ],
    temperature: 0.7,
    max_tokens: 5000,
  });

  let scenes;
  try {
    const raw = sceneResponse.choices[0].message.content.trim();
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    scenes = JSON.parse(jsonStr);
  } catch (e) {
    console.error('分镜JSON解析失败:', e.message);
    throw new Error('AI 返回的分镜数据格式异常，请重试');
  }

  console.log(`  ✅ ${scenes.length} 个分镜，开始生成插图...`);

  // ====== 第3步：逐个生成图片（极致具体的动作描述）======
  const imageApiKey = getImageApiKey();
  for (let i = 0; i < scenes.length; i++) {
    console.log(`  🎨 第 ${i + 1}/${scenes.length} 幅...`);

    // 构建高度具体的单图 prompt
    const imgPrompt = `SINGLE comic panel illustration.
Character: ${characterBible.characters}
Action: ${scenes[i].sceneDescription || ''}
Style: ${styleConfig.styleCore}
${styleConfig.negative}
The character's pose, action, and expression must exactly match the described action above.`;

    scenes[i].isComicPage = false;

    if (imageApiKey) {
      scenes[i].imageUrl = await generateWithWanxiang(imgPrompt, imageApiKey, storySeed + i);
    } else {
      scenes[i].imageUrl = await generateWithPollinations(imgPrompt);
    }

    if (!scenes[i].imageUrl) {
      scenes[i].imageUrl = generateFallbackImage(scenes[i].sceneDescription || '', style);
    }
  }

  // ====== 第4步：语法 + 标题 ======
  console.log('📝 整理语法...');
  const [grammarSummary, title] = await Promise.all([
    generateGrammarSummary(client, model, text, lang),
    generateTitle(client, model, text, lang),
  ]);

  return {
    title,
    scenes,
    grammarSummary,
    style,
    fullText: text,
    imageProvider: imageApiKey ? '通义万相' : 'Pollinations(免费)',
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================
// 通义万相（异步模式）
// ============================================================
async function generateWithWanxiang(prompt, apiKey, seed = 0, size = '1024*768') {
  try {
    const body = {
      model: 'wanx2.1-t2i-turbo',
      input: {
        prompt,
        negative_prompt: 'realistic, photorealistic, 3d render, photograph, realistic human face, lifelike portrait, CGI, oil painting, horror, gore, blood, violence, nudity, sexual content, different outfit, outfit change, inconsistent style, style change',
      },
      parameters: {
        size: size,
        n: 1,
        seed: seed,
      },
    };

    // 提交异步任务
    const submitRes = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    const submitData = await submitRes.json();
    const taskId = submitData.output?.task_id;

    if (!taskId) {
      console.error(`    ❌ 提交失败: ${submitData.code} - ${submitData.message}`);
      return null;
    }

    console.log(`    📤 ${taskId.slice(0, 8)}... 等待中...`);

    // 轮询结果
    for (let attempt = 0; attempt < 20; attempt++) {
      await sleep(1500);

      const pollRes = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });

      const pollData = await pollRes.json();
      const status = pollData.output?.task_status;

      if (status === 'SUCCEEDED') {
        const imageUrl = pollData.output?.results?.[0]?.url;
        if (imageUrl) {
          // 检查图片是否因内容违规被拦截
          if (pollData.output?.results?.[0]?.review_status === 'rejected') {
            console.error(`    ❌ 图片内容违规被拦截`);
            return null;
          }
          console.log(`    ✅ 完成`);
          return imageUrl;
        }
        return null;
      }

      if (status === 'FAILED') {
        console.error(`    ❌ 失败: ${pollData.output?.message || '未知'}`);
        return null;
      }
    }

    console.error(`    ❌ 超时`);
    return null;
  } catch (e) {
    console.error(`    ❌ 异常: ${e.message}`);
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 简单哈希函数（用于生成固定seed）
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转为32位整数
  }
  return Math.abs(hash) % 2147483647;
}

// ============================================================
// Pollinations.ai 免费备用
// ============================================================
async function generateWithPollinations(prompt) {
  try {
    const encoded = encodeURIComponent(prompt.slice(0, 400));
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=768&nologo=true`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (res.ok && (res.headers.get('content-type') || '').includes('image')) {
      console.log('    ✅ 免费图床');
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// 备用占位图
// ============================================================
function generateFallbackImage(description, style) {
  const config = STYLE_CONFIG[style] || STYLE_CONFIG.manga;
  const c = config.colors;
  const snippet = (description || '').slice(0, 80);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768" viewBox="0 0 1024 768">
  <rect width="1024" height="768" fill="${c.bg}" rx="16"/>
  <rect x="40" y="40" width="944" height="688" fill="${c.panel}" rx="12" stroke="${c.border}" stroke-width="3"/>
  <rect x="80" y="180" width="864" height="340" fill="${c.bg}" rx="12" stroke="${c.border}" stroke-width="1" stroke-dasharray="8,4" opacity="0.5"/>
  <text x="512" y="340" text-anchor="middle" font-size="72" opacity="0.25">🎨</text>
  <text x="512" y="400" text-anchor="middle" font-size="20" fill="${c.text}" opacity="0.6" font-family="sans-serif">漫画生成中…</text>
  <text x="512" y="440" text-anchor="middle" font-size="14" fill="${c.text}" opacity="0.4" font-family="sans-serif">${escapeXml(snippet)}</text>
  <rect x="80" y="600" width="864" height="2" fill="${c.accent}" opacity="0.3" rx="1"/>
  <text x="512" y="650" text-anchor="middle" font-size="16" fill="${c.accent}" font-family="sans-serif">⏳ 请稍候或刷新重试</text>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function escapeXml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============ 语法总结 ============
async function generateGrammarSummary(client, model, text, lang = 'en') {
  try {
    const langLabel = lang === 'es' ? '西班牙语' : '英语';
    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: `用中文总结${langLabel}核心语法点（3-5条）。返回JSON数组：[{"title":"语法名","explanation":"解释","example":"原句"}]` },
        { role: 'user', content: text },
      ],
      temperature: 0.5, max_tokens: 1500,
    });
    return JSON.parse(resp.choices[0].message.content.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/i, ''));
  } catch { return []; }
}

// ============ 标题 ============
async function generateTitle(client, model, text, lang = 'en') {
  try {
    const resp = await client.chat.completions.create({
      model,
      messages: [{ role: 'system', content: '给这篇短文起一个简短漫画标题（5-10个汉字），只返回标题文本' }, { role: 'user', content: text }],
      max_tokens: 50, temperature: 0.8,
    });
    return resp.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
  } catch { return lang === 'es' ? '漫画西语' : '英语漫画'; }
}

// ============ 音频（待接入）============
async function generateAudio(text) {
  return { audioBase64: null, ttsNotAvailable: true, tip: '语音朗读即将上线' };
}

// ============ 演示模式 ============
function generateDemoComic(text, style) {
  const config = STYLE_CONFIG[style] || STYLE_CONFIG.manga;
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
  const demoScenes = (sentences.length >= 2 ? sentences : text.split(/,/).filter(s => s.trim().length > 3))
    .slice(0, 6)
    .map((sentence, i) => ({
      englishSentence: sentence + '.',
      chineseTranslation: '（演示模式 — 配置API Key后自动翻译）',
      sceneDescription: `场景${i + 1}`,
      imagePrompt: `${config.styleCore} ${sentence}`,
      imageUrl: generateFallbackImage(sentence, style),
      vocabulary: [{ word: 'example', meaning: '例子', example: 'This is an example.' }],
      grammarNote: '（演示）',
    }));

  return {
    title: `📖 ${text.slice(0, 15)}...（演示）`,
    scenes: demoScenes,
    grammarSummary: [{ title: '演示模式', explanation: '配置API Key后自动解析', example: '' }],
    style, fullText: text, demoMode: true,
    imageProvider: '占位图',
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { generateComic, generateAudio };
