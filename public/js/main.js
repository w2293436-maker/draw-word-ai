/* ============================================
   画词AI · Draw Word — 前端交互逻辑
   功能：输入文本 → 生成漫画 → 词汇/语法/朗读
   ============================================ */

// ---- DOM 引用 ----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const textInput = $('#textInput');
const charCount = $('#charCount');
const btnGenerate = $('#btnGenerate');
const inputSection = $('#inputSection');
const loadingSection = $('#loadingSection');
const resultSection = $('#resultSection');
const errorSection = $('#errorSection');
const loadingText = $('#loadingText');
const comicTitle = $('#comicTitle');
const comicStrip = $('#comicStrip');
const vocabGrid = $('#vocabGrid');
const grammarModal = $('#grammarModal');
const grammarContent = $('#grammarContent');
const audioPlayer = $('#audioPlayer');
const errorMessage = $('#errorMessage');
const modeBadge = $('#modeBadge');
const tipText = $('#tipText');

// ---- 状态 ----
let currentData = null;       // 存储当前漫画数据
let currentStyle = 'manga';   // 当前风格
let currentLang = 'en';       // 当前语言

// ---- 初始化 ----
// 移动端音频预解锁（解决异步fetch后play()被拦截的问题）
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  // 方案1：AudioContext 解锁
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    // 创建静默buffer并播放，完成解锁
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch (e) { /* ignore */ }

  // 方案2：HTML5 Audio 预解锁
  audioPlayer.volume = 0;
  audioPlayer.play().then(() => {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    audioPlayer.volume = 1;
  }).catch(() => {});

  // 方案3：浏览器 TTS 预加载
  if (window.speechSynthesis) {
    loadVoices();
    const dummy = new SpeechSynthesisUtterance('');
    dummy.volume = 0;
    window.speechSynthesis.speak(dummy);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try { checkHealth(); } catch(e) { console.error('checkHealth:', e.message); }
  try { setupEventListeners(); } catch(e) { console.error('setupEvents:', e.message); }
  // 移动端首次触摸解锁
  try {
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('click', unlockAudio, { once: true });
  } catch(e) {}
});

// 检查后端模式（演示 vs 正式）
async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();

    if (data.hasApiKey) {
      modeBadge.textContent = 'AI 正式模式';
      modeBadge.className = 'mode-badge live';
      tipText.innerHTML = '✅ 已连接 AI 服务，尽情使用吧！';
    } else {
      modeBadge.textContent = '演示模式';
      modeBadge.className = 'mode-badge demo';
    }
  } catch {
    modeBadge.textContent = '演示模式';
    modeBadge.className = 'mode-badge demo';
  }
}

// ---- 事件监听 ----
function setupEventListeners() {
  // 字数统计
  textInput.addEventListener('input', () => {
    charCount.textContent = textInput.value.length;
  });

  // 风格选择（漫画风格）
  document.querySelectorAll('.style-options .style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.parentElement;
      parent.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const ds = btn.dataset.style;
      const dl = btn.dataset.lang;
      if (ds) currentStyle = ds;
      if (dl) {
        currentLang = dl;
        // 更新界面文案
        if (dl === 'es') {
          $('#inputTitle').textContent = '✍️ Ingresa un texto en español';
          $('#inputDesc').textContent = 'Pega un artículo, diálogo o texto en español y la IA lo convertirá en un cómic';
          textInput.placeholder = 'Ejemplo:\n\nMaría caminaba por el parque cuando vio un perrito perdido. Lo levantó con cuidado y buscó a su dueño por todas partes. El dueño estaba muy agradecido...';
        } else {
          $('#inputTitle').textContent = '✍️ 输入英语短文';
          $('#inputDesc').textContent = '粘贴一段英语文章、对话或课本内容，AI 会将它变成漫画';
          textInput.placeholder = '例如：\n\nTom woke up late this morning. He rushed to the bus stop, but the bus had already left. "Oh no! I\'ll be late for school!" he thought. Just then, his neighbor Mrs. Chen pulled up in her car and offered him a ride...';
        }
      }
    });
  });

  // 生成按钮
  btnGenerate.addEventListener('click', generateComic);

  // 重新生成
  $('#btnBack').addEventListener('click', resetToInput);

  // 重试
  $('#btnRetry').addEventListener('click', generateComic);

  // 语法弹窗
  $('#btnGrammar').addEventListener('click', showGrammarModal);
  $('#btnCloseGrammar').addEventListener('click', hideGrammarModal);
  grammarModal.addEventListener('click', (e) => {
    if (e.target === grammarModal) hideGrammarModal();
  });

  // 朗读
  $('#btnAudio').addEventListener('click', playAudio);

  // 键盘快捷键：Ctrl+Enter 生成
  textInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      generateComic();
    }
  });
}

