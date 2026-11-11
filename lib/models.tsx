import type { ReactNode } from "react";
import {
  DeepSeekLogo,
  GoogleLogo,
  GroqLogo,
  KIMILogo,
  MetaLogo,
  OllamaLogo,
  OpenAILogo,
  QWenLogo,
  ZhiPuLogo,
} from "@/components/logo";

export type ModelProvider =
  | "workers-ai"
  | "deepseek"
  | "groq"
  | "ollama"
  | "google"
  | "custom";

export interface Model {
  id: string;
  name: string;
  logo: ReactNode;
  type: "Text Generation" | "Text to Image";
  input?: Array<"image" | "search">;
  provider: ModelProvider;
  tag?: string[];
  baseUrl?: string;
  apiKey?: string;
  freeWithoutKey?: boolean;
}

export interface CustomApiConfig {
  id: string;
  name: string;
  modelId: string;
  baseUrl: string;
  apiKey: string;
  type: "Text Generation" | "Text to Image";
  supportsVision?: boolean;
}

const defaultLogo = (
  <div className="bg-linear-to-br from-secondary to-primary size-4 rounded-full"></div>
);

// Cloudflare Workers AI 排在最首位（第一位），包含免费免配置模型
export const modelList: Model[] = [
  // 1. Cloudflare Workers AI (排首位)
  {
    id: "@cf/meta/llama-3.1-8b-instruct",
    name: "Llama 3.1 8B (CF 免费免配置)",
    logo: <MetaLogo />,
    type: "Text Generation",
    provider: "workers-ai",
    tag: ["cf-ai", "免费可用", "免配置"],
    freeWithoutKey: true,
  },
  {
    id: "@cf/qwen/qwq-32b",
    name: "QWQ-32B 深度思考 (CF 免费免配置)",
    logo: <QWenLogo />,
    type: "Text Generation",
    provider: "workers-ai",
    tag: ["cf-ai", "深度推理", "免费可用"],
    freeWithoutKey: true,
  },
  {
    id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
    name: "DeepSeek R1 32B (CF 免费免配置)",
    logo: <DeepSeekLogo />,
    type: "Text Generation",
    provider: "workers-ai",
    tag: ["cf-ai", "免费可用", "免配置"],
    freeWithoutKey: true,
  },
  {
    id: "@cf/moonshotai/kimi-k2.6",
    name: "Kimi K2.6 (CF Workers AI)",
    logo: <KIMILogo />,
    type: "Text Generation",
    input: ["image"],
    provider: "workers-ai",
    tag: ["cf-ai", "推荐"],
  },
  {
    id: "@cf/zai-org/glm-4.7-flash",
    name: "GLM-4.7 Flash (CF Workers AI)",
    logo: <ZhiPuLogo />,
    type: "Text Generation",
    provider: "workers-ai",
    tag: ["cf-ai", "新上线"],
  },
  {
    id: "@cf/openai/gpt-oss-120b",
    name: "GPT-OSS 120B (CF Workers AI)",
    logo: <OpenAILogo />,
    type: "Text Generation",
    provider: "workers-ai",
    tag: ["cf-ai"],
  },
  {
    id: "@cf/google/gemma-4-26b-a4b-it",
    name: "Gemma 4 26B (CF Workers AI)",
    logo: <GoogleLogo />,
    type: "Text Generation",
    input: ["image"],
    provider: "workers-ai",
    tag: ["cf-ai"],
  },

  // 2. Groq 免费极速模型
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama-3.3-70B (Groq 极速免费)",
    logo: <GroqLogo />,
    type: "Text Generation",
    provider: "groq",
    tag: ["免费极速", "高评分"],
    freeWithoutKey: true,
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "DeepSeek-R1-70B (Groq 推理免费)",
    logo: <GroqLogo />,
    type: "Text Generation",
    provider: "groq",
    tag: ["深度思考", "免费"],
    freeWithoutKey: true,
  },

  // 3. DeepSeek 官方 API
  {
    id: "deepseek-chat",
    name: "DeepSeek-V3 (官方)",
    logo: <DeepSeekLogo />,
    type: "Text Generation",
    provider: "deepseek",
    tag: ["官方直连", "低成本"],
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek-R1 (官方深度思考)",
    logo: <DeepSeekLogo />,
    type: "Text Generation",
    provider: "deepseek",
    tag: ["官方推理", "深度思考"],
  },

  // 4. Google Gemini
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    logo: <GoogleLogo />,
    type: "Text Generation",
    input: ["image", "search"],
    provider: "google",
    tag: ["免费配额"],
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    logo: <GoogleLogo />,
    type: "Text Generation",
    input: ["image", "search"],
    provider: "google",
  },

  // 5. 本地 Ollama
  {
    id: "qwen2.5-coder:latest",
    name: "Qwen 2.5 Coder (本地 Ollama 免费)",
    logo: <OllamaLogo />,
    type: "Text Generation",
    provider: "ollama",
    tag: ["本地离线", "完全免费"],
    freeWithoutKey: true,
  },
  {
    id: "deepseek-r1:latest",
    name: "DeepSeek-R1 (本地 Ollama 免费)",
    logo: <OllamaLogo />,
    type: "Text Generation",
    provider: "ollama",
    tag: ["本地离线", "推理"],
    freeWithoutKey: true,
  },

  // 6. CF 文生图模型
  {
    id: "@cf/black-forest-labs/flux-1-schnell",
    name: "FLUX.1 Schnell (CF 快速画图)",
    logo: defaultLogo,
    type: "Text to Image",
    provider: "workers-ai",
    tag: ["画图", "免费可用"],
    freeWithoutKey: true,
  },
  {
    id: "@cf/bytedance/stable-diffusion-xl-lightning",
    name: "SDXL Lightning (CF 极速画图)",
    logo: defaultLogo,
    type: "Text to Image",
    provider: "workers-ai",
    tag: ["画图"],
  },
];

export const models = modelList;
