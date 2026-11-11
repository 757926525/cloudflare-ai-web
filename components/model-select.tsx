"use client";

import { Box, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getStoredCustomApis } from "@/components/admin-settings-dialog";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { Model } from "@/lib/models";
import { getStoredModelId, type StoredModelKey } from "@/lib/utils";

// 按分类排序，Cloudflare Workers AI 严格排在首位
const getGroupedModels = (models: Model[]) => {
  const groups: { heading: string; models: Model[] }[] = [
    { heading: "Cloudflare Workers AI (首选推荐)", models: [] },
    { heading: "Groq 极速推理平台 (免费配额)", models: [] },
    { heading: "DeepSeek 官方 API", models: [] },
    { heading: "Google Gemini (提供免费额度)", models: [] },
    { heading: "本地离线模型 (Ollama 完全免费)", models: [] },
    { heading: "自定义 API 模型", models: [] },
  ];

  for (const m of models) {
    if (m.provider === "workers-ai") {
      groups[0].models.push(m);
    } else if (m.provider === "groq") {
      groups[1].models.push(m);
    } else if (m.provider === "deepseek") {
      groups[2].models.push(m);
    } else if (m.provider === "google") {
      groups[3].models.push(m);
    } else if (m.provider === "ollama") {
      groups[4].models.push(m);
    } else {
      groups[5].models.push(m);
    }
  }

  return groups.filter((g) => g.models.length > 0);
};

