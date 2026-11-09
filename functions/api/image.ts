export async function onRequestPost({ request, env }) {
  const body = (await request.json()) as {
    prompt?: string;
    model?: string;
  };

  const prompt = body.prompt;
  const model = body.model;

  if (!prompt || !model) {
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
    return new Response("Error generating image", { status: 500 });
  }

  const imageModels = new Set([
    "@cf/lykon/dreamshaper-8-lcm",
    "@cf/bytedance/stable-diffusion-xl-lightning",
    "@cf/black-forest-labs/flux-1-schnell",
    "@cf/leonardo/lucid-origin",
  ]);

  if (!imageModels.has(model)) {
    return new Response("Unsupported image model", { status: 400 });
  }

  if (
    model === "@cf/black-forest-labs/flux-1-schnell" ||
    model === "@cf/leonardo/lucid-origin"
  ) {
    const data = (await response.json()) as {
      result?: { image?: string };
    };

    const base64 = data.result?.image;
    if (!base64) {
      return new Response("Invalid image response", { status: 500 });
    }

    const binaryString = atob(base64);
    const bytes = Uint8Array.from(binaryString, (char) => char.codePointAt(0) ?? 0);
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/png",
      },
    });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "image/png",
    },
  });
}
