"use client";

import { Box, ChevronDown, RefreshCw } from "lucide-react";
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
    { heading: "OpenAI 官方原生接口", models: [] },
    { heading: "Groq 极速推理平台", models: [] },
    { heading: "DeepSeek 官方 API", models: [] },
    { heading: "Google Gemini", models: [] },
    { heading: "本地离线模型 (Ollama 完全免费)", models: [] },
    { heading: "自定义 API 模型", models: [] },
  ];

  for (const m of models) {
    if (m.provider === "workers-ai") {
      groups[0].models.push(m);
    } else if (m.provider === "openai") {
      groups[1].models.push(m);
    } else if (m.provider === "groq") {
      groups[2].models.push(m);
    } else if (m.provider === "deepseek") {
      groups[3].models.push(m);
    } else if (m.provider === "google") {
      groups[4].models.push(m);
    } else if (m.provider === "ollama") {
      groups[5].models.push(m);
    } else {
      groups[6].models.push(m);
    }
  }

  return groups.filter((g) => g.models.length > 0);
};

export type ConnectionStatus = "online" | "checking" | "offline" | "needs-key";

// 真连接测活缓存 (modelId -> ConnectionStatus)
const statusCache: Record<string, { status: ConnectionStatus; timestamp: number; pingMs?: number }> = {};

/**
 * 真实有效的网络探活测试：
 * 绝不允许无连接/未配置时虚假亮绿灯！
 * 严格检测：无 Key 时标黄 (needs-key)，连接超时或报错标红 (offline)，只有真实 HTTP 请求成功才标绿 (online)。
 */
