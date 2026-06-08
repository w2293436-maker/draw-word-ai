# 画词AI · Draw Word — 开发执行步骤

## 环境准备
1. 安装 Node.js ≥ 18
2. 克隆项目 / 进入项目目录
3. 运行 `npm install` 安装依赖
4. 复制 `.env.example` 为 `.env`
5. 填入 `AI_API_KEY`（DeepSeek）和 `IMAGE_API_KEY`（通义万相）

## 本地开发
```bash
npm run dev      # 开发模式（文件变更自动重启）
```
访问 `http://localhost:3000`

## 生产部署
```bash
npm start        # 生产模式
```

## 验证清单
- [x] `npm install` 无报错
- [x] `npm start` 服务器正常启动
- [x] 浏览器访问 `localhost:3000` 页面正常
- [x] 输入短文 → 生成漫画分镜
- [x] 三种画风切换正常
- [x] 词汇/语法正确展示
- [x] 违规内容被拦截
- [x] 设置面板打开/保存/恢复默认
- [x] 手机端布局正常

## 开发禁忌
- ❌ 不要在 `.env` 中提交真实 API Key
- ❌ 不要修改 `.gitignore` 中对 `.env` 的忽略规则
- ❌ 不要在前端代码中硬编码 API Key
- ❌ 不要在 AI prompt 中包含用户个人信息
- ❌ 不要跳过内容审核直接调用生图 API

## 新增功能开发流程
1. 在 `docs/` 下更新需求文档
2. 在 `dev-logs/` 创建当日日志
3. 修改 `server/services/ai.js`（后端逻辑）
4. 修改 `public/`（前端 UI）
5. 本地测试通过
6. 更新 `CLAUDE.md` 相关说明