// ---- 核心：生成漫画 ----
async function generateComic() {
  const text = textInput.value.trim();

  if (!text) {
    shakeElement(textInput);
    textInput.focus();
    return;
  }
  if (text.length < 10) {
    showError('文章太短了，至少输入10个字符吧~ 📝');
    return;
  }

  // 切换到加载状态
  showLoading();

  // 模拟加载文案轮换（让等待更有趣）
  const loadingMessages = [
    '🤖 AI 正在阅读你的文章...',
    '📋 正在设计漫画分镜...',
    '🎨 正在绘制第一幅插图...',
    '🖌️ 给角色添加表情和动作...',
    '✨ 正在润色画面细节...',
    '📚 提取重点词汇和语法...',
    '🎭 最后的排版调整...',
  ];
  let msgIndex = 0;
  const msgInterval = setInterval(() => {
    msgIndex = (msgIndex + 1) % loadingMessages.length;
    loadingText.textContent = loadingMessages[msgIndex];
  }, 2000);

  try {
    const res = await fetch('/api/generate-comic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, style: currentStyle, lang: currentLang }),
    });

    clearInterval(msgInterval);

    // 先读文本再判断，避免 JSON 解析崩溃
    const rawText = await res.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      // 服务器返回了 HTML 或其他非 JSON 内容
      console.error('服务器返回异常:', rawText.slice(0, 200));
      throw new Error('网络异常，请刷新页面重试（可能是隧道连接断开）');
    }

    if (!res.ok) {
      throw new Error(data.error || `请求失败 (${res.status})`);
    }

    currentData = data;
    showResult(data);

  } catch (err) {
    clearInterval(msgInterval);
    console.error('生成失败:', err);
    showError(err.message);
  }
}

