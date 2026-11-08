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
  | "google"
  | "deepseek"
  | "groq"
  | "ollama"
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

export const modelList: Model[] = [
  // DeepSeek Official
  {
    id: "deepseek-chat",
    name: "DeepSeek-V3",
    logo: <DeepSeekLogo />,
    type: "Text Generation",
    provider: "deepseek",
    tag: ["deepseek"],
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek-R1",
    logo: <DeepSeekLogo />,
    type: "Text Generation",
    provider: "deepseek",
    tag: ["reasoning"],
  },
  // Groq
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama-3.3-70B (Groq)",
    logo: <GroqLogo />,
    type: "Text Generation",
    provider: "groq",
    tag: ["fast", "free"],
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "DeepSeek-R1-Distill-70B (Groq)",
    logo: <GroqLogo />,
    type: "Text Generation",
    provider: "groq",
    tag: ["reasoning"],
  },
  // Ollama (Local)
  {
    id: "qwen2.5-coder:latest",
    name: "Qwen 2.5 Coder (Ollama)",
    logo: <OllamaLogo />,
    type: "Text Generation",
    provider: "ollama",
    tag: ["local", "coding"],
  },
  {
    id: "deepseek-r1:latest",
    name: "DeepSeek-R1 (Ollama)",
    logo: <OllamaLogo />,
    type: "Text Generation",
    provider: "ollama",
    tag: ["local", "reasoning"],
  },
  // Google Gemini
  {
    id: "gemini-2.5-flash",
    name: "gemini-2.5-flash",
    logo: <GoogleLogo />,
    type: "Text Generation",
    input: ["image", "search"],
    provider: "google",
  },
  {
    id: "gemini-2.5-pro",
    name: "gemini-2.5-pro",
    logo: <GoogleLogo />,
    type: "Text Generation",
    input: ["image", "search"],
    provider: "google",
  },
  // Cloudflare Workers AI
  {
    id: "@cf/moonshotai/kimi-k2.6",
    name: "kimi-k2.6",
    logo: <KIMILogo />,
    type: "Text Generation",
    input: ["image"],
    provider: "workers-ai",
    tag: ["new"],
  },
  {
    id: "@cf/zai-org/glm-4.7-flash",
    name: "glm-4.7-flash",
    logo: <ZhiPuLogo />,
    type: "Text Generation",
    provider: "workers-ai",
    tag: ["new"],
  },
  {
    id: "@cf/openai/gpt-oss-120b",
    name: "gpt-oss-120b",
    logo: <OpenAILogo />,
    type: "Text Generation",
    provider: "workers-ai",
    tag: ["new"],
  },
  {
    id: "@cf/google/gemma-4-26b-a4b-it",
    name: "gemma-4-26b-a4b-it",
    logo: <GoogleLogo />,
    type: "Text Generation",
    input: ["image"],
    provider: "workers-ai",
    tag: ["new"],
  },
  {
    id: "@cf/meta/llama-4-scout-17b-16e-instruct",
    name: "llama-4-scout-17b-16e-instruct",
    logo: <MetaLogo />,
    type: "Text Generation",
    input: ["image"],
    provider: "workers-ai",
  },
  {
    id: "@cf/qwen/qwq-32b",
    name: "qwq-32b",
    logo: <QWenLogo />,
    type: "Text Generation",
    // input: ["image"],
    provider: "workers-ai",
  },
  {
    id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
    name: "deepseek-r1-distill-qwen-32b",
    logo: <DeepSeekLogo />,
    type: "Text Generation",
    provider: "workers-ai",
  },
  {
    id: "@cf/bytedance/stable-diffusion-xl-lightning",
    name: "stable-diffusion-xl-lightning",
    logo: defaultLogo,
    type: "Text to Image",
    provider: "workers-ai",
  },
  {
    id: "@cf/black-forest-labs/flux-1-schnell",
    name: "flux-1-schnell",
    logo: defaultLogo,
    type: "Text to Image",
    provider: "workers-ai",
  },
  {
    id: "@cf/leonardo/lucid-origin",
    name: "lucid-origin",
    logo: defaultLogo,
    type: "Text to Image",
    provider: "workers-ai",
  },
  {
    id: "@cf/lykon/dreamshaper-8-lcm",
    name: "dreamshaper-8-lcm",
    logo: defaultLogo,
    type: "Text to Image",
    provider: "workers-ai",
  },
];

const providers = process.env.NEXT_PUBLIC_CF_AI_GATEWAY_PROVIDERS?.split(",");

export const models = modelList.filter(
  (i) =>
    i.provider === "workers-ai" ||
    i.provider === "deepseek" ||
    i.provider === "groq" ||
    i.provider === "ollama" ||
    i.provider === "google" ||
    providers?.includes(i.provider),
);
