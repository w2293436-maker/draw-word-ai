# 画词AI · Draw Word — 技术栈规范

## 整体架构
```
浏览器(HTML/CSS/JS) → Express 服务器 → AI 服务
                                      ├── DeepSeek (文本分析)
                                      └── 通义万相 (图片生成)
```

## 前端
| 技术 | 选型 | 说明 |
|------|------|------|
| HTML | 原生 HTML5 | 无需框架，降低学习门槛 |
| CSS | 原生 CSS3 + CSS 变量 | 响应式 + 可视化主题切换 |
| JavaScript | 原生 ES6+ | 无依赖，fetch API 通信 |

### CSS 变量规范
- `--primary` / `--primary-light` / `--primary-dark`：主题色系
- `--bg`：页面背景
- `--card-bg`：卡片/面板背景
- `--text` / `--text-light` / `--text-lighter`：文字层级
- `--radius` / `--radius-sm`：圆角大小
- `--font-scale` / `--radius-scale`：用户可调缩放

## 后端
| 技术 | 选型 | 说明 |
|------|------|------|
| 运行时 | Node.js ≥ 18 | ES2022+ |
| 框架 | Express 4.x | 轻量 HTTP 服务 |
| AI SDK | openai npm 包 | 兼容 DeepSeek API |

## AI 服务
| 用途 | 服务商 | 模型 | API 地址 |
|------|------|------|------|
| 文本分析 | DeepSeek | `deepseek-chat` | `api.deepseek.com` |
| 角色设定 | DeepSeek | `deepseek-chat` | 同上 |
| 语法总结 | DeepSeek | `deepseek-chat` | 同上 |
| 图片生成 | 通义万相(百炼) | `wanx2.1-t2i-turbo` | `dashscope.aliyuncs.com` (异步) |

## 环境变量 (.env)
```
AI_API_KEY=           # DeepSeek API Key
AI_BASE_URL=          # DeepSeek 接口地址
AI_MODEL=             # 模型名称
IMAGE_API_KEY=        # 通义万相 API Key (百炼)
PORT=                 # 服务器端口，默认3000
```

## 目录结构
```
画词AI-DrawWord/
├── public/              # 前端
│   ├── index.html
│   ├── css/style.css
│   └── js/main.js
├── server/              # 后端
│   ├── index.js         # 入口
│   └── services/ai.js   # AI 服务层
├── docs/                # 项目文档
├── dev-logs/            # 开发日志
├── .env                 # 密钥（不提交）
├── .env.example         # 密钥模板
└── package.json
```
