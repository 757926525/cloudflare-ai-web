interface PagesEnv {
  CF_ACCOUNT_ID?: string;
  CF_WORKERS_AI_TOKEN?: string;
}

interface PagesContext {
  request: Request;
  env: PagesEnv;
}

const IMAGE_MODELS = new Set([
  "@cf/lykon/dreamshaper-8-lcm",
  "@cf/bytedance/stable-diffusion-xl-lightning",
  "@cf/black-forest-labs/flux-1-schnell",
  "@cf/leonardo/lucid-origin",
]);

export async function onRequestPost({ request, env }: PagesContext) {
  if (!env.CF_ACCOUNT_ID || !env.CF_WORKERS_AI_TOKEN) {
    return new Response("Cloudflare Workers AI credentials are not configured", { status: 503 });
  }

  let body: { prompt?: unknown; model?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { prompt, model } = body;
  if (typeof prompt !== "string" || !prompt.trim() || typeof model !== "string" || !IMAGE_MODELS.has(model)) {
    return new Response("Invalid request data", { status: 400 });
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_WORKERS_AI_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    },
  );

  if (!response.ok) {
    return new Response("Error generating image", { status: 502 });
  }

  if (model === "@cf/black-forest-labs/flux-1-schnell" || model === "@cf/leonardo/lucid-origin") {
    const data = (await response.json()) as { result?: { image?: string } };
    if (!data.result?.image) {
      return new Response("Invalid image response", { status: 502 });
    }
    const binary = atob(data.result.image);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new Response(bytes, { headers: { "Content-Type": "image/png" } });
  }

  return new Response(response.body, {
    headers: { "Content-Type": "image/png" },
  });
}
