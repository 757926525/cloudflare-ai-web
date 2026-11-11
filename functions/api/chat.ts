export const onRequest: PagesFunction<{
  AI: any;
  CF_ACCOUNT_ID?: string;
  CF_WORKERS_AI_TOKEN?: string;
  APP_PASSWORD?: string;
  DEEPSEEK_API_KEY?: string;
  GROQ_API_KEY?: string;
  GOOGLE_API_KEY?: string;
}> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-App-Password, X-CF-Account, X-CF-Token",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const data: any = await request.json();
    const { model, messages, provider, baseUrl, apiKey, stream = true } = data;

    // Check optional access password if configured in environment
    const authHeader = request.headers.get("X-App-Password");
    if (env.APP_PASSWORD && authHeader !== env.APP_PASSWORD) {
      return new Response(JSON.stringify({ error: "Unauthorized. Please enter APP_PASSWORD in settings." }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // 1. Direct Cloudflare Workers AI execution via env.AI binding (Zero API key required on Pages!)
    if (provider === "workers-ai" && env.AI) {
      try {
        const aiResponse: any = await env.AI.run(model || "@cf/meta/llama-3.1-8b-instruct", {
          messages: messages || [],
          stream: true,
        });

        return new Response(aiResponse, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (err: any) {
        // Fallback to REST API if binding call fails
      }
    }

    // 2. Cloudflare Workers AI via Account ID & Token (from headers, request body, or env)
    if (provider === "workers-ai") {
      const accountId =
        request.headers.get("X-CF-Account") ||
        data.cfAccountId ||
        env.CF_ACCOUNT_ID;
      const token =
        request.headers.get("X-CF-Token") ||
        apiKey ||
        env.CF_WORKERS_AI_TOKEN;

      if (!accountId || !token) {
        return new Response(
          JSON.stringify({
            error: "未配置 Cloudflare Workers AI 凭证。请在设置中配置 CF_ACCOUNT_ID 与 CF_WORKERS_AI_TOKEN，或在 Pages 中绑定 Workers AI。",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          }
        );
      }

      const cfEndpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
      const cfRes = await fetch(cfEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
        }),
      });

      return new Response(cfRes.body, {
        status: cfRes.status,
        headers: {
          "Content-Type": cfRes.headers.get("Content-Type") || "text/event-stream",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 3. Groq API
    if (provider === "groq") {
      const gKey = apiKey || env.GROQ_API_KEY;
      if (!gKey) {
        return new Response(JSON.stringify({ error: "请在设置中配置 Groq API Key" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
        }),
      });

      return new Response(groqRes.body, {
        status: groqRes.status,
        headers: {
          "Content-Type": groqRes.headers.get("Content-Type") || "text/event-stream",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 4. DeepSeek 官方 API
    if (provider === "deepseek") {
      const dKey = apiKey || env.DEEPSEEK_API_KEY;
      if (!dKey) {
        return new Response(JSON.stringify({ error: "请在设置中配置 DeepSeek API Key" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      const dsRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
        }),
      });

      return new Response(dsRes.body, {
        status: dsRes.status,
        headers: {
          "Content-Type": dsRes.headers.get("Content-Type") || "text/event-stream",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 5. Custom OpenAI-compatible or other endpoints
    const targetUrl = (baseUrl || "https://api.openai.com/v1").replace(/\/$/, "") + "/chat/completions";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const proxyRes = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        stream,
      }),
    });

    return new Response(proxyRes.body, {
      status: proxyRes.status,
      headers: {
        "Content-Type": proxyRes.headers.get("Content-Type") || "text/event-stream",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
};
