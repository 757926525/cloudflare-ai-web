# Cloudflare AI Web (Universal AI Platform)

[中文](./README.md) | English

![readme.png](https://github.com/user-attachments/assets/e1c4e604-568d-4778-8780-29473619744f)

A modern, mobile-responsive, zero-build-error AI coding and multi-model conversation web application. Supports seamless deployment on **Cloudflare Pages**, **Vercel**, **Docker / Docker Compose**, **Netlify**, **Zeabur**, and more.

---

## 🌟 Key Features

- ⚡ **100% Reliable Cloudflare Pages Deployment**:
  - Pre-configured `wrangler.jsonc`, `public/_redirects`, and `public/_headers`. Instant edge CDN build with zero runtime errors.
- 📱 **Mobile Touch Responsive UI**:
  - Full mobile screen support: touch-friendly drawer for model selection, collapsible sidebar, responsive chat input and repository bar.
- 🌐 **Real-Time Model Health Indicator Light**:
  - Visual status indicator next to each model:
    - 🟢 **Green**: Connected & ready to stream
    - 🟡 **Yellow**: Checking connection
    - 🔴 **Red**: Missing API key or unreachable
- 🇨🇳 / 🇺🇸 **Instant Bilingual Toggle (CN/EN)**:
  - One-click language switch at the bottom of the sidebar with immediate reactive UI translation.
- 🔗 **Multi-Git Provider Sync (GitHub / Gitee / GitLab)**:
  - Active repository and branch indicator header.
  - Persistent connection state with disconnect ability.
  - Online file reader directly injects file contents into prompt context.
  - Commit & push file changes directly from browser back to your repo.
- ⏰ **Message & File Timestamps**:
  - Exact timestamps on all chat messages and repository sync actions.
  - Individual message deletion and full session reset.
- 🎙️ **Voice Chat & 📦 Zip Upload/Download**:
  - Microphone voice-to-text recording and AI speech playback.
  - Direct `.zip` file extraction into project context.
  - One-click code generation export as a downloadable `.zip` bundle.
- 🔐 **Admin Panel for Custom APIs**:
  - Password-protected (`APP_PASSWORD`) API manager.
  - Dynamically add, edit, or remove any OpenAI-compatible API endpoint (e.g. OpenRouter, SiliconFlow, vLLM).

---

## 🚀 Deployment Guide

### 1. Cloudflare Pages Deployment (Recommended, 100% Guaranteed)

1. Fork this repository to your GitHub account.
2. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/), navigate to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Select your forked repository and configure:
   - **Project Name**: `cloudflare-ai-web`
   - **Production branch**: `main`
   - **Framework preset**: **None**
   - **Build command**: `npm run build:pages`
   - **Build output directory**: `out`
4. (Optional) Set environment variables (e.g. `APP_PASSWORD`).
5. Click **Save and Deploy**. Your site will be online in seconds!

---

### 2. Docker / Docker Compose

#### Option A: Docker Compose

```bash
docker compose up -d
```

#### Option B: Docker CLI

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

### 3. Vercel / Netlify / Zeabur

- **Vercel**: Import Git repository, framework preset Next.js, default build command `npm run build`.
- **Netlify**: Pre-configured `netlify.toml` with publish directory `out`.

---

## 🔑 Model Setup Guide

Click the **Settings (Gear Icon)** in the sidebar to configure your API keys:

- **DeepSeek Official**: [https://platform.deepseek.com/](https://platform.deepseek.com/)
- **Groq Free Inference**: [https://console.groq.com/keys](https://console.groq.com/keys)
- **Google Gemini**: [https://aistudio.google.com/](https://aistudio.google.com/)
- **Local Ollama**: Run `ollama run qwen2.5-coder` and connect via `http://127.0.0.1:11434/v1`
- **Custom OpenAI Endpoint**: Add any OpenAI-compatible provider with custom base URL.
