import type { LanguageModelV3 } from "@ai-sdk/provider";
import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  extractReasoningMiddleware,
  stepCountIs,
  streamText,
  wrapLanguageModel,
} from "ai";
import { aigateway, deepseek, google, groq, ollama, workersai } from "@/app/api";
import type { Message } from "@/lib/db";
import type { ModelProvider } from "@/lib/models";
import { executeCode } from "ai-sdk-tool-code-execution";

interface Data {
  messages: Message[];
  model: string;
  provider: ModelProvider;
  search?: boolean;
  customConfig?: {
    baseUrl: string;
    apiKey: string;
    modelId: string;
  };
}

export async function POST(request: Request) {
  const { messages, model, provider, search, customConfig } = (await request.json()) as Data;

  let providerModel: LanguageModelV3;
  const tools = {};

  switch (provider) {
    case "deepseek": {
      // If client provides key or server env
      const clientApiKey = request.headers.get("X-DeepSeek-Api-Key");
      const clientBaseUrl = request.headers.get("X-DeepSeek-Base-Url");
      const dsInstance =
        clientApiKey || clientBaseUrl
          ? createOpenAI({
              baseURL: clientBaseUrl || "https://api.deepseek.com/v1",
              apiKey: clientApiKey || process.env.DEEPSEEK_API_KEY || "",
            })
          : deepseek;

      providerModel = wrapLanguageModel({
        model: dsInstance.chat(model) as unknown as LanguageModelV3,
        middleware: extractReasoningMiddleware({
          tagName: "think",
          startWithReasoning: model === "deepseek-reasoner",
        }),
      });
      break;
    }

    case "groq": {
      const clientApiKey = request.headers.get("X-Groq-Api-Key");
      const groqInstance = clientApiKey
        ? createOpenAI({
            baseURL: "https://api.groq.com/openai/v1",
            apiKey: clientApiKey,
          })
        : groq;

      providerModel = wrapLanguageModel({
        model: groqInstance.chat(model) as unknown as LanguageModelV3,
        middleware: extractReasoningMiddleware({
          tagName: "think",
          startWithReasoning: model.includes("r1"),
        }),
      });
      break;
    }

    case "ollama": {
      const clientBaseUrl = request.headers.get("X-Ollama-Base-Url");
      const ollamaInstance = clientBaseUrl
        ? createOpenAI({
            baseURL: clientBaseUrl.replace(/\/$/, "") + "/v1",
            apiKey: "ollama",
          })
        : ollama;

      providerModel = ollamaInstance.chat(model) as unknown as LanguageModelV3;
      break;
    }

    case "custom": {
      if (!customConfig?.baseUrl) {
        return new Response("Missing custom API configuration (baseUrl)", { status: 400 });
      }
      const customProvider = createOpenAI({
        baseURL: customConfig.baseUrl,
        apiKey: customConfig.apiKey || "dummy",
      });
      providerModel = wrapLanguageModel({
        model: customProvider.chat(customConfig.modelId || model) as unknown as LanguageModelV3,
        middleware: extractReasoningMiddleware({
          tagName: "think",
        }),
      });
      break;
    }

    case "google": {
      if (process.env.CF_AI_GATEWAY_NAME && process.env.CF_ACCOUNT_ID) {
        providerModel = aigateway([google.chat(model)]);
      } else {
        providerModel = google.chat(model) as unknown as LanguageModelV3;
      }

      Object.assign(tools, {
        ...(search ? { google_search: google.tools.googleSearch({}) } : {}),
      });
      break;
    }

    case "workers-ai":
    default: {
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
    }
  }

  const result = streamText({
    model: providerModel,
    messages: await convertToModelMessages(messages),
    system:
      "You are an expert full-stack developer and helpful AI assistant. When the user asks for programming help or repository modifications, write clean, production-ready code with clear explanations. Respond using Markdown.",
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
