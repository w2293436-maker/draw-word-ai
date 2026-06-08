# 画词AI · Draw Word

## 项目简介
将英语短文通过 AI 生成漫画，帮助各年龄段学习者记单词、练听力、学语法。

## 📂 标准文件路径

| 文档 | 路径 | 说明 |
|------|------|------|
| 项目需求 | [docs/requirements.md](docs/requirements.md) | 功能规划、版本路线 |
| 技术栈 | [docs/tech-stack.md](docs/tech-stack.md) | 前后端选型、AI服务、环境变量 |
| 设计规范 | [docs/design-spec.md](docs/design-spec.md) | 配色、排版、组件、响应式 |
| 开发指南 | [docs/development-guide.md](docs/development-guide.md) | 环境搭建、启动、部署、禁忌 |
| 内容安全 | [docs/content-policy.md](docs/content-policy.md) | 四道审核防线、敏感词、拦截规则 |
| API 文档 | [docs/api-docs.md](docs/api-docs.md) | 接口参数、响应格式 |
| 项目总结 | [docs/project-summary.md](docs/project-summary.md) | 产品运营视角完整总结 |
| 开发日志 | [dev-logs/](dev-logs/) | 每天开发记录 |

## 🤖 AI 工作指引

### 开始工作前
1. 阅读 [docs/requirements.md](docs/requirements.md) 了解当前版本规划
2. 阅读 [docs/tech-stack.md](docs/tech-stack.md) 了解技术选型和目录结构
3. 查看 [dev-logs/](dev-logs/) 最新日志，了解昨天做了什么

### 开发代码时
1. 遵循 [docs/design-spec.md](docs/design-spec.md) 的 CSS 变量和组件规范
2. 遵循 [docs/development-guide.md](docs/development-guide.md) 的开发禁忌
3. 新增功能涉及 AI prompt 时，参考 [docs/content-policy.md](docs/content-policy.md)
4. API 变更时同步更新 [docs/api-docs.md](docs/api-docs.md)

### 结束工作前
1. 在 [dev-logs/](dev-logs/) 创建或更新当日日志（`YYYY-MM-DD.md`）
2. 日志包含：✅ 完成事项 / 📋 待办事项 / ❓ 遇到的问题 / 🔑 关键决策
3. 如果新增了重要功能、修改了架构、或做了关键决策，同步更新对应的 docs 文档

### 开发禁忌
- ❌ 不要提交 `.env` 文件（已在 `.gitignore`）
- ❌ 不要在前端代码中暴露 API Key
- ❌ 不要跳过内容审核直接调用生图
- ❌ 不要修改 `.gitignore` 中关于 `.env` 的规则

## 技术栈速查

| 层 | 技术 |
|----|------|
| 前端 | 原生 HTML + CSS + JS（响应式） |
| 后端 | Node.js + Express |
| 文本AI | DeepSeek (`deepseek-chat`) |
| 图片AI | 通义万相 百炼 (`wanx2.1-t2i-turbo`, 异步) |
| 审核 | 关键词(200+) + DeepSeek + negative_prompt + 阿里云 |

## 启动方式
```bash
npm install        # 首次
npm run dev        # 开发（自动重启）
npm start          # 生产
# 访问 http://localhost:3000
```

## 目录结构
```
画词AI-DrawWord/
├── public/              # 前端（index.html / css / js）
├── server/              # 后端（Express + AI服务）
├── docs/                # 📚 项目标准文档
├── dev-logs/            # 📝 开发日志
├── .env                 # 密钥（不提交）
├── .env.example         # 密钥模板
└── package.json
```