const ModelList = ({
  models,
  setOpen,
  setSelectedModel,
}: {
  models: Model[];
  setOpen: (open: boolean) => void;
  setSelectedModel: (models: Model) => void;
}) => {
  const grouped = getGroupedModels(models);

  return (
    <Command className="rounded-xl border shadow-sm">
      <CommandInput placeholder="搜索模型（如 CF、Llama、DeepSeek）..." className="text-sm" />
      <CommandList className="max-h-80 overflow-y-auto">
        <CommandEmpty>未找到匹配的模型</CommandEmpty>
        {grouped.map(({ heading, models: gModels }) => (
          <CommandGroup key={heading} heading={heading} className="text-xs font-semibold text-muted-foreground">
            {gModels.map((model) => (
              <CommandItem
                key={model.id}
                value={`${model.name} ${model.id}`}
                className="py-2 px-2.5 cursor-pointer flex items-center justify-between rounded-lg aria-selected:bg-primary/10 gap-2"
                onSelect={() => {
                  setSelectedModel(model);
                  setOpen(false);
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-4 shrink-0 flex items-center justify-center">
                    {model.logo}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-medium text-foreground truncate">
                      {model.name}
                    </span>
                    {model.description && (
                      <span className="text-[10px] text-muted-foreground truncate">
                        {model.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* 显眼免费/收费标签 */}
                  <Badge
                    variant={model.isFree ? "default" : "secondary"}
                    className={`text-[10px] px-1.5 py-0 h-4 font-normal ${
                      model.isFree
                        ? "bg-emerald-600/90 hover:bg-emerald-600 text-white"
                        : "bg-amber-500/10 text-amber-600 border border-amber-300 dark:border-amber-700"
                    }`}
                  >
                    {model.pricingLabel || (model.isFree ? "免费" : "收费")}
                  </Badge>

                  {model.tag?.[0] && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 hidden sm:inline-flex">
                      {model.tag[0]}
                    </Badge>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
};

function ComboBoxResponsive({
  models,
  modalKey,
  selectedModel,
  setSelectedModel,
}: {
  models: Model[];
  modalKey: StoredModelKey;
  selectedModel?: Model;
  setSelectedModel: (model: Model) => void;
}) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [allModels, setAllModels] = useState<Model[]>(models);

  useEffect(() => {
    const updateModels = () => {
      const customApis = getStoredCustomApis();
      const customModelList: Model[] = customApis.map((api) => ({
        id: api.id,
        name: api.name,
        logo: <Box className="size-4" />,
        type: api.type,
        provider: "custom" as const,
        isFree: api.isFree ?? false,
        pricingLabel: (api.pricingLabel as any) || (api.isFree ? "免费" : "收费"),
        tag: ["自定义"],
        baseUrl: api.baseUrl,
        apiKey: api.apiKey,
      }));

      const isImageContext = modalKey === "CF_AI_MODEL_IMAGE";
      const filteredCustom = customModelList.filter((m) =>
        isImageContext ? m.type === "Text to Image" : m.type === "Text Generation",
      );

      setAllModels([...models, ...filteredCustom]);
    };

    updateModels();
    window.addEventListener("custom-apis-updated", updateModels);
    return () => window.removeEventListener("custom-apis-updated", updateModels);
  }, [models, modalKey]);

  useEffect(() => {
    const storedId = getStoredModelId(modalKey);
    const found = allModels.find((item) => item.id === storedId);
    setSelectedModel(found ?? allModels[0] ?? models[0]);
  }, [allModels, modalKey, setSelectedModel, models]);

  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem(modalKey, selectedModel.id);
    }
  }, [selectedModel, modalKey]);

  // 连通可用指示灯 (绿色 = 可用，黄色 = 待配置密钥)
  const isReady =
    selectedModel?.freeWithoutKey ||
    (selectedModel?.provider === "workers-ai") ||
    (selectedModel?.provider === "deepseek" && !!localStorage.getItem("DEEPSEEK_API_KEY")) ||
    (selectedModel?.provider === "groq" && !!localStorage.getItem("GROQ_API_KEY")) ||
    (selectedModel?.provider === "google" && !!localStorage.getItem("GOOGLE_API_KEY")) ||
    (selectedModel?.provider === "ollama") ||
    (selectedModel?.provider === "custom");

  const statusLight = isReady ? (
    <span className="size-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-400 shrink-0" title="连通就绪" />
  ) : (
    <span className="size-2 rounded-full bg-amber-500 animate-pulse shrink-0" title="请配置API密钥" />
  );

  const priceBadge = selectedModel && (
    <span
      className={`text-[9px] px-1 rounded-sm ml-1 ${
        selectedModel.isFree
          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
      }`}
    >
      {selectedModel.pricingLabel || (selectedModel.isFree ? "免费" : "收费")}
    </span>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {selectedModel && (
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5 rounded-lg border border-border/50 bg-background/50 hover:bg-accent">
              {statusLight}
              <span className="size-4 flex items-center justify-center shrink-0">
                {selectedModel.logo}
              </span>
              <span className="max-w-[130px] truncate text-xs font-medium">
                {selectedModel.name}
              </span>
              {priceBadge}
              <ChevronDown className="size-3.5 opacity-60 ml-0.5" />
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="p-0 w-88 rounded-xl" align="start">
          <ModelList
            setOpen={setOpen}
            setSelectedModel={setSelectedModel}
            models={allModels}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {selectedModel && (
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5 rounded-lg border border-border/50 bg-background/50 hover:bg-accent">
            {statusLight}
            <span className="size-4 flex items-center justify-center shrink-0">
              {selectedModel.logo}
            </span>
            <span className="max-w-[110px] truncate text-xs font-medium">
              {selectedModel.name}
            </span>
            {priceBadge}
            <ChevronDown className="size-3.5 opacity-60 ml-0.5" />
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent className="p-4 pb-8 max-h-[85vh]">
        <DrawerTitle className="text-base font-semibold mb-2">选择 AI 模型 (标明免费/收费)</DrawerTitle>
        <div className="mt-2">
          <ModelList
            setOpen={setOpen}
            setSelectedModel={setSelectedModel}
            models={allModels}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

const ModelSelect = ({
  models,
  modalKey,
  selectedModel,
  setSelectedModel,
}: {
  models: Model[];
  modalKey: StoredModelKey;
  selectedModel?: Model;
  setSelectedModel: (model: Model) => void;
}) => {
  return (
    <ComboBoxResponsive
      models={models}
      modalKey={modalKey}
      selectedModel={selectedModel}
      setSelectedModel={setSelectedModel}
    />
  );
};

export default ModelSelect;
