interface PagesEnv {
  CF_ACCOUNT_ID?: string;
  CF_WORKERS_AI_TOKEN?: string;
  CF_AI_GATEWAY_NAME?: string;
  CF_AI_GATEWAY_TOKEN?: string;
  GOOGLE_API_KEY?: string;
  VERCEL_OIDC_TOKEN?: string;
}

interface PagesContext {
  request: Request;
  env: PagesEnv;
}

export async function onRequestPost({ request, env }: PagesContext) {
  let body: {
    messages?: unknown[];
    model?: string;
    provider?: string;
    search?: boolean;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { messages, model, provider, search } = body;
  if (!Array.isArray(messages) || typeof model !== "string") {
    return new Response("Invalid request data", { status: 400 });
  }

  const [
    { createGoogleGenerativeAI },
    { createAiGateway },
    { createWorkersAI },
    { convertToModelMessages, extractReasoningMiddleware, stepCountIs, streamText, wrapLanguageModel },
  ] = await Promise.all([
    import("@ai-sdk/google"),
    import("ai-gateway-provider"),
    import("workers-ai-provider"),
    import("ai"),
  ]);

  const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY });
  const workersai = createWorkersAI({
    accountId: env.CF_ACCOUNT_ID ?? "",
    apiKey: env.CF_WORKERS_AI_TOKEN ?? "",
  });

  let languageModel;
  const tools: Record<string, unknown> = {};

  if (provider === "google") {
    if (!env.GOOGLE_API_KEY) {
      return new Response("GOOGLE_API_KEY is not configured", { status: 503 });
    }

    if (search) {
      Object.assign(tools, { google_search: google.tools.googleSearch({}) });
    }

    if (env.CF_AI_GATEWAY_NAME && env.CF_ACCOUNT_ID) {
      const aigateway = createAiGateway({
        accountId: env.CF_ACCOUNT_ID,
        gateway: env.CF_AI_GATEWAY_NAME,
        apiKey: env.CF_AI_GATEWAY_TOKEN,
      });
      languageModel = aigateway([google.chat(model)]);
    } else {
      languageModel = google.chat(model);
    }
  } else if (provider === "workers-ai" || !provider) {
    if (!env.CF_ACCOUNT_ID || !env.CF_WORKERS_AI_TOKEN) {
      return new Response("Cloudflare Workers AI credentials are not configured", { status: 503 });
    }

    languageModel = wrapLanguageModel({
      model: workersai.chat(model),
      middleware: extractReasoningMiddleware({
        tagName: "think",
        startWithReasoning: model === "@cf/qwen/qwq-32b",
      }),
    });
  } else {
    return new Response("Unsupported provider", { status: 400 });
  }

  const result = streamText({
    model: languageModel,
    messages: await convertToModelMessages(messages as never),
    system: "You are a helpful assistant. Follow the user's instructions carefully. Respond using Markdown.",
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
