# Cloudflare AI Web (Multi-Platform & Full AI Engineering Suite)

[中文](./README.md) ｜ English

![readme.png](https://github.com/user-attachments/assets/e1c4e604-568d-4778-8780-29473619744f)

A modern full-featured AI Web platform supporting multi-model aggregation, AI coding assistant, voice dialogue, two-way Git repository synchronization, and multi-platform deployment.

---

## 🌟 Key Features

- 🚀 **Comprehensive Model Providers**:
  - **DeepSeek Official API** (DeepSeek-V3, DeepSeek-R1 reasoning)
  - **Groq Free Fast Inference** (Llama-3.3-70B, DeepSeek-R1-Distill-70B)
  - **Local/Remote Ollama** (Qwen 2.5 Coder, DeepSeek-R1 local)
  - **Google Gemini API** (Gemini 2.5 Flash / Pro, web search integration)
  - **Cloudflare Workers AI** (Kimi-k2.6, GLM-4.7-Flash, GPT-OSS, Flux image generation, etc.)
- 🔐 **Admin Login Panel & Custom APIs**:
  - Built-in admin authentication panel powered by the `APP_PASSWORD` environment variable.
  - **Custom API Management** (Admin Only): Dynamically add any OpenAI-compatible API (SiliconFlow, OpenRouter, OneAPI, etc.) with custom Base URL, API Key, and Model ID. Custom endpoints immediately appear in the model selector.
- 💻 **AI Coding & Git Repository Synchronization**:
  - Active `repo @ branch` displayed on top of the chat page.
  - Supports both **GitHub OAuth redirect authorization** and **Personal Access Token (PAT)** direct authentication.
  - Browse repository file tree, read files into the AI conversation context.
  - Write, review, and **Push commits directly to target branches**.
- 🎙️ **Voice Conversation**:
  - Microphone speech-to-text input in the chat box.
  - Text-to-speech voice playback for assistant replies.
- 📦 **Zip Archive & Image Upload / Download**:
  - Upload `.zip` archives with automatic extraction of project source files for AI code review and refactoring.
  - Export and download AI-generated code snippets as a `.zip` file with one click.
  - Vision image upload and image generation local save.
- 🌐 **Multi-Platform Deployments**:
  - Cloudflare Pages / Workers
  - Vercel
  - Docker / Docker Compose
  - Netlify
  - Zeabur / Railway / Render / Sealos

---

## 🚀 Deployment Guide

### 1. Cloudflare Pages Deployment (Recommended)

1. Fork this repository to your GitHub account.
2. In the [Cloudflare Dashboard](https://dash.cloudflare.com/), go to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Select your forked repository:
   - **Project Name**: `cloudflare-ai-web`
   - **Production Branch**: `main`
   - **Framework Preset**: `None` or `Next.js`
   - **Build Command**: `npm run build:cf` or `bun run build:cf`
   - **Build Output Directory**: `.open-next/assets`
4. In **Environment Variables**, add:
   - `APP_PASSWORD`: Admin password
   - `CF_ACCOUNT_ID`: Cloudflare Account ID
   - `CF_WORKERS_AI_TOKEN`: Workers AI API Token
   - (Optional) `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `GOOGLE_API_KEY`, etc.
5. Click **Save and Deploy**.

---

### 2. Vercel Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FJazee6%2Fcloudflare-ai-web)

1. Click the button above to import into Vercel.
2. Fill in the desired environment variables.
3. Click **Deploy**.

---

### 3. Docker & Docker Compose Deployment

#### Using Docker Compose
```bash
docker compose up -d
```

#### Using Docker CLI
```bash
docker run -d --name cloudflare-ai-web \
  -e APP_PASSWORD=your_admin_password \
  -e CF_ACCOUNT_ID=YOUR_CF_ACCOUNT_ID \
  -e CF_WORKERS_AI_TOKEN=YOUR_CF_WORKERS_AI_TOKEN \
  -e DEEPSEEK_API_KEY=YOUR_DEEPSEEK_API_KEY \
  -p 3000:3000 \
  --restart=always \
  jazee6/cloudflare-ai-web
```

---

## 🔑 Environment Variables

| Variable | Description | Required |
|---|---|---|
| `APP_PASSWORD` | Administrator password for settings & login | Recommended |
| `CF_ACCOUNT_ID` | Cloudflare Account ID | Required for Workers AI |
| `CF_WORKERS_AI_TOKEN` | Workers AI Token | Required for Workers AI |
| `DEEPSEEK_API_KEY` | DeepSeek Official API Key | Optional |
| `GROQ_API_KEY` | Groq API Key | Optional |
| `GOOGLE_API_KEY` | Google Gemini API Key | Optional |
| `OLLAMA_BASE_URL` | Ollama URL (default: `http://127.0.0.1:11434`) | Optional |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | Optional |
| `GITHUB_CLIENT_SECRET`| GitHub OAuth App Client Secret | Optional |

---

## 📖 User Guide

### 1. Admin Login & Adding Custom APIs
1. Click the **Login icon** or **Settings Gear** at the bottom of the sidebar.
2. Enter the password configured in `APP_PASSWORD`.
3. Open Admin Settings to add custom OpenAI-compatible endpoints with Base URL and Key. The newly added model will immediately appear in the model selection list.

### 2. Connect GitHub Repository & AI Coding
1. Look at the **Repository Bar** at the top of the chat page.
2. Click **Connect Repo** (supports OAuth popup or direct Personal Access Token input).
3. Select your repository and switch branches.
4. Click on any file to load it into the conversation context for AI assistance.
5. Click **Push Code** to commit and push changes directly to your GitHub branch.

### 3. Zip File Upload & Download
- Upload `.zip` archives via the attachment icon; all source files will be extracted and formatted into the prompt.
- Export assistant code outputs into a downloadable `.zip` file using the zip button on assistant messages.

### 4. Voice Interaction
- Use the **Microphone** button to speak; your speech will be transcribed in real time.
- Click the **Speaker** icon on assistant responses to have them read aloud.
