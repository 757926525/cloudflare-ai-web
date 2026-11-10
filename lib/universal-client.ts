export interface UniversalModelConfig {
  id: string;
  provider: "deepseek" | "groq" | "ollama" | "google" | "workers-ai" | "custom";
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
  let endpoint = "";
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  let body: any = {};

  if (config.provider === "google") {
    const key = config.apiKey || localStorage.getItem("GOOGLE_API_KEY") || "";
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`;
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    body = { contents };
  } else if (config.provider === "workers-ai") {
    // Cloudflare Workers AI OpenAI-compatible endpoint
    const accountId = config.cfAccountId || localStorage.getItem("CF_ACCOUNT_ID") || "";
    const token = config.apiKey || localStorage.getItem("CF_WORKERS_AI_TOKEN") || "";
    endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
    headers["Authorization"] = `Bearer ${token}`;
    body = {
      model,
      messages,
      stream: true,
    };
  } else {
    // OpenAI Compatible (DeepSeek, Groq, Ollama, Custom)
    let baseUrl = config.baseUrl;
    let apiKey = config.apiKey || "";

    if (config.provider === "deepseek") {
      baseUrl = baseUrl || "https://api.deepseek.com/v1";
      apiKey = apiKey || localStorage.getItem("DEEPSEEK_API_KEY") || "";
    } else if (config.provider === "groq") {
      baseUrl = baseUrl || "https://api.groq.com/openai/v1";
      apiKey = apiKey || localStorage.getItem("GROQ_API_KEY") || "";
    } else if (config.provider === "ollama") {
      baseUrl = baseUrl || localStorage.getItem("OLLAMA_BASE_URL") || "http://127.0.0.1:11434/v1";
      apiKey = "ollama";
    }

    const resolvedUrl = (baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
    endpoint = `${resolvedUrl}/chat/completions`;
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    body = {
      model,
      messages,
      stream: true,
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText.slice(0, 300)}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Stream not readable");

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
          if (json.candidates?.[0]?.content?.parts?.[0]?.text) {
            yield json.candidates[0].content.parts[0].text;
          }
        } catch {
          // ignore chunk parse
        }
      }
    }
  }
}
