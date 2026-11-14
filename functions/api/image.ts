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
    return Response.json({ error: "Workers AI credentials are not configured." }, { status: 503 });
  }

  let body: { prompt?: unknown; model?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const { prompt, model } = body;
  if (typeof prompt !== "string" || !prompt.trim() || typeof model !== "string" || !IMAGE_MODELS.has(model)) {
    return Response.json({ error: "Invalid image prompt or model." }, { status: 400 });
  }

  try {
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
      const details = await response.text();
      console.error("Pages image function failed:", response.status, details);
      return Response.json({ error: "Image generation failed." }, { status: 502 });
    }

    if (model === "@cf/black-forest-labs/flux-1-schnell" || model === "@cf/leonardo/lucid-origin") {
      const data = (await response.json()) as { result?: { image?: string } };
      if (!data.result?.image) {
        return Response.json({ error: "Invalid image response from Workers AI." }, { status: 502 });
      }
      const binary = atob(data.result.image);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new Response(bytes, { headers: { "Content-Type": "image/png" } });
    }

    return new Response(response.body, { headers: { "Content-Type": "image/png" } });
  } catch (error) {
    console.error("Pages image function failed:", error);
    return Response.json({ error: "Image generation request failed." }, { status: 502 });
  }
}
