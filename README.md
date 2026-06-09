# 🎨 画词AI · Draw Word

> 将英语/西班牙语短文通过 AI 生成漫画，让记单词、练听力、学语法变得有趣。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v1.5-brightgreen)](https://github.com/w2293436-maker/draw-word-ai/releases)

## ✨ 核心功能

- 📖 **短文变漫画**：输入任意英语或西班牙语短文，AI 自动拆分为 3-6 格漫画分镜并生成插图
- 📚 **词汇学习**：自动提取重点词汇，带释义和例句，支持一键收藏生词本
- 📝 **语法讲解**：逐句语法点 + 全局语法总结（中文讲解）
- 🔊 **语音朗读**：逐句纯正发音（微软 AI 语音，英语 + 西班牙语）
- 🎨 **三种画风**：日式漫画 / 现代插画 / 绘本风格
- 📊 **数据看板**：使用统计、用户分层、留存分析（密码保护）
- 🛡️ **四道审核**：关键词 + AI + negative prompt + 阿里云平台审核

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install
pip install edge-tts

# 2. 配置 API Key
cp .env.example .env
# 编辑 .env 填入你的 DeepSeek 和通义万相 API Key

# 3. 启动
npm start
# 访问 http://localhost:3000
```

## 📦 技术栈

| 层 | 技术 |
|------|------|
| 前端 | 原生 HTML + CSS + JS（响应式，Apple 设计风格） |
| 后端 | Node.js + Express |
| 文本 AI | DeepSeek (`deepseek-chat`) |
| 图片 AI | 通义万相 百炼 (`wanx2.1-t2i-turbo`) |
| 语音 | 微软 Edge TTS（es-ES-Alvaro / en-US-Jenny） |
| 部署 | Railway |

## 🔑 需要注册的服务

- [DeepSeek](https://platform.deepseek.com) — 文本分析（中国手机号注册）
- [阿里云百炼](https://bailian.console.aliyun.com) — 图片生成（通义万相）

## 📁 项目结构

```
画词AI-DrawWord/
├── public/              # 前端页面
│   ├── index.html       # 主页
│   ├── dashboard.html   # 数据看板
│   ├── terms.html       # 使用条款
│   ├── privacy.html     # 隐私政策
│   ├── disclaimer.html  # 免责声明
│   ├── css/style.css    # Apple 风格样式
│   └── js/main.js       # 前端交互逻辑
├── server/              # 后端服务
│   ├── index.js         # Express 入口 + API 路由
│   └── services/
│       ├── ai.js        # AI 服务层（DeepSeek + 通义万相）
│       └── analytics.js # 数据采集与分析
├── docs/                # 项目文档
├── dev-logs/            # 开发日志
├── data/                # 运营数据（gitignore）
├── .env.example         # 环境变量模板
└── package.json
```

## 📄 开源协议

MIT License — 详见 [LICENSE](LICENSE)

## 📧 联系

- 侵权投诉：w2293436@gmail.com
- GitHub：[@w2293436-maker](https://github.com/w2293436-maker)
