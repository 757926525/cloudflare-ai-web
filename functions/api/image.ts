function toImageResponse(response: Response) {
  return new Response(response.body, {
    headers: {
      "Content-Type": "image/png",
    },
  });
}

export async function onRequestPost({ request, env }: { request: Request; env: any }) {
  const body = (await request.json()) as {
    prompt?: string;
    model?: string;
  };

  const { prompt, model } = body;

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

  const supportedFluxModels = new Set([
    "@cf/black-forest-labs/flux-1-schnell",
    "@cf/leonardo/lucid-origin",
  ]);

  if (supportedFluxModels.has(model)) {
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

  return toImageResponse(response);
}
