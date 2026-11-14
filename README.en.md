# Cloudflare AI Web

[中文](./README.md) ｜ English

![readme.png](https://github.com/user-attachments/assets/e1c4e604-568d-4778-8780-29473619744f)

A modern, responsive, zero-build-error multi-model AI coding and conversation platform with full Cloudflare Pages support, OpenAI integration, and one-click deployment across various cloud platforms.

---

## 🌟 Key Features

- ⚡ **100% Seamless Cloudflare Pages Git Deployment**:
  - Full static export with Pages Functions edge fallback, ready with `wrangler.jsonc` and `public/_redirects` / `public/_headers`.
- 🤖 **Comprehensive AI Models Catalog (Free/Paid Badges & Real Status Probing)**:
  - Full Cloudflare Workers AI model suite (ranked #1), Native OpenAI API option, Groq high-speed LPU, DeepSeek V3/R1, Google Gemini, local Ollama, and unlimited custom OpenAI-compatible endpoints.
  - Real-time network probe status lights (🟢 Online, 🟡 Needs Key / Probing, 🔴 Offline).
- 📱 **Mobile Touch Responsive & Themes**:
  - Optimized for mobile with swipe drawer model picker, full touch inputs, and 5 custom color schemes (OLED Black, Cyber Dark, Light, Tech Purple, Aurora Cyan).
- 🇨🇳 / 🇺🇸 **Instant Bilingual Toggle**:
  - Chinese and English UI with instant reactivity in sidebar.
- 🔗 **Git Multi-platform Integration (GitHub / Gitee / GitLab)**:
  - Header status bar displaying current connected repository and branch.
  - Read files directly into conversation context, web commit & push with timestamp, and disconnect option.
- ⏰ **Timestamps & Message Deletion**:
  - Accurate timestamp tracking per message and single-message deletion.
- 🎙️ **Voice Chat (STT & TTS) & 📦 Zip File Import/Export**:
  - Microphone voice transcription and AI audio readout.
  - Extract uploaded `.zip` repositories directly into prompt context; download generated code blocks as `.zip`.
- 🔐 **Admin Key Management & Custom API Hub**:
  - Password protected (`APP_PASSWORD`) admin dialog to configure OpenAI keys, Cloudflare tokens, and custom endpoints.

---

## 🚀 Deployment Guide

### 1. Cloudflare Pages (Recommended)

1. Fork this repository to your GitHub / Gitee / GitLab account.
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) -> **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Select your repository:
   - **Framework preset**: None
   - **Build command**: `npm run build`
   - **Build output directory**: `out`
4. Deploy and enjoy!

### 2. Docker / Docker Compose

```bash
docker compose up -d
```

---

## 🔑 Platform API Keys & Documentation

Open the **Settings Dialog** (gear icon) in the bottom left corner:

1. **OpenAI Native API**:
   - Get API Key: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Base URL defaults to `https://api.openai.com/v1`, supports custom reverse proxies.
   - Supports GPT-4o, GPT-4o Mini, o1, and o3-mini.
2. **Cloudflare Workers AI**:
   - Zero configuration needed when deployed on Cloudflare Pages with AI binding, or configure Account ID & Token.
3. **Groq**:
   - Free API keys at [https://console.groq.com/keys](https://console.groq.com/keys)
4. **DeepSeek**:
   - API keys at [https://platform.deepseek.com/](https://platform.deepseek.com/)
5. **Google Gemini**:
   - Free API keys at [https://aistudio.google.com/](https://aistudio.google.com/)
6. **Local Ollama**:
   - Run `ollama run qwen2.5-coder` locally and enter `http://127.0.0.1:11434/v1`.
7. **Custom Endpoints**:
   - Add SiliconFlow, OpenRouter, OneAPI, or self-hosted vLLM endpoints with model name, base URL, and key.