// ---- 渲染结果 ----
function showResult(data) {
  hideAll();
  resultSection.classList.remove('hidden');

  // 标题
  comicTitle.textContent = data.title || '📖 你的漫画';

  // 如果是整页漫画模式，先显示大图
  if (data.scenes?.[0]?.isComicPage) {
    const pageImg = document.createElement('div');
    pageImg.className = 'comic-fullpage';
    pageImg.innerHTML = `<img src="${data.scenes[0].imageUrl}" alt="漫画整页" class="comic-fullpage-img">`;
    comicStrip.before(pageImg);
  }

  // 渲染漫画分镜
  comicStrip.innerHTML = '';
  data.scenes.forEach((scene, i) => {
    const panel = document.createElement('div');
    panel.className = 'comic-panel';
    const isComicPage = scene.isComicPage;

    panel.innerHTML = `
      ${!isComicPage ? `
      <div class="panel-image-wrap">
        <span class="panel-number">${i + 1}</span>
        ${scene.reviewRejected
          ? `<div class="panel-image" style="display:flex;align-items:center;justify-content:center;background:#FFF0F0;font-size:0.9rem;text-align:center;padding:20px;color:#c00;">🚫 内容审核未通过<br><small>${escapeHtml(scene.reviewReason||'')}</small></div>`
          : scene.imageUrl
          ? `<img class="panel-image" src="${scene.imageUrl}" alt="Panel ${i + 1}" loading="${i < 3 ? 'eager' : 'lazy'}">`
          : `<div class="panel-image" style="display:flex;align-items:center;justify-content:center;background:#F0EEFF;font-size:0.9rem;text-align:center;padding:20px;">🎨 图片生成中...<br><small>请重试</small></div>`
        }
      </div>` : ''}
      <div class="panel-content">
        <p class="panel-en">
          ${escapeHtml(scene.originalSentence || scene.englishSentence)}
          <button class="btn-listen-sentence-speak" data-text="${escapeHtml(scene.originalSentence || scene.englishSentence)}" data-lang="${currentLang}" title="朗读这句">🔊</button>
        </p>
        <p class="panel-zh">${escapeHtml(scene.chineseTranslation)}</p>
        <div class="panel-vocab">
          ${(scene.vocabulary || []).map(v =>
            `<span class="vocab-chip" data-action="vocab" data-word="${escapeHtml(v.word||'')}" data-meaning="${escapeHtml(v.meaning||'')}" data-example="${escapeHtml(v.example||'')}" title="点击收藏">${escapeHtml(v.word)}</span>`
          ).join('')}
        </div>
        <div class="panel-grammar">💡 ${escapeHtml(scene.grammarNote || '')}</div>
      </div>
    `;
    // 点击面板放大
    panel.addEventListener('click', () => {
      const wasExpanded = panel.classList.contains('expanded');
      $$('.comic-panel').forEach(p => p.classList.remove('expanded'));
      if (!wasExpanded) panel.classList.add('expanded');
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
    comicStrip.appendChild(panel);
  });

  // 词汇汇总
  renderVocabGrid(data.scenes);

  // 滚动到结果
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // 显示演示提示
  if (data.demoMode) {
    tipText.innerHTML = '🎭 当前为<strong>演示模式</strong>，图片为占位图。设置 API Key 后可生成真实漫画！';
    tipText.style.display = 'block';
  }
}

// 渲染词汇网格
function renderVocabGrid(scenes) {
  const allVocab = [];
  const seen = new Set();
  scenes.forEach(scene => {
    (scene.vocabulary || []).forEach(v => {
      if (!seen.has(v.word.toLowerCase())) {
        seen.add(v.word.toLowerCase());
        allVocab.push(v);
      }
    });
  });

  vocabGrid.innerHTML = allVocab.map(v => `
    <div class="vocab-item">
      <div class="vocab-word">🔤 ${escapeHtml(v.word)}</div>
      <div class="vocab-meaning">${escapeHtml(v.meaning || '')}</div>
      <div class="vocab-example">${escapeHtml(v.example || '')}</div>
    </div>
  `).join('');
}

// ---- 朗读功能（浏览器自带 TTS，免费）----
let isSpeaking = false;
let speechUtterance = null;

// 逐句朗读
// 预加载语音列表（iOS 需要）
let cachedVoices = [];
function loadVoices() {
  return new Promise(resolve => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoices = voices;
      resolve(voices);
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      resolve(cachedVoices);
    };
    // 超时兜底（3秒后无论如何返回）
    setTimeout(() => resolve(cachedVoices), 3000);
  });
}

async function speakSentence(btn) {
  const text = btn.dataset.text;
  const lang = btn.dataset.lang || 'en';
  if (!text) return;

  // 停止当前播放
  try { window.speechSynthesis?.cancel(); } catch {}
  if (!audioPlayer.paused) { audioPlayer.pause(); audioPlayer.currentTime = 0; }
  isSpeaking = false;

  // 重置所有按钮
  document.querySelectorAll('.btn-listen-sentence').forEach(b => b.textContent = '🔊');

  btn.textContent = '⏳';

  // 检测浏览器是否支持 TTS
  const hasTTS = typeof SpeechSynthesisUtterance !== 'undefined' && window.speechSynthesis;

  // 西语一律服务端（纯正发音），英语优先浏览器 TTS
  if (lang === 'es' || !hasTTS) {
    await serverTTS(btn, text, lang);
    return;
  }

  // 英语：尝试浏览器 TTS
  if (hasTTS) {
    const voices = await loadVoices();
    const voice = voices.find(v => v.lang === 'en-US')
      || voices.find(v => v.lang.startsWith('en-'));

    if (voice) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      utterance.pitch = 1;
      utterance.volume = 1;

      btn.textContent = '🔈';
      isSpeaking = true;
      speechUtterance = utterance;

      return new Promise(resolve => {
        utterance.onend = () => { btn.textContent = '🔊'; isSpeaking = false; resolve(); };
        utterance.onerror = () => {
          window.speechSynthesis.cancel();
          serverTTS(btn, text, lang);
          resolve();
        };
        window.speechSynthesis.speak(utterance);
      });
    }
  }

  // 英语兜底：服务端
  await serverTTS(btn, text, lang);
}

