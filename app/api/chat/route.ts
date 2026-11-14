import type { LanguageModelV3 } from "@ai-sdk/provider";
import {
  convertToModelMessages,
  extractReasoningMiddleware,
  stepCountIs,
  streamText,
  wrapLanguageModel,
} from "ai";
import { aigateway, google, workersai } from "@/app/api";
import type { Message } from "@/lib/db";
import type { Model } from "@/lib/models";
import { models } from "@/lib/models";
import { executeCode } from "ai-sdk-tool-code-execution";

interface Data {
  messages: Message[];
  model: Model["id"];
  provider: Model["provider"];
  search?: boolean;
}

const jsonError = (message: string, status: number) =>
  Response.json({ error: message }, { status });

export async function POST(request: Request) {
  let data: Data;
  try {
    data = (await request.json()) as Data;
  } catch {
    return jsonError("Invalid JSON request body.", 400);
  }

  const { messages, model, provider, search } = data;
  if (!Array.isArray(messages) || typeof model !== "string") {
    return jsonError("Request must include messages and a model.", 400);
  }

  const selectedModel = models.find(
    (item) => item.id === model && item.provider === provider,
  );
  if (!selectedModel || selectedModel.type !== "Text Generation") {
    return jsonError("The selected model or provider is not supported.", 400);
  }

  let providerModel: LanguageModelV3;
  const tools: Record<string, unknown> = {};
  switch (provider) {
    case "google":
      if (!aigateway || !google) {
        return jsonError(
          "Google models require CF_ACCOUNT_ID, CF_AI_GATEWAY_NAME, and GOOGLE_API_KEY. Configure them and redeploy.",
          503,
        );
      }
      providerModel = aigateway(google.chat(model));
      if (search) {
        Object.assign(tools, {
          google_search: google.tools.googleSearch({}),
        });
      }
      break;
    case "workers-ai":
      if (!workersai) {
        return jsonError(
          "Workers AI requires CF_ACCOUNT_ID and CF_WORKERS_AI_TOKEN. Configure them and redeploy.",
          503,
        );
      }
      providerModel = wrapLanguageModel({
        model: workersai.chat(model),
        middleware: extractReasoningMiddleware({
          tagName: "think",
          startWithReasoning: model === "@cf/qwen/qwq-32b",
        }),
      });

      if (process.env.VERCEL_OIDC_TOKEN) {
        Object.assign(tools, {
          executeCode: executeCode(),
        });
      }
      break;
    default:
      return jsonError("The selected model provider is not supported.", 400);
  }

  try {
    const result = streamText({
      model: providerModel,
      messages: await convertToModelMessages(messages),
      system:
        "You are a helpful assistant. Follow the user's instructions carefully. Respond using Markdown.",
      tools,
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat model request failed:", error);
    const message = error instanceof Error ? error.message : "Unknown model error.";
    return jsonError(`Model request failed: ${message}`, 502);
  }
}
