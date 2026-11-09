import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAiGateway } from "ai-gateway-provider";
import { createWorkersAI } from "workers-ai-provider";
import { executeCode } from "ai-sdk-tool-code-execution";
import {
  convertToModelMessages,
  extractReasoningMiddleware,
  stepCountIs,
  streamText,
  wrapLanguageModel,
} from "ai";

function getGoogleClient(env: any) {
  return createGoogleGenerativeAI({
    apiKey: env.GOOGLE_API_KEY,
  });
}

function getAiGatewayClient(env: any) {
  return createAiGateway({
    accountId: env.CF_ACCOUNT_ID,
    gateway: env.CF_AI_GATEWAY_NAME,
    apiKey: env.CF_AI_GATEWAY_TOKEN,
  });
}

function getWorkersAIClient(env: any) {
  return createWorkersAI({
    accountId: env.CF_ACCOUNT_ID,
    apiKey: env.CF_WORKERS_AI_TOKEN,
  });
}

export async function onRequestPost({ request, env }: { request: Request; env: any }) {
  const { messages, model, provider, search } = (await request.json()) as any;

  const google = getGoogleClient(env);
  const aigateway = getAiGatewayClient(env);
  const workersai = getWorkersAIClient(env);

  let providerModel: any;
  const tools: Record<string, unknown> = {};

  switch (provider) {
    case "google": {
      providerModel = aigateway([google.chat(model)]);
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

      if (env.VERCEL_OIDC_TOKEN) {
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
