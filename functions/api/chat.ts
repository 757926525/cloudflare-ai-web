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

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
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
    return errorResponse("Invalid JSON request body.", 400);
  }

  const { messages, model, provider, search } = body;
  if (!Array.isArray(messages) || typeof model !== "string") {
    return errorResponse("Request must include messages and a model.", 400);
  }

  try {
    const [googleSdk, gatewaySdk, workersSdk, aiSdk] = await Promise.all([
      import("@ai-sdk/google"),
      import("ai-gateway-provider"),
      import("workers-ai-provider"),
      import("ai"),
    ]);

    let languageModel;
    const tools = {};

    if (provider === "google") {
      if (!env.GOOGLE_API_KEY) {
        return errorResponse("GOOGLE_API_KEY is not configured.", 503);
      }
      const google = googleSdk.createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY });
      languageModel = google.chat(model);
      if (search) Object.assign(tools, { google_search: google.tools.googleSearch({}) });
      if (env.CF_ACCOUNT_ID && env.CF_AI_GATEWAY_NAME) {
        const gateway = gatewaySdk.createAiGateway({
          accountId: env.CF_ACCOUNT_ID,
          gateway: env.CF_AI_GATEWAY_NAME,
          apiKey: env.CF_AI_GATEWAY_TOKEN,
        });
        languageModel = gateway(languageModel);
      }
    } else if (provider === "workers-ai") {
      if (!env.CF_ACCOUNT_ID || !env.CF_WORKERS_AI_TOKEN) {
        return errorResponse("Workers AI credentials are not configured.", 503);
      }
      const workersai = workersSdk.createWorkersAI({
        accountId: env.CF_ACCOUNT_ID,
        apiKey: env.CF_WORKERS_AI_TOKEN,
      });
      languageModel = aiSdk.wrapLanguageModel({
        model: workersai.chat(model),
        middleware: aiSdk.extractReasoningMiddleware({
          tagName: "think",
          startWithReasoning: model === "@cf/qwen/qwq-32b",
        }),
      });
    } else {
      return errorResponse("Unsupported model provider.", 400);
    }

    const result = aiSdk.streamText({
      model: languageModel,
      messages: await aiSdk.convertToModelMessages(messages as never),
      system: "You are a helpful assistant. Follow the user's instructions carefully. Respond using Markdown.",
      tools,
      stopWhen: aiSdk.stepCountIs(5),
    });
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Pages chat function failed:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Unknown model error.",
      502,
    );
  }
}
