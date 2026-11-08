# Cloudflare AI Web (Multi-Platform & Full AI Engineering Suite)

中文 ｜ [English](./README.en.md)

![readme.png](https://github.com/user-attachments/assets/e1c4e604-568d-4778-8780-29473619744f)

一个支持多模型聚合、智能编程辅助、语音对话、代码与仓库双向同步、支持多平台部署的现代化 AI Web 平台。

---

## 🌟 核心特性

- 🚀 **全面多模型支持**：
  - **DeepSeek 官方 API**（DeepSeek-V3、DeepSeek-R1 深度推理）
  - **Groq 极速免费推理**（Llama-3.3-70B、DeepSeek-R1-Distill-70B）
  - **本地/远程 Ollama**（Qwen 2.5 Coder 编程模型、DeepSeek-R1 本地运行）
  - **Google Gemini API**（Gemini 2.5 Flash / Pro，支持联网搜索）
  - **Cloudflare Workers AI**（Kimi-k2.6、GLM-4.7-Flash、GPT-OSS、Flux 生图等）
- 🔐 **管理员面板与自定义 API**：
  - 增加管理员登录面板（基于 `APP_PASSWORD` 环境变量认证）。
  - **自定义 API 管理区**（仅管理员可见）：支持动态添加任何 OpenAI 兼容的 API（SiliconFlow、OpenRouter、OneAPI、NewAPI 等），自由输入 Base URL、API Key 与 Model ID，即刻在模型列表中切换。
- 💻 **AI 编程与 Git 仓库站连接**：
  - 顶部实时显示当前编程的 `仓库名称 @ 分支`。
  - 支持 **GitHub OAuth 跳转授权** 与 **Personal Access Token (PAT)** 直连两种方案。
  - 支持在线浏览仓库目录、读取文件并加载进 AI 对话上下文。
  - 支持直接在网页内提交代码并 **Push 推送到指定分支**。
- 🎙️ **语音对话**：
  - 输入框支持麦克风语音输入（Speech-to-Text 录音转文字）。
  - AI 回复支持语音朗读（Text-to-Speech 语音合成播放与暂停）。
- 📦 **压缩包与图片上传/下载**：
  - 支持上传 `.zip` 项目代码压缩包，自动解压提取全部源码供 AI 分析重构。
  - 支持将 AI 生成的代码一键打包为 `.zip` 压缩包下载到本地。
  - 支持图片拖拽/粘贴/上传识图与生成图片本地保存。
- 🌐 **多平台部署支持**：
  - Cloudflare Pages / Workers
  - Vercel
  - Docker / Docker Compose
  - Netlify
  - Zeabur / Railway / Render / Sealos / 宝塔面板

---

## 🚀 部署详细指南

### 1. Cloudflare Pages 部署 (推荐)

1. Fork 本仓库到您的 GitHub 账号。
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，进入 **Workers 和 Pages** -> **创建应用程序** -> **Pages** -> **连接到 Git**。
3. 选择 Fork 的仓库：
   - **项目名称**：`cloudflare-ai-web`
   - **生产分支**：`main`
   - **框架预设**：`Next.js`
   - **构建命令**：`npx @cloudflare/next-on-pages@1` 或 `bun run build`
   - **构建输出目录**：`.vercel/output/static`
4. 在 **环境变量 (Environment Variables)** 中添加以下变量：
   - `APP_PASSWORD`：管理员密码
   - `CF_ACCOUNT_ID`：Cloudflare 账户 ID
   - `CF_WORKERS_AI_TOKEN`：Cloudflare Workers AI Token
   - （可选）`DEEPSEEK_API_KEY`、`GROQ_API_KEY`、`GOOGLE_API_KEY` 等
5. 点击 **保存并部署**，完成后即可通过生成的 Pages 域名访问！

---

### 2. Vercel 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FJazee6%2Fcloudflare-ai-web)

1. 点击上方按钮进入 Vercel 导入流程。
2. 填写环境变量（如 `APP_PASSWORD`、`CF_ACCOUNT_ID` 等）。
3. 点击 **Deploy**，部署即刻完成。

---

### 3. Docker & Docker Compose 部署

#### 使用 Docker Compose (推荐)
1. 复制仓库中的 `docker-compose.yml`：
```bash
docker compose up -d
```

#### 使用 Docker CLI
```bash
docker run -d --name cloudflare-ai-web \
  -e APP_PASSWORD=your_admin_password \
  -e CF_ACCOUNT_ID=YOUR_CF_ACCOUNT_ID \
  -e CF_WORKERS_AI_TOKEN=YOUR_CF_WORKERS_AI_TOKEN \
  -e DEEPSEEK_API_KEY=YOUR_DEEPSEEK_API_KEY \
  -e GROQ_API_KEY=YOUR_GROQ_API_KEY \
  -p 3000:3000 \
  --restart=always \
  jazee6/cloudflare-ai-web
```

---

### 4. Netlify 部署
1. 仓库已内置 `netlify.toml`。
2. 在 Netlify Dashboard 中选择 **Import from Git**。
3. 在 Environment Variables 中填入相关密钥，触发构建即可。

---

### 5. Zeabur / Railway / Render 部署
- **Zeabur**：新建服务 -> 从 GitHub 仓库部署，Zeabur 会自动识别 Next.js 并运行。
- **Railway**：New Project -> Deploy from GitHub Repo -> 添加环境变量即可。
- **Render**：New Web Service -> 连接 GitHub 仓库 -> Build Command: `bun install && bun run build` -> Start Command: `bun run start`。

---

## 🔑 环境变量清单

| 变量名 | 描述 | 是否必填 |
|---|---|---|
| `APP_PASSWORD` | 管理员访问密码（登录面板凭证） | 推荐设置 |
| `CF_ACCOUNT_ID` | Cloudflare 账户 ID | 使用 Workers AI 时必填 |
| `CF_WORKERS_AI_TOKEN` | Cloudflare Workers AI Token | 使用 Workers AI 时必填 |
| `DEEPSEEK_API_KEY` | DeepSeek 官方 API Key (`sk-...`) | 可选 |
| `GROQ_API_KEY` | Groq API Key (`gsk_...`) | 可选 |
| `GOOGLE_API_KEY` | Google Gemini API Key | 可选 |
| `OLLAMA_BASE_URL` | Ollama 服务地址（默认 `http://127.0.0.1:11434`） | 可选 |
| `GITHUB_CLIENT_ID` | GitHub OAuth 客户端 ID | 使用 OAuth 授权时必填 |
| `GITHUB_CLIENT_SECRET`| GitHub OAuth 客户端密钥 | 使用 OAuth 授权时必填 |

---

## 📖 使用详细指南

### 1. 管理员登录与自定义 API 管理
1. 点击左侧边栏底部的 **登录图标** 或 **设置齿轮**。
2. 在弹出面板输入您设置的 `APP_PASSWORD` 即可登入。
3. 登入后点击齿轮进入 **管理员设置**：
   - **添加自定义 API**：输入名称、模型 ID、Base URL（例如 `https://api.siliconflow.cn/v1`）及密钥，点击添加。
   - 所有自定义添加的模型会立即进入对话框的模型选择器中！
   - 支持随时管理或删除已有自定义端点。

### 2. 连接 GitHub 仓库与在线编程
1. 对话页面顶部设有 **仓库信息栏**。
2. 点击 **Connect Repo**：
   - 方式 A：点击 **Connect via OAuth** 弹窗授权。
   - 方式 B：在管理员设置中输入您的 GitHub Personal Access Token (PAT)。
3. 授权后点击 **Refresh Repos**，选择目标仓库及分支。
4. 点击文件列表即可将仓库文件内容一键带入对话中，由 AI 协助修改或重构。
5. 编写完成后，点击顶部 **Push Code**，填写修改文件路径与 Commit 信息，一键推送至分支。

### 3. 上传与下载压缩包 (.zip)
- **上传代码库**：点击输入框底部的 **回形针图标**，选择任何 `.zip` 压缩包，系统会自动读取代码文件并整理成上下文注入输入框。
- **打包下载**：AI 回复代码片段后，回复框右上角提供 **下载压缩包图标**，点击即可将代码打包下载到本地。

### 4. 语音对话
- 点击输入框右下角 **麦克风图标** 开始说话，浏览器会自动将语音实时转写为文字。
- AI 输出回复后，点击右上角 **喇叭图标** 即可朗读回复内容。
