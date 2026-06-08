# 画词AI · Draw Word — API 接口文档

## 基础信息
- Base URL: `http://localhost:3000`
- Content-Type: `application/json`

---

## 1. 生成漫画

**POST** `/api/generate-comic`

### 请求体
```json
{
  "text": "英语短文内容（10-5000字符）",
  "style": "manga | illustration | children"
}
```

### 成功响应
```json
{
  "title": "AI生成的漫画标题",
  "scenes": [
    {
      "englishSentence": "英语原句",
      "chineseTranslation": "中文翻译",
      "sceneDescription": "场景画面描述",
      "imagePrompt": "英文生图prompt",
      "imageUrl": "https://... 生图结果URL",
      "vocabulary": [
        { "word": "单词", "meaning": "释义", "example": "例句" }
      ],
      "grammarNote": "语法知识点"
    }
  ],
  "grammarSummary": [
    { "title": "语法名", "explanation": "解释", "example": "例句" }
  ],
  "style": "manga",
  "fullText": "原文",
  "imageProvider": "通义万相",
  "generatedAt": "2026-06-08T12:00:00.000Z"
}
```

### 错误响应
```json
{
  "error": "错误描述"
}
```

---

## 2. 生成语音

**POST** `/api/generate-audio`

### 请求体
```json
{
  "text": "要朗读的文本"
}
```

### 响应
```json
{
  "audioBase64": "base64编码的MP3（当前暂未接入）",
  "ttsNotAvailable": true
}
```

---

## 3. 健康检查

**GET** `/api/health`

### 响应
```json
{
  "status": "running",
  "provider": "DeepSeek",
  "hasApiKey": true,
  "mode": "正式模式"
}
```
