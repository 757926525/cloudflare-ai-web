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
  isFree: boolean; // 明确标出免费/收费
  pricingLabel: "免费" | "限额免费" | "按量收费" | "完全免费(离线)";
  tag?: string[];
  description?: string;
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
  isFree?: boolean;
  pricingLabel?: string;
  supportsVision?: boolean;
}

const defaultLogo = (
  <div className="bg-linear-to-br from-secondary to-primary size-4 rounded-full"></div>
);

// 包含所有常见网站的大模型，且明确标记免费和收费
export const modelList: Model[] = [
  // ================= 1. Cloudflare Workers AI (排首位) =================
  {
    id: "@cf/meta/llama-3.1-8b-instruct",
    name: "Llama 3.1 8B (CF Workers AI)",
    logo: <MetaLogo />,
    type: "Text Generation",
    provider: "workers-ai",
    isFree: true,
    pricingLabel: "免费",
    tag: ["CF首选", "免配置"],
    description: "Meta 极速轻量开源大模型，适合日常问答与文本生成",
    freeWithoutKey: true,
  },
  {
    id: "@cf/qwen/qwq-32b",
    name: "QWQ-32B 深度思考 (CF Workers AI)",
    logo: <QWenLogo />,
    type: "Text Generation",
    provider: "workers-ai",
    isFree: true,
    pricingLabel: "免费",
    tag: ["深度推理", "免费思考"],
    description: "通义千问最新 32B 推理大模型，具备媲美 o1 的逻辑推导能力",
    freeWithoutKey: true,
  },
  {
    id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
    name: "DeepSeek R1 32B (CF Workers AI)",
    logo: <DeepSeekLogo />,
    type: "Text Generation",
    provider: "workers-ai",
    isFree: true,
    pricingLabel: "免费",
    tag: ["推理精调", "免费可用"],
    description: "DeepSeek R1 蒸馏版本，极强数学推演与代码编程能力",
    freeWithoutKey: true,
  },
  {
    id: "@cf/moonshotai/kimi-k2.6",
    name: "Kimi K2.6 (CF Workers AI)",
    logo: <KIMILogo />,
    type: "Text Generation",
    input: ["image"],
    provider: "workers-ai",
    isFree: true,
    pricingLabel: "免费",
    tag: ["超长上下文", "多模态"],
    description: "月之暗面 Kimi 最新长文本基座，支持图文理解",
  },
  {
    id: "@cf/zai-org/glm-4.7-flash",
    name: "GLM-4.7 Flash (CF Workers AI)",
    logo: <ZhiPuLogo />,
    type: "Text Generation",
    provider: "workers-ai",
    isFree: true,
    pricingLabel: "免费",
    tag: ["智谱高精", "低延迟"],
    description: "智谱清言最新高速低时延大模型，中文处理极佳",
  },
  {
    id: "@cf/openai/gpt-oss-120b",
    name: "GPT-OSS 120B (CF Workers AI)",
    logo: <OpenAILogo />,
    type: "Text Generation",
    provider: "workers-ai",
    isFree: true,
    pricingLabel: "免费",
    tag: ["大参数", "全能"],
    description: "120B 超大参数量级通用模型，复杂任务表现卓越",
  },
  {
    id: "@cf/google/gemma-4-26b-a4b-it",
    name: "Gemma 4 26B (CF Workers AI)",
    logo: <GoogleLogo />,
    type: "Text Generation",
    input: ["image"],
    provider: "workers-ai",
    isFree: true,
    pricingLabel: "免费",
    tag: ["Google架构", "视觉"],
    description: "Google 官方 Gemma 4 系列，兼顾精准度与多模态",
  },
  {
    id: "@cf/meta/llama-4-scout-17b-16e-instruct",
    name: "Llama 4 Scout 17B (CF Workers AI)",
    logo: <MetaLogo />,
    type: "Text Generation",
    input: ["image"],
    provider: "workers-ai",
    isFree: true,
    pricingLabel: "免费",
    tag: ["Llama4", "视觉图生文"],
    description: "Meta 最新一代多模态先锋模型，解析图像与指令理解敏捷",
  },

  // ================= 2. Groq 极速推理平台 =================
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama-3.3-70B (Groq 极速)",
    logo: <GroqLogo />,
    type: "Text Generation",
    provider: "groq",
    isFree: true,
    pricingLabel: "限额免费",
    tag: ["LPU加速", "超高TPS"],
    description: "Groq 硬件 LPU 推理芯片加速，每秒数十个 Token，提供免费额度",
    freeWithoutKey: true,
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "DeepSeek-R1-70B (Groq 极速)",
    logo: <GroqLogo />,
    type: "Text Generation",
    provider: "groq",
    isFree: true,
    pricingLabel: "限额免费",
    tag: ["极速推理", "免费配额"],
    description: "在 Groq 极速芯片上运行的 DeepSeek R1 蒸馏模型",
    freeWithoutKey: true,
  },

  // ================= 3. DeepSeek 官方 API =================
  {
    id: "deepseek-chat",
    name: "DeepSeek-V3 (官方平台)",
    logo: <DeepSeekLogo />,
    type: "Text Generation",
    provider: "deepseek",
    isFree: false,
    pricingLabel: "按量收费",
    tag: ["极低成本", "高评分旗舰"],
    description: "全球领先的百亿参数MoE模型，价格极其亲民(百万Tokens低至几毛钱)",
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek-R1 (官方深度推理)",
    logo: <DeepSeekLogo />,
    type: "Text Generation",
    provider: "deepseek",
    isFree: false,
    pricingLabel: "按量收费",
    tag: ["强化学习", "深度推理"],
    description: "包含完整思维链推理的 DeepSeek 旗舰推理大模型",
  },

  // ================= 4. Google Gemini =================
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash (Google AI)",
    logo: <GoogleLogo />,
    type: "Text Generation",
    input: ["image", "search"],
    provider: "google",
    isFree: true,
    pricingLabel: "限额免费",
    tag: ["免费可用", "百万上下文"],
    description: "Google AI Studio 每日提供大额完全免费调用额度",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro (Google AI)",
    logo: <GoogleLogo />,
    type: "Text Generation",
    input: ["image", "search"],
    provider: "google",
    isFree: true,
    pricingLabel: "限额免费",
    tag: ["超强逻辑", "免费额度"],
    description: "Google 旗舰大模型，支持海量多模态数据与代码推演",
  },

  // ================= 5. 本地 Ollama 离线运行 =================
  {
    id: "qwen2.5-coder:latest",
    name: "Qwen 2.5 Coder (本地 Ollama)",
    logo: <OllamaLogo />,
    type: "Text Generation",
    provider: "ollama",
    isFree: true,
    pricingLabel: "完全免费(离线)",
    tag: ["完全免费", "数据私密"],
    description: "运行于用户本地机器，无需联网，无任何费用或Token消耗",
    freeWithoutKey: true,
  },
  {
    id: "deepseek-r1:latest",
    name: "DeepSeek-R1 (本地 Ollama)",
    logo: <OllamaLogo />,
    type: "Text Generation",
    provider: "ollama",
    isFree: true,
    pricingLabel: "完全免费(离线)",
    tag: ["本地推理", "零成本"],
    description: "本地 Ollama 驱动的 DeepSeek R1 深度思考推理模型",
    freeWithoutKey: true,
  },

  // ================= 6. Cloudflare 文生图 =================
  {
    id: "@cf/black-forest-labs/flux-1-schnell",
    name: "FLUX.1 Schnell (CF 快速画图)",
    logo: defaultLogo,
    type: "Text to Image",
    provider: "workers-ai",
    isFree: true,
    pricingLabel: "免费",
    tag: ["快速出图", "高清画质"],
    description: "Black Forest Labs 开发的极速逼真图像生成模型",
    freeWithoutKey: true,
  },
  {
    id: "@cf/bytedance/stable-diffusion-xl-lightning",
    name: "SDXL Lightning (CF 极速画图)",
    logo: defaultLogo,
    type: "Text to Image",
    provider: "workers-ai",
    isFree: true,
    pricingLabel: "免费",
    tag: ["字节跳动", "闪电出图"],
    description: "秒级生成超高清艺术插画与场景图片",
  },
];

export const models = modelList;
