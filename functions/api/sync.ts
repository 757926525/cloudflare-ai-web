export const onRequest: PagesFunction<{
  CF_AI_KV?: any;
  APP_PASSWORD?: string;
  CF_ACCOUNT_ID?: string;
  CF_WORKERS_AI_TOKEN?: string;
}> = async (context) => {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-App-Password, X-CF-KV-Namespace, X-CF-Account, X-CF-Token",
      },
    });
  }

  // 1. GET: 拉取远程 KV 中保存的会话与历史对话
  if (request.method === "GET") {
    try {
      const url = new URL(request.url);
      const key = url.searchParams.get("key") || "chat_history_backup";

      // 优先从绑定的 CF_AI_KV 读取
      if (env.CF_AI_KV) {
        const value = await env.CF_AI_KV.get(key, "text");
        return new Response(value || "{}", {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // 否则使用 Cloudflare KV REST API 进行代理拉取
      const accountId = request.headers.get("X-CF-Account") || env.CF_ACCOUNT_ID;
      const token = request.headers.get("X-CF-Token") || env.CF_WORKERS_AI_TOKEN;
      const namespaceId = request.headers.get("X-CF-KV-Namespace");

      if (accountId && token && namespaceId) {
        const kvRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${key}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (kvRes.ok) {
          const val = await kvRes.text();
          return new Response(val, {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
      }

      return new Response(JSON.stringify({ sessions: [], messages: [] }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  }

  // 2. POST: 将本地会话与历史对话同步推送保存到 Cloudflare KV 数据库
  if (request.method === "POST") {
    try {
      const data: any = await request.json();
      const { key = "chat_history_backup", payload, kvNamespaceId, cfAccountId, cfToken } = data;

      const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);

      // 直接写入绑定的 CF_AI_KV
      if (env.CF_AI_KV) {
        await env.CF_AI_KV.put(key, payloadStr);
        return new Response(JSON.stringify({ success: true, message: "已成功同步至 Cloudflare KV" }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // REST API 写入 Cloudflare KV
      const accountId = cfAccountId || env.CF_ACCOUNT_ID;
      const token = cfToken || env.CF_WORKERS_AI_TOKEN;
      const namespaceId = kvNamespaceId;

      if (!accountId || !token || !namespaceId) {
        return new Response(
          JSON.stringify({
            error: "未配置 Cloudflare KV 命名空间 ID 或 API 凭证。请在设置中填写 KV 命名空间 ID。",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          }
        );
      }

      const putRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${key}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "text/plain",
          },
          body: payloadStr,
        }
      );

      if (putRes.ok) {
        return new Response(JSON.stringify({ success: true, message: "已成功通过 REST API 同步至 Cloudflare KV" }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } else {
        const errText = await putRes.text();
        return new Response(JSON.stringify({ error: `KV 同步失败 (${putRes.status}): ${errText}` }), {
          status: putRes.status,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
};
