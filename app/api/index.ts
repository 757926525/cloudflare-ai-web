import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAiGateway } from "ai-gateway-provider";
import { createWorkersAI } from "workers-ai-provider";

export const aigateway = createAiGateway({
  accountId: process.env.CF_ACCOUNT_ID || "",
  gateway: process.env.CF_AI_GATEWAY_NAME || "",
  apiKey: process.env.CF_AI_GATEWAY_TOKEN,
});

export const workersai = createWorkersAI({
  accountId: process.env.CF_ACCOUNT_ID || "",
  apiKey: process.env.CF_WORKERS_AI_TOKEN || "",
});

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY || "",
});

export const deepseek = createOpenAI({
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
});

export const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "",
});

export const ollama = createOpenAI({
  baseURL: (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "") + "/v1",
  apiKey: "ollama",
});
