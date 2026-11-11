# Cloudflare AI Web

中文 ｜ [English](./README.en.md)

![readme.png](https://github.com/user-attachments/assets/e1c4e604-568d-4778-8780-29473619744f)

一个现代化、自适应手机端、零构建报错、支持多平台部署的 AI 编程辅助与多模型对话平台。支持直接部署到 **Cloudflare Pages**、**Vercel**、**Docker / Docker Compose**、**Netlify**、**Zeabur** 等主流平台。

---

## 🌟 核心特性

- ⚡ **100% 完美支持 Cloudflare Pages 拉取部署**：
  - 静态导出与 Cloudflare Pages Functions 双模兼容，内置预设 `wrangler.jsonc` 与 `public/_redirects` / `public/_headers`，一键拉取即构建成功，无任何 Edge / Node 运行时报错。
- 🤖 **全量覆盖主流大模型 (标明免费/收费与真连接测活指示灯)**：
  - 内置 Cloudflare Workers AI 全目录模型（首选推荐）、OpenAI 官方原生接口、Groq 极速推理平台、DeepSeek 官方 API、Google Gemini、本地 Ollama 以及自由添加的自定义 API。
  - **真连接状态灯**：实时发送测活探针探测网络与密钥状态，显示真实连接延迟与可用性。
- 📱 **移动端全场景适配 & 主题自选**：
  - 手机端触控优化：全屏输入体验、抽屉式（Drawer）模型切换、响应式侧边栏。
  - 支持手机界面模拟、电脑宽屏、现代深色、清爽浅色、OLED 纯黑省电等 5 种主题。
- 🇨🇳 / 🇺🇸 **多语言即时切换（中/英）**：
  - 侧边栏底部提供一键中英语言切换按钮，无刷新即时响应。
- 🔗 **多平台代码仓库连接（GitHub / Gitee / GitLab）**：
  - 顶部实时展示当前连接的 `仓库 @ 分支`。
  - 支持保存连接状态，随时可以**取消连接**。
  - 在线读取代码文件注入 AI 编程上下文。
  - 网页内一键推送提交（Commit & Push），附带精确推送时间。
- ⏰ **时间戳与消息管理**：
  - 每条消息精确记录生成时间戳；支持单条消息删除与清空历史会话。
- 🎙️ **语音输入朗读 & 📦 Zip 压缩包导入导出**：
  - 麦克风语音转文字，AI 回复语音朗读播放。
  - 支持上传 `.zip` 项目自动解压提取代码文件到对话。
  - AI 生成代码后支持一键打包导出为 `.zip` 下载。
- 🔐 **管理员自定义 API 增删改**：
  - 密码保护（`APP_PASSWORD`）后台面板。
  - 自由添加/管理任何 OpenAI 兼容端点（如 SiliconFlow 硅基流动、OpenRouter、OneAPI、自建 vLLM）。

---

## 🚀 部署详细指南

### 1. Cloudflare Pages 部署 (推荐，100% 稳定)

1. 将本仓库 Fork 到您的 GitHub / Gitee / GitLab 账号中。
2. 登录 [Cloudflare 控制台 (Dashboard)](https://dash.cloudflare.com/)，在左侧导航进入 **Workers & Pages** -> **创建应用程序** -> **Pages** -> **连接到 Git**。
3. 选择您 Fork 的仓库并点击“开始设置”：
   - **项目名称**：`cloudflare-ai-web`（可自定义）
   - **生产分支**：`main`
   - **框架预设 (Framework preset)**：选择 **None**
   - **构建命令 (Build command)**：`npm run build`
   - **构建输出目录 (Build output directory)**：`out`
4. （可选）环境变量设置：在 **环境变量** 中可填入 `APP_PASSWORD`（访问密码）等。
5. 点击 **保存并部署**，静待数十秒构建完成即可立即在线访问！

---

### 2. Docker / Docker Compose 部署

#### 方式 A：Docker Compose (最简便)

在项目根目录下直接运行：

```bash
docker compose up -d
```

#### 方式 B：Docker 命令行运行

```bash
docker run -d --name cloudflare-ai-web \
  -e CF_ACCOUNT_ID=YOUR_CF_ACCOUNT_ID \
  -e CF_WORKERS_AI_TOKEN=YOUR_CF_WORKERS_AI_TOKEN \
  -e APP_PASSWORD=your_password \
  -p 3000:3000 \
  --restart=always \
  jazee6/cloudflare-ai-web
```

---

### 3. Vercel / Netlify / Zeabur 部署

- **Vercel**：在 Vercel 导入仓库，选择 Next.js 模板，构建命令使用默认 `npm run build` 即可。
- **Netlify**：仓库内置 `netlify.toml`，构建命令 `npm run build`，发布目录 `out`。

---

## 🔑 平台 API 密钥与使用说明文件

点击界面左下角的 **设置图标（齿轮）**，即可进入后台管理各大平台 API：

### 1. OpenAI 官方原生接口选项
- **申请网址**：[https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Base URL**：默认为 `https://api.openai.com/v1`，支持自定义反代域名、中转或聚合网关。
- **支持模型**：GPT-4o、GPT-4o Mini、o1、o3-mini，完全兼容视觉理解与思维链推理。

### 2. Cloudflare Workers AI (首选推荐)
- **申请网址**：登录 Cloudflare 控制台，进入 Workers & Pages -> AI -> 账户 API 令牌，使用 Workers AI 模板创建。
- **特性**：提供大量完全免费模型（Llama 3.1、QWQ-32B、DeepSeek R1、Kimi、GLM、Gemma 等），全球 CDN 边缘极速响应。

### 3. DeepSeek 官方 API
- **申请网址**：[https://platform.deepseek.com/](https://platform.deepseek.com/)
- 免费/极低成本获得高精度 DeepSeek-V3 与 DeepSeek-R1 深度推理能力。
- 在设置中填入 `sk-...` 格式的 API Key 即可。

### 4. Groq 极速免费 API
- **申请网址**：[https://console.groq.com/keys](https://console.groq.com/keys)
- 提供极速的免费推理额度，支持 Llama-3.3-70B 和 DeepSeek-R1-Distill-70B。
- 在设置中填入 `gsk_...` 格式的 API Key。

### 5. Google Gemini API
- **申请网址**：[https://aistudio.google.com/](https://aistudio.google.com/)
- 提供免费的 Gemini 2.5 Flash / Pro 额度。
- 在设置中填入 `AIzaSy...` 格式的 API Key。

### 6. 本地 Ollama 接入
- 下载并运行 Ollama：`ollama run qwen2.5-coder`
- 在设置中填写您的本地地址（例如 `http://127.0.0.1:11434/v1`），即可实现纯本地免费离线 AI 编程。

### 7. 手动加入自定义 API (OpenAI 兼容)
- 支持硅基流动 (SiliconFlow)、OpenRouter、通义千问等所有第三方大模型接口。
- 点击“添加自定义 API”，输入模型名称、Base URL、API Key 与 Model ID，点击添加后立即在模型列表中可选。
