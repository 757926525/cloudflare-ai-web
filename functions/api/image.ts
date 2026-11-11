export const onRequest: PagesFunction<{
  AI: any;
  CF_ACCOUNT_ID?: string;
  CF_WORKERS_AI_TOKEN?: string;
  APP_PASSWORD?: string;
}> = async (context) => {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-App-Password, X-CF-Account, X-CF-Token",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const data: any = await request.json();
    const { prompt, model = "@cf/black-forest-labs/flux-1-schnell" } = data;

    // Check optional access password
    const authHeader = request.headers.get("X-App-Password");
    if (env.APP_PASSWORD && authHeader !== env.APP_PASSWORD) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // 1. Direct env.AI run if Workers AI binding is attached
    if (env.AI) {
      const imageBlob = await env.AI.run(model, { prompt });
      return new Response(imageBlob, {
        headers: {
          "Content-Type": "image/png",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 2. Fallback via Account ID & Token
    const accountId =
      request.headers.get("X-CF-Account") ||
      data.cfAccountId ||
      env.CF_ACCOUNT_ID;
    const token =
      request.headers.get("X-CF-Token") ||
      data.cfToken ||
      env.CF_WORKERS_AI_TOKEN;

    if (!accountId || !token) {
      return new Response(
        JSON.stringify({ error: "Cloudflare Workers AI credentials missing." }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      }
    );

    return new Response(cfRes.body, {
      status: cfRes.status,
      headers: {
        "Content-Type": cfRes.headers.get("Content-Type") || "image/png",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Failed to generate image" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
};
