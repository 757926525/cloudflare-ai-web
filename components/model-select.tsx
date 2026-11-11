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

// 按分类排序，Cloudflare Workers AI 排在最首位
const getGroupedModels = (models: Model[]) => {
  const groups: { heading: string; models: Model[] }[] = [
    { heading: "Cloudflare Workers AI (首选推荐)", models: [] },
    { heading: "Groq 极速推理 (免费)", models: [] },
    { heading: "DeepSeek 官方大模型", models: [] },
    { heading: "Google Gemini", models: [] },
    { heading: "本地离线模型 (Ollama)", models: [] },
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
                className="py-2.5 px-3 cursor-pointer flex items-center gap-2 rounded-lg aria-selected:bg-primary/10"
                onSelect={() => {
                  setSelectedModel(model);
                  setOpen(false);
                }}
              >
                <div className="size-4 shrink-0 flex items-center justify-center">
                  {model.logo}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-foreground truncate">
                    {model.name}
                  </span>
                </div>
                {model.tag?.map((item) => (
                  <Badge
                    key={item}
                    variant={item.includes("免") ? "default" : "secondary"}
                    className="ml-auto text-[10px] px-1.5 py-0 h-4"
                  >
                    {item}
                  </Badge>
                ))}
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

  // 状态指示灯颜色：Cloudflare Workers AI 或免配置模型默认绿灯，其他依配置而定
  const isReady =
    selectedModel?.freeWithoutKey ||
    (selectedModel?.provider === "workers-ai") ||
    (selectedModel?.provider === "deepseek" && !!localStorage.getItem("DEEPSEEK_API_KEY")) ||
    (selectedModel?.provider === "groq" && !!localStorage.getItem("GROQ_API_KEY")) ||
    (selectedModel?.provider === "google" && !!localStorage.getItem("GOOGLE_API_KEY")) ||
    (selectedModel?.provider === "ollama") ||
    (selectedModel?.provider === "custom");

  const statusLight = isReady ? (
    <span className="size-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-400" title="连通可用" />
  ) : (
    <span className="size-2 rounded-full bg-amber-500 animate-pulse" title="需配置API密钥" />
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
              <span className="max-w-[140px] truncate text-xs font-medium">
                {selectedModel.name}
              </span>
              <ChevronDown className="size-3.5 opacity-60 ml-0.5" />
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="p-0 w-80 rounded-xl" align="start">
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
            <span className="max-w-[120px] truncate text-xs font-medium">
              {selectedModel.name}
            </span>
            <ChevronDown className="size-3.5 opacity-60 ml-0.5" />
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent className="p-4 pb-8 max-h-[85vh]">
        <DrawerTitle className="text-base font-semibold mb-2">选择 AI 模型</DrawerTitle>
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