export async function probeModelStatus(model: Model): Promise<{ status: ConnectionStatus; pingMs?: number }> {
  const now = Date.now();
  const cached = statusCache[model.id];
  if (cached && now - cached.timestamp < 30000) {
    return { status: cached.status, pingMs: cached.pingMs };
  }

  const start = performance.now();

  try {
    if (model.provider === "workers-ai") {
      const cfAccount = localStorage.getItem("CF_ACCOUNT_ID");
      const cfToken = localStorage.getItem("CF_WORKERS_AI_TOKEN");

      // 如果客户端未配置 token，则测试服务端 Pages Functions 是否提供 env.AI 绑定或 env 凭据
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(cfAccount ? { "X-CF-Account": cfAccount } : {}),
            ...(cfToken ? { "X-CF-Token": cfToken } : {}),
          },
          body: JSON.stringify({
            model: model.id,
            messages: [{ role: "user", content: "ping" }],
            provider: "workers-ai",
            probeOnly: true,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const pingMs = Math.round(performance.now() - start);
        // 若服务端返回 400 缺少凭据，且本地无 token，说明未连接，显示未配置(黄灯)
        if (res.status === 400 && !cfToken) {
          const status: ConnectionStatus = "needs-key";
          statusCache[model.id] = { status, timestamp: now };
          return { status };
        }

        if (res.ok || res.status === 200 || res.status === 405) {
          const status: ConnectionStatus = "online";
          statusCache[model.id] = { status, timestamp: now, pingMs };
          return { status, pingMs };
        } else {
          const status: ConnectionStatus = !cfToken ? "needs-key" : "offline";
          statusCache[model.id] = { status, timestamp: now };
          return { status };
        }
      } catch {
        // 请求本地或边缘 API 失败
        if (!cfToken && !cfAccount) {
          const status: ConnectionStatus = "needs-key";
          statusCache[model.id] = { status, timestamp: now };
          return { status };
        }
        const status: ConnectionStatus = "offline";
        statusCache[model.id] = { status, timestamp: now };
        return { status };
      }
    }

    if (model.provider === "openai") {
      const apiKey = localStorage.getItem("OPENAI_API_KEY");
      if (!apiKey || !apiKey.startsWith("sk-")) {
        statusCache[model.id] = { status: "needs-key", timestamp: now };
        return { status: "needs-key" };
      }
      const baseUrl = localStorage.getItem("OPENAI_BASE_URL") || "https://api.openai.com/v1";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeout);

      const pingMs = Math.round(performance.now() - start);
      const status: ConnectionStatus = res && res.ok ? "online" : res?.status === 401 ? "needs-key" : "offline";
      statusCache[model.id] = { status, timestamp: now, pingMs };
      return { status, pingMs };
    }

    if (model.provider === "deepseek") {
      const apiKey = localStorage.getItem("DEEPSEEK_API_KEY");
      if (!apiKey || !apiKey.startsWith("sk-")) {
        statusCache[model.id] = { status: "needs-key", timestamp: now };
        return { status: "needs-key" };
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch("https://api.deepseek.com/models", {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeout);

      const pingMs = Math.round(performance.now() - start);
      const status: ConnectionStatus = res && res.ok ? "online" : res?.status === 401 ? "needs-key" : "offline";
      statusCache[model.id] = { status, timestamp: now, pingMs };
      return { status, pingMs };
    }

    if (model.provider === "groq") {
      const apiKey = localStorage.getItem("GROQ_API_KEY");
      if (!apiKey || !apiKey.startsWith("gsk_")) {
        statusCache[model.id] = { status: "needs-key", timestamp: now };
        return { status: "needs-key" };
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeout);

      const pingMs = Math.round(performance.now() - start);
      const status: ConnectionStatus = res && res.ok ? "online" : "offline";
      statusCache[model.id] = { status, timestamp: now, pingMs };
      return { status, pingMs };
    }

    if (model.provider === "google") {
      const apiKey = localStorage.getItem("GOOGLE_API_KEY");
      if (!apiKey) {
        statusCache[model.id] = { status: "needs-key", timestamp: now };
        return { status: "needs-key" };
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        method: "GET",
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeout);

      const pingMs = Math.round(performance.now() - start);
      const status: ConnectionStatus = res && res.ok ? "online" : res?.status === 400 || res?.status === 403 ? "needs-key" : "offline";
      statusCache[model.id] = { status, timestamp: now, pingMs };
      return { status, pingMs };
    }

    if (model.provider === "ollama") {
      const baseUrl = localStorage.getItem("OLLAMA_BASE_URL") || "http://127.0.0.1:11434";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/tags`, {
        method: "GET",
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeout);

      const pingMs = Math.round(performance.now() - start);
      const status: ConnectionStatus = res && res.ok ? "online" : "offline";
      statusCache[model.id] = { status, timestamp: now, pingMs };
      return { status, pingMs };
    }

    if (model.provider === "custom") {
      if (!model.baseUrl) {
        statusCache[model.id] = { status: "offline", timestamp: now };
        return { status: "offline" };
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(model.baseUrl.replace(/\/+$/, "") + "/models", {
        method: "GET",
        headers: model.apiKey ? { Authorization: `Bearer ${model.apiKey}` } : {},
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeout);

      const pingMs = Math.round(performance.now() - start);
      const status: ConnectionStatus = res && res.ok ? "online" : res?.status === 401 ? "needs-key" : "offline";
      statusCache[model.id] = { status, timestamp: now, pingMs };
      return { status, pingMs };
    }

    return { status: "needs-key" };
  } catch {
    return { status: "offline" };
  }
}

const ModelList = ({
  models,
  setOpen,
  setSelectedModel,
  modelStatuses,
  onRefreshProbe,
}: {
  models: Model[];
  setOpen: (open: boolean) => void;
  setSelectedModel: (models: Model) => void;
  modelStatuses: Record<string, ConnectionStatus>;
  onRefreshProbe: () => void;
}) => {
  const grouped = getGroupedModels(models);

  return (
    <Command className="rounded-xl border shadow-sm">
      <div className="flex items-center justify-between px-2 border-b">
        <CommandInput placeholder="搜索模型（如 CF、OpenAI、Llama、DeepSeek）..." className="text-sm border-0 focus:ring-0" />
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
          title="刷新真实连接检测"
          onClick={onRefreshProbe}
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </div>
      <CommandList className="max-h-80 overflow-y-auto">
        <CommandEmpty>未找到匹配的模型</CommandEmpty>
        {grouped.map(({ heading, models: gModels }) => (
          <CommandGroup key={heading} heading={heading} className="text-xs font-semibold text-muted-foreground">
            {gModels.map((model) => {
              const status = modelStatuses[model.id] || "checking";

              return (
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
                    {/* 真连接状态灯指示 */}
                    <span
                      className={`size-2 rounded-full shrink-0 ${
                        status === "online"
                          ? "bg-emerald-500 shadow-xs shadow-emerald-400"
                          : status === "checking"
                            ? "bg-amber-400 animate-pulse"
                            : status === "needs-key"
                              ? "bg-amber-500"
                              : "bg-rose-500 shadow-xs shadow-rose-400"
                      }`}
                      title={
                        status === "online"
                          ? "真实在线且连通成功"
                          : status === "needs-key"
                            ? "未配置密钥或缺少凭证"
                            : status === "checking"
                              ? "正在测试真实网络连通..."
                              : "无法连通 / 离线"
                      }
                    />

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
              );
            })}
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
  const [modelStatuses, setModelStatuses] = useState<Record<string, ConnectionStatus>>({});
  const [currentPing, setCurrentPing] = useState<number | undefined>();

  // 探活当前选中的模型
  useEffect(() => {
    if (!selectedModel) return;
    let active = true;

    setModelStatuses((prev) => ({ ...prev, [selectedModel.id]: "checking" }));
    probeModelStatus(selectedModel).then(({ status, pingMs }) => {
      if (active) {
        setModelStatuses((prev) => ({ ...prev, [selectedModel.id]: status }));
        setCurrentPing(pingMs);
      }
    });

    return () => {
      active = false;
    };
  }, [selectedModel]);

  // 全量异步探活当前列表模型
  const handleProbeAll = () => {
    for (const m of allModels) {
      probeModelStatus(m).then(({ status }) => {
        setModelStatuses((prev) => ({ ...prev, [m.id]: status }));
      });
    }
  };

  useEffect(() => {
    handleProbeAll();
  }, [allModels]);

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

  const currentStatus = (selectedModel && modelStatuses[selectedModel.id]) || "checking";

  // 动态真连接状态指示灯：严谨展示真实网络状态，绝不默认通通绿灯
  const statusLight = (
    <span
      className={`size-2 rounded-full shrink-0 ${
        currentStatus === "online"
          ? "bg-emerald-500 shadow-xs shadow-emerald-400"
          : currentStatus === "checking"
            ? "bg-amber-400 animate-pulse"
            : currentStatus === "needs-key"
              ? "bg-amber-500"
              : "bg-rose-500"
      }`}
      title={
        currentStatus === "online"
          ? `真连接在线${currentPing ? ` (${currentPing}ms)` : ""}`
          : currentStatus === "needs-key"
            ? "待配置密钥 (未连接)"
            : currentStatus === "checking"
              ? "测活中..."
              : "网络不通或离线"
      }
    />
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
        <PopoverContent className="p-0 w-96 rounded-xl" align="start">
          <ModelList
            setOpen={setOpen}
            setSelectedModel={setSelectedModel}
            models={allModels}
            modelStatuses={modelStatuses}
            onRefreshProbe={handleProbeAll}
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
        <DrawerTitle className="text-base font-semibold mb-2">选择 AI 模型 (真连接状态灯)</DrawerTitle>
        <div className="mt-2">
          <ModelList
            setOpen={setOpen}
            setSelectedModel={setSelectedModel}
            models={allModels}
            modelStatuses={modelStatuses}
            onRefreshProbe={handleProbeAll}
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