// 全局 AudioContext（移动端播放用）
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// 服务端 TTS（诊断页验证可用的方式）
async function serverTTS(btn, text, lang) {
  btn.textContent = '⏳';

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    btn.textContent = '🔈';
    isSpeaking = true;

    audio.onended = () => { btn.textContent = '🔊'; isSpeaking = false; };
    audio.onerror = () => { btn.textContent = '⚠️'; isSpeaking = false; };

    // 等音频加载完再播放（诊断页成功的做法）
    await new Promise((resolve, reject) => {
      audio.oncanplaythrough = () => {
        audio.play().then(resolve).catch(reject);
      };
      audio.onerror = reject;
      // 3秒超时
      setTimeout(() => reject(new Error('加载超时')), 3000);
    });

  } catch (e) {
    console.error('TTS失败:', e);
    btn.textContent = '⚠️';
    isSpeaking = false;
    setTimeout(() => { btn.textContent = '🔊'; }, 1500);
  }
}

async function playAudio() {
  if (!currentData) return;

  const btnAudio = $('#btnAudio');

  // 停止当前播放
  if (isSpeaking) {
    try { window.speechSynthesis?.cancel(); } catch {}
    if (!audioPlayer.paused) { audioPlayer.pause(); audioPlayer.currentTime = 0; }
    isSpeaking = false;
    btnAudio.textContent = '🔊 听朗读';
    return;
  }

  // 统一走服务端 TTS（兼容所有设备）
  await serverTTS(btnAudio, currentData.fullText, currentLang || 'en');
}

// ---- 语法弹窗 ----
function showGrammarModal() {
  if (!currentData) return;

  const { grammarSummary, scenes } = currentData;

  const allGrammar = grammarSummary || [];
  // 如果没有全局语法总结，从分镜中收集
  if (allGrammar.length === 0) {
    scenes.forEach((scene, i) => {
      if (scene.grammarNote) {
        allGrammar.push({
          title: `Scene ${i + 1} 语法`,
          explanation: scene.grammarNote,
          example: scene.englishSentence,
        });
      }
    });
  }

  grammarContent.innerHTML = allGrammar.map(g => `
    <div class="grammar-item">
      <h4>📌 ${escapeHtml(g.title || '')}</h4>
      <p>${escapeHtml(g.explanation || '')}</p>
      ${g.example ? `<p style="margin-top:6px;color:var(--primary-dark);font-style:italic;">例: "${escapeHtml(g.example)}"</p>` : ''}
    </div>
  `).join('');

  grammarModal.classList.remove('hidden');
}

function hideGrammarModal() {
  grammarModal.classList.add('hidden');
}

// ---- 状态切换 ----
function showLoading() {
  hideAll();
  loadingSection.classList.remove('hidden');
  loadingText.textContent = '🤖 AI 正在分析文本...';
}

function showError(msg) {
  hideAll();
  errorSection.classList.remove('hidden');
  errorMessage.textContent = msg;
}

function hideAll() {
  inputSection.classList.add('hidden');
  loadingSection.classList.add('hidden');
  resultSection.classList.add('hidden');
  errorSection.classList.add('hidden');
}

