# 画词AI · Draw Word — 设计规范

## 设计系统
基于 **Apple Design Language**（来源：[VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)）

## 视觉风格
- **基调**：极简、干净、让内容说话。UI 退后，产品（漫画+学习内容）成为焦点
- **配色**：单一强调色 Action Blue（`#0066cc`），无需第二品牌色
- **字体**：SF Pro Display / SF Pro Text（Windows 回退 Inter）

## 默认配色方案
| 变量 | 色值 | 用途 |
|------|------|------|
| `--primary` | `#6C5CE7` | 主色调（按钮、高亮、链接） |
| `--primary-dark` | `#4834D4` | 深色变体（渐变、悬停） |
| `--primary-light` | `#A29BFE` | 浅色变体（标签、背景） |
| `--accent` | `#FD79A8` | 强调色（警告、重点） |
| `--bg` | `#F8F9FE` | 页面背景 |
| `--card-bg` | `#FFFFFF` | 卡片背景 |
| `--text` | `#2D3436` | 主文字 |
| `--text-light` | `#636E72` | 辅助文字 |
| `--text-lighter` | `#B2BEC3` | 弱化文字 |

## 排版层级
| 层级 | 字号 | 字重 | 用途 |
|------|------|------|------|
| H1 | 1.5rem | 700 | 页面标题/Logo |
| H2 | 1.25rem | 700 | 区域标题 |
| H3 | 1.15rem | 600 | 子标题 |
| Body | 1rem | 400 | 正文 |
| Small | 0.85rem | 400 | 辅助说明 |
| Caption | 0.78rem | 400 | 标签/角标 |

## 组件规范

### 卡片
- 背景：`var(--card-bg)`
- 圆角：`var(--radius)` (默认16px)
- 阴影：`0 4px 24px rgba(108,92,231,0.10)`
- 内边距：32px (桌面) / 16px (手机)

### 按钮
- 主按钮：渐变紫色背景 + 白色文字 + 阴影
- 次按钮：白色背景 + 边框 + 悬停变紫
- 最小点击区域：44px × 44px

### 漫画分镜卡片
- 桌面：340px 宽，横向滚动
- 手机：280px 宽，横向滑动
- 点击展开至 500px（桌面）/ 85vw（手机）

## 响应式断点
| 断点 | 适配设备 |
|------|------|
| ≥ 769px | 桌面/平板横屏 |
| ≤ 768px | 平板竖屏/大屏手机 |
| ≤ 400px | 小屏手机 |

## 动效规范
- 页面切换：`slideUp 0.45s ease-out`
- 弹窗：`fadeIn 0.2s`
- 设置面板滑入：`slideInRight 0.3s ease`
- 按钮悬停：`translateY(-2px)` + 阴影增强
- 加载动画：脉冲呼吸 `1.4s ease-in-out infinite`
