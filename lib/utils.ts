import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { type Model, models } from "@/lib/models";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getRandomId = () => {
  return Math.random().toString(36).slice(2);
};

export type StoredModelKey = "CF_AI_MODEL" | "CF_AI_MODEL_IMAGE";

export const getStoredModel = (key: StoredModelKey = "CF_AI_MODEL"): Model => {
  const id = getStoredModelId(key);
  const found = models.find((m) => m.id === id);
  if (found) return found;

  // Check if it's a custom stored API
  if (typeof window !== "undefined") {
    try {
      const customApis = JSON.parse(localStorage.getItem("CF_AI_CUSTOM_APIS") || "[]");
      const custom = customApis.find((c: any) => c.id === id);
      if (custom) {
        return {
          id: custom.id,
          name: custom.name,
          logo: null,
          type: custom.type,
          provider: "custom",
          isFree: custom.isFree ?? false,
          pricingLabel: custom.pricingLabel || (custom.isFree ? "免费" : "收费"),
          baseUrl: custom.baseUrl,
          apiKey: custom.apiKey,
        };
      }
    } catch {
      // ignore parse error
    }
  }

  return models[0];
};

export const getStoredModelId = (key: StoredModelKey = "CF_AI_MODEL") => {
  if (typeof window === "undefined") return models[0].id;
  return (localStorage.getItem(key) ?? models[0].id) as Model["id"];
};
