export interface UniversalModelConfig {
  id: string;
  provider: "openai" | "deepseek" | "groq" | "ollama" | "google" | "workers-ai" | "custom";
  baseUrl?: string;
  apiKey?: string;
  cfAccountId?: string;
}

export async function* streamChatUniversal({
  model,
  messages,
  config,
  onReasoning,
}: {
  model: string;
  messages: { role: string; content: string }[];
  config: UniversalModelConfig;
  onReasoning?: (chunk: string) => void;
}): AsyncGenerator<string, void, unknown> {
  const appPassword = localStorage.getItem("CF_AI_PASSWORD") || "";
  const cfAccountId = config.cfAccountId || localStorage.getItem("CF_ACCOUNT_ID") || "";
  const cfToken = config.apiKey || localStorage.getItem("CF_WORKERS_AI_TOKEN") || "";

  // 1. Google Gemini 官方支持客户端跨域
  if (config.provider === "google") {
    const key = config.apiKey || localStorage.getItem("GOOGLE_API_KEY") || "";
    if (!key) {
      throw new Error("请先在设置中填写 Google Gemini API Key");
    }
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`;
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Google API 请求失败 (${response.status}): ${err.slice(0, 200)}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) yield text;
          } catch {
            // ignore
          }
        }
      }
    }
    return;
  }

  // 2. 本地 Ollama 模式 (用户机器本地直接跨域)
  if (config.provider === "ollama") {
    const baseUrl = (config.baseUrl || localStorage.getItem("OLLAMA_BASE_URL") || "http://127.0.0.1:11434/v1").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true }),
    });
    if (!response.ok) {
      throw new Error(`本地 Ollama 响应错误 (${response.status})，请确认 Ollama 已启动`);
    }
    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const text = json.choices?.[0]?.delta?.content;
            if (text) yield text;
          } catch {
            // ignore
          }
        }
      }
    }
    return;
  }

  // 3. 通用转发：优先尝试 Cloudflare Pages 边缘函数 (/api/chat)
  let response: Response;
  const apiKey =
    config.apiKey ||
    (config.provider === "openai" ? localStorage.getItem("OPENAI_API_KEY") : "") ||
    (config.provider === "deepseek" ? localStorage.getItem("DEEPSEEK_API_KEY") : "") ||
    (config.provider === "groq" ? localStorage.getItem("GROQ_API_KEY") : "") ||
    "";

  const baseUrl =
    config.baseUrl ||
    (config.provider === "openai" ? localStorage.getItem("OPENAI_BASE_URL") || "https://api.openai.com/v1" : "");

  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(appPassword ? { "X-App-Password": appPassword } : {}),
        ...(cfAccountId ? { "X-CF-Account": cfAccountId } : {}),
        ...(cfToken ? { "X-CF-Token": cfToken } : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        provider: config.provider,
        baseUrl,
        apiKey,
        stream: true,
      }),
    });
  } catch {
    // 纯静态环境且无边缘函数时直连端点
    let targetUrl = (baseUrl || "https://api.openai.com/v1").replace(/\/$/, "") + "/chat/completions";
    let authHeader = "";

    if (config.provider === "openai") {
      targetUrl = `${(baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "")}/chat/completions`;
      authHeader = `Bearer ${apiKey}`;
    } else if (config.provider === "deepseek") {
      targetUrl = "https://api.deepseek.com/v1/chat/completions";
      authHeader = `Bearer ${apiKey}`;
    }

    response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({ model, messages, stream: true }),
    });
  }

  if (!response.ok) {
    let errMessage = "";
    try {
      const errJson = await response.json();
      errMessage = errJson.error || errJson.message || "";
    } catch {
      errMessage = await response.text();
    }
    throw new Error(errMessage || `模型调用异常 (${response.status})，请在设置中检查配置`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("无法读取流式响应");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;

      if (trimmed.startsWith("data: ")) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta;
          if (delta?.reasoning_content && onReasoning) {
            onReasoning(delta.reasoning_content);
          }
          if (delta?.content) {
            yield delta.content;
          }
          if (json.response) {
            // Cloudflare Workers AI stream format
            yield json.response;
          }
        } catch {
          // ignore chunk parse
        }
      }
    }
  }
}