function resetToInput() {
  hideAll();
  inputSection.classList.remove('hidden');
  inputSection.scrollIntoView({ behavior: 'smooth' });
  textInput.focus();
  // 停止音频
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
  $('#btnAudio').textContent = '🔊 听朗读';
}

// ---- 工具函数 ----
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function shakeElement(el) {
  el.style.animation = 'none';
  el.offsetHeight; // 触发回流
  el.style.animation = 'shake 0.4s ease';
  el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
}

function base64ToBlob(base64, mime) {
  const byteChars = atob(base64);
  const byteNums = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNums[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNums)], { type: mime });
}

// ============================================
// 可视化设置面板
// ============================================
const settingsOverlay = $('#settingsOverlay');
const FONT_SCALES = [0.85, 1, 1.2];      // 小/中/大
const RADIUS_SCALES = [0.5, 1, 1.6];      // 方正/标准/圆润
const FONT_LABELS = ['小', '中', '大'];
const RADIUS_LABELS = ['方正', '标准', '圆润'];

// 默认设置
const DEFAULT_SETTINGS = {
  colorPrimary: '#0066cc',
  colorBg: '#ffffff',
  colorCard: '#ffffff',
  colorText: '#1d1d1f',
  fontSizeIdx: 1,
  radiusIdx: 1,
  siteTitle: '',
  footerText: '',
};

// 从 localStorage 读取设置
function loadSettings() {
  try {
    const saved = localStorage.getItem('drawword-settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SETTINGS };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

// 保存设置到 localStorage
function saveSettings() {
  const settings = {
    colorPrimary: $('#colorPrimary').value,
    colorBg: $('#colorBg').value,
    colorCard: $('#colorCard').value,
    colorText: $('#colorText').value,
    fontSizeIdx: parseInt($('#fontSizeSlider').value),
    radiusIdx: parseInt($('#radiusSlider').value),
    siteTitle: $('#inputSiteTitle').value,
    footerText: $('#inputFooter').value,
  };
  localStorage.setItem('drawword-settings', JSON.stringify(settings));
  applySettings(settings);
}

// 将设置应用到页面
function applySettings(s) {
  const root = document.documentElement.style;

  // 颜色
  root.setProperty('--primary', s.colorPrimary);
  root.setProperty('--bg', s.colorBg);
  root.setProperty('--card-bg', s.colorCard);
  root.setProperty('--text', s.colorText);

  // 自动生成衍生色（亮色/暗色变体）
  const primaryLight = lightenColor(s.colorPrimary, 0.3);
  const primaryDark = darkenColor(s.colorPrimary, 0.2);
  root.setProperty('--primary-light', primaryLight);
  root.setProperty('--primary-dark', primaryDark);

  // 字号
  root.setProperty('--font-scale', FONT_SCALES[s.fontSizeIdx]);

  // 圆角
  root.setProperty('--radius-scale', RADIUS_SCALES[s.radiusIdx]);
  root.setProperty('--radius', `${16 * RADIUS_SCALES[s.radiusIdx]}px`);
  root.setProperty('--radius-sm', `${10 * RADIUS_SCALES[s.radiusIdx]}px`);

  // Logo + 页脚
  if (s.siteTitle) {
    $('#siteLogo').innerHTML = `🎨 ${escapeHtml(s.siteTitle)} <span class="logo-sub">Draw Word</span>`;
  }
  if (s.footerText) {
    document.querySelector('.footer-copy').textContent = s.footerText;
  }
}

// 简单的颜色变浅/变深函数
function lightenColor(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)})`;
}
function darkenColor(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const mix = (c) => Math.round(c * (1 - amount));
  return `rgb(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)})`;
}
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

// 初始化设置面板
function initSettingsPanel() {
  const s = loadSettings();

  // 设置控件的初始值
  $('#colorPrimary').value = s.colorPrimary;
  $('#colorBg').value = s.colorBg;
  $('#colorCard').value = s.colorCard;
  $('#colorText').value = s.colorText;
  $('#fontSizeSlider').value = s.fontSizeIdx;
  $('#radiusSlider').value = s.radiusIdx;
  $('#inputSiteTitle').value = s.siteTitle;
  $('#inputFooter').value = s.footerText;

  $('#fontSizeVal').textContent = FONT_LABELS[s.fontSizeIdx];
  $('#radiusVal').textContent = RADIUS_LABELS[s.radiusIdx];

  // 实时预览：颜色变化
  const colorInputs = ['colorPrimary', 'colorBg', 'colorCard', 'colorText'];
  colorInputs.forEach(id => {
    $(`#${id}`).addEventListener('input', () => {
      const preview = {
        colorPrimary: $('#colorPrimary').value,
        colorBg: $('#colorBg').value,
        colorCard: $('#colorCard').value,
        colorText: $('#colorText').value,
        fontSizeIdx: parseInt($('#fontSizeSlider').value),
        radiusIdx: parseInt($('#radiusSlider').value),
        siteTitle: $('#inputSiteTitle').value,
        footerText: $('#inputFooter').value,
      };
      applySettings(preview);
    });
  });

  // 实时预览：字号滑块
  $('#fontSizeSlider').addEventListener('input', () => {
    const idx = parseInt($('#fontSizeSlider').value);
    $('#fontSizeVal').textContent = FONT_LABELS[idx];
    const preview = currentPreview();
    applySettings(preview);
  });

  // 实时预览：圆角滑块
  $('#radiusSlider').addEventListener('input', () => {
    const idx = parseInt($('#radiusSlider').value);
    $('#radiusVal').textContent = RADIUS_LABELS[idx];
    const preview = currentPreview();
    applySettings(preview);
  });

  // 标题实时预览
  $('#inputSiteTitle').addEventListener('input', () => {
    const val = $('#inputSiteTitle').value;
    if (val) {
      $('#siteLogo').innerHTML = `🎨 ${escapeHtml(val)} <span class="logo-sub">Draw Word</span>`;
    }
  });

  // 页脚实时预览
  $('#inputFooter').addEventListener('input', () => {
    const val = $('#inputFooter').value;
    if (val) {
      document.querySelector('.footer-copy').textContent = val;
    }
  });

  // 应用初始设置
  applySettings(s);
}

function currentPreview() {
  return {
    colorPrimary: $('#colorPrimary').value,
    colorBg: $('#colorBg').value,
    colorCard: $('#colorCard').value,
    colorText: $('#colorText').value,
    fontSizeIdx: parseInt($('#fontSizeSlider').value),
    radiusIdx: parseInt($('#radiusSlider').value),
    siteTitle: $('#inputSiteTitle').value,
    footerText: $('#inputFooter').value,
  };
}

// 打开/关闭设置面板
function setupSettingsEvents() {
  // 打开（按钮可能已被删除，安全检查）
  const btnOpen = $('#btnOpenSettings');
  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      settingsOverlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    });
  }

  // 关闭
  function closeSettings() {
    settingsOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }
  $('#btnCloseSettings').addEventListener('click', closeSettings);
  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) closeSettings();
  });

  // 保存
  $('#btnSaveSettings').addEventListener('click', () => {
    saveSettings();
    closeSettings();
    // 小动画提示
    const badge = $('#btnOpenSettings');
    if (badge) {
      badge.textContent = '✅ 已保存';
      setTimeout(() => { badge.innerHTML = '⚙️ <span class="btn-settings-text">自定义</span>'; }, 1500);
    }
  });

  // 恢复默认
  $('#btnReset').addEventListener('click', () => {
    if (confirm('确定要恢复默认设置吗？当前设置将被清除。')) {
      localStorage.removeItem('drawword-settings');
      const s = DEFAULT_SETTINGS;
      $('#colorPrimary').value = s.colorPrimary;
      $('#colorBg').value = s.colorBg;
      $('#colorCard').value = s.colorCard;
      $('#colorText').value = s.colorText;
      $('#fontSizeSlider').value = s.fontSizeIdx;
      $('#radiusSlider').value = s.radiusIdx;
      $('#inputSiteTitle').value = '';
      $('#inputFooter').value = '';
      $('#fontSizeVal').textContent = '中';
      $('#radiusVal').textContent = '标准';
      applySettings(s);
      $('#siteLogo').innerHTML = '🎨 画词AI <span class="logo-sub">Draw Word</span>';
      document.querySelector('.footer-copy').textContent = '画词AI · Draw Word — 让外语学习变得有趣 🎨';
      document.querySelector('.footer-contact a').textContent = 'w2293436@gmail.com';
    }
  });

  // ESC 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !settingsOverlay.classList.contains('hidden')) {
      closeSettings();
    }
  });
}

// 在 DOM 加载后初始化（每个模块独立防护）
document.addEventListener('DOMContentLoaded', () => {
  const safeInit = (name, fn) => {
    try { fn(); console.log('✅', name); }
    catch(e) { console.error('❌', name, e.message); }
  };
  safeInit('设置面板', initSettingsPanel);
  safeInit('设置事件', setupSettingsEvents);
  safeInit('协议弹窗', initTermsAgreement);
  safeInit('生词本', initVocabBook);
  safeInit('历史记录', initHistory);
});

// ============================================
// 1. 用户协议同意
// ============================================
function initTermsAgreement() {
  const agreed = localStorage.getItem('terms-agreed');
  if (agreed === 'yes') {
    document.getElementById('termsModal').classList.add('hidden');
    return;
  }
  document.getElementById('termsModal').classList.remove('hidden');
  document.getElementById('btnAgreeTerms').addEventListener('click', () => {
    localStorage.setItem('terms-agreed', 'yes');
    document.getElementById('termsModal').classList.add('hidden');
  });
}

// ============================================
// 2. 生词本
// ============================================
function getVocabBook() {
  try { return JSON.parse(localStorage.getItem('vocab-book') || '[]'); }
  catch { return []; }
}
function saveVocabBook(book) {
  localStorage.setItem('vocab-book', JSON.stringify(book));
}

function toggleVocab(word, meaning, example) {
  const book = getVocabBook();
  const idx = book.findIndex(v => v.word === word);
  if (idx >= 0) {
    book.splice(idx, 1);
  } else {
    book.push({ word, meaning, example, addedAt: new Date().toISOString() });
  }
  saveVocabBook(book);
  updateVocabChips();
}

function updateVocabChips() {
  const book = getVocabBook();
  const saved = new Set(book.map(v => v.word));
  document.querySelectorAll('.vocab-chip').forEach(chip => {
    const word = chip.textContent.replace('⭐','').trim();
    if (saved.has(word)) {
      chip.classList.add('saved');
      if (!chip.textContent.startsWith('⭐')) chip.textContent = '⭐ ' + word;
    } else {
      chip.classList.remove('saved');
      chip.textContent = word;
    }
  });
}

function showVocabBook() {
  const book = getVocabBook();
  if (book.length === 0) {
    alert('生词本为空，点击漫画中的单词即可收藏');
    return;
  }

  let html = '<div style="max-height:60vh;overflow-y:auto">';
  book.forEach(v => {
    html += `<div class="vocab-item" style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div class="vocab-word">⭐ ${escapeHtml(v.word)}</div>
        <div class="vocab-meaning">${escapeHtml(v.meaning || '')}</div>
        <div class="vocab-example">${escapeHtml(v.example || '')}</div>
      </div>
      <button data-action="removeVocab" data-word="${escapeHtml(v.word)}" style="border:none;background:none;cursor:pointer;font-size:18px">🗑️</button>
    </div>`;
  });
  html += '</div>';
  html += `<div style="margin-top:16px;display:flex;gap:10px">
    <button class="btn-setting-action btn-reset" data-action="exportVocab">📥 导出CSV</button>
    <button class="btn-setting-action btn-reset" data-action="clearVocab">🗑️ 清空</button>
  </div>`;

  document.getElementById('grammarContent').innerHTML = html;
  document.getElementById('grammarModal').classList.remove('hidden');
  document.querySelector('#grammarModal .modal-header h3').textContent = '📚 生词本';
}

function removeVocab(word) {
  const book = getVocabBook();
  saveVocabBook(book.filter(v => v.word !== word));
  showVocabBook();
  updateVocabChips();
}

function clearVocab() {
  if (confirm('确定清空所有生词？')) {
    saveVocabBook([]);
    updateVocabChips();
    showVocabBook();
  }
}

function exportVocab() {
  const book = getVocabBook();
  let csv = 'Word,Meaning,Example\n';
  book.forEach(v => {
    csv += `"${v.word}","${v.meaning}","${v.example}"\n`;
  });
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'vocabulary.csv'; a.click();
  URL.revokeObjectURL(url);
}

function initVocabBook() {
  updateVocabChips();
  // 事件委托：监听所有点击，分发到对应功能
  document.body.addEventListener('click', function(e) {
    // 朗读按钮（class 匹配）
    const speakBtn = e.target.closest('.btn-listen-sentence-speak');
    if (speakBtn) {
      speakSentence(speakBtn);
      return;
    }

    // data-action 事件委托
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const { action, word, meaning, example, index } = target.dataset;

    if (action === 'vocab') toggleVocab(word, meaning, example);
    else if (action === 'showVocab') showVocabBook();
    else if (action === 'showHistory') showHistory();
    else if (action === 'loadHistory') loadHistory(parseInt(index));
    else if (action === 'removeVocab') removeVocab(word);
    else if (action === 'clearVocab') clearVocab();
    else if (action === 'exportVocab') exportVocab();
  });
}

// ============================================
// 3. 历史记录
// ============================================
function getHistory() {
  try { return JSON.parse(localStorage.getItem('comic-history') || '[]'); }
  catch { return []; }
}

function saveHistory(data) {
  const history = getHistory();
  history.unshift({
    title: data.title,
    text: data.fullText,
    style: data.style,
    lang: data.lang || currentLang,
    scenes: data.scenes,
    grammarSummary: data.grammarSummary,
    imageProvider: data.imageProvider,
    date: new Date().toISOString(),
  });
  // 保留最新20条
  if (history.length > 20) history.length = 20;
  localStorage.setItem('comic-history', JSON.stringify(history));
}

function showHistory() {
  const history = getHistory();
  if (history.length === 0) {
    alert('暂无历史记录，生成漫画后自动保存');
    return;
  }

  let html = '<div style="max-height:60vh;overflow-y:auto">';
  history.forEach((h, i) => {
    const date = new Date(h.date).toLocaleString('zh-CN');
    const langLabel = h.lang === 'es' ? '🇪🇸' : '🇺🇸';
    html += `<div class="vocab-item" style="cursor:pointer;margin-bottom:8px" data-action="loadHistory" data-index="${i}">
      <div style="display:flex;justify-content:space-between">
        <strong>${escapeHtml(h.title || '无标题')}</strong>
        <span style="font-size:12px;color:var(--apple-ink-48)">${date} ${langLabel}</span>
      </div>
      <div style="font-size:13px;color:var(--apple-ink-48);margin-top:4px">${escapeHtml((h.text||'').slice(0,60))}...</div>
    </div>`;
  });
  html += '</div>';

  document.getElementById('grammarContent').innerHTML = html;
  document.getElementById('grammarModal').classList.remove('hidden');
  document.querySelector('#grammarModal .modal-header h3').textContent = '📜 历史记录';
}

function loadHistory(index) {
  const history = getHistory();
  const h = history[index];
  if (!h) return;

  currentData = {
    title: h.title,
    fullText: h.text,
    style: h.style,
    scenes: h.scenes,
    grammarSummary: h.grammarSummary,
    imageProvider: h.imageProvider,
  };
  currentLang = h.lang || 'en';

  hideGrammarModal();
  showResult(currentData);
}

function initHistory() {
  // 生成完成后自动保存
  const origShowResult = showResult;
  showResult = function(data) {
    origShowResult(data);
    saveHistory(data);
  };
}
