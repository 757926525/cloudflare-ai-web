"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Key, Globe, Shield, Cloud, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { CustomApiConfig } from "@/lib/models";

export const CUSTOM_API_STORAGE_KEY = "CF_AI_CUSTOM_APIS";

export function getStoredCustomApis(): CustomApiConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_API_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function AdminSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [customApis, setCustomApis] = useState<CustomApiConfig[]>([]);
  const [name, setName] = useState("");
  const [modelId, setModelId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  // Cloudflare Workers AI Credentials
  const [cfAccountId, setCfAccountId] = useState("");
  const [cfToken, setCfToken] = useState("");

  // Other AI Provider Keys
  const [deepseekKey, setDeepseekKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("");

  // GitHub Access Token
  const [githubPat, setGithubPat] = useState("");

  useEffect(() => {
    if (open) {
      setCustomApis(getStoredCustomApis());
      setCfAccountId(localStorage.getItem("CF_ACCOUNT_ID") || "");
      setCfToken(localStorage.getItem("CF_WORKERS_AI_TOKEN") || "");
      setDeepseekKey(localStorage.getItem("DEEPSEEK_API_KEY") || "");
      setGroqKey(localStorage.getItem("GROQ_API_KEY") || "");
      setGoogleKey(localStorage.getItem("GOOGLE_API_KEY") || "");
      setOllamaUrl(localStorage.getItem("OLLAMA_BASE_URL") || "http://127.0.0.1:11434/v1");
      setGithubPat(localStorage.getItem("GITHUB_ACCESS_TOKEN") || "");
    }
  }, [open]);

  const handleSaveCfConfig = () => {
    if (cfAccountId.trim()) localStorage.setItem("CF_ACCOUNT_ID", cfAccountId.trim());
    if (cfToken.trim()) localStorage.setItem("CF_WORKERS_AI_TOKEN", cfToken.trim());
    toast.success("Cloudflare Workers AI 凭证已保存");
  };

  const handleSaveProviderKeys = () => {
    if (deepseekKey.trim()) localStorage.setItem("DEEPSEEK_API_KEY", deepseekKey.trim());
    if (groqKey.trim()) localStorage.setItem("GROQ_API_KEY", groqKey.trim());
    if (googleKey.trim()) localStorage.setItem("GOOGLE_API_KEY", googleKey.trim());
    if (ollamaUrl.trim()) localStorage.setItem("OLLAMA_BASE_URL", ollamaUrl.trim());
    toast.success("AI 平台 API 密钥已保存");
  };

  const handleAddApi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !modelId.trim() || !baseUrl.trim()) {
      toast.error("请完整填写名称、模型标识与 Base URL");
      return;
    }

    const newApi: CustomApiConfig = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      modelId: modelId.trim(),
      baseUrl: baseUrl.trim().replace(/\/$/, ""),
      apiKey: apiKey.trim(),
      type: "Text Generation",
    };

    const updated = [...customApis, newApi];
    setCustomApis(updated);
    localStorage.setItem(CUSTOM_API_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("custom-apis-updated"));

    toast.success(`自定义 API「${newApi.name}」已添加`);
    setName("");
    setModelId("");
    setBaseUrl("");
    setApiKey("");
  };

  const handleDeleteApi = (id: string) => {
    const updated = customApis.filter((item) => item.id !== id);
    setCustomApis(updated);
    localStorage.setItem(CUSTOM_API_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("custom-apis-updated"));
    toast.success("自定义 API 已移除");
  };

  const handleSaveGithubPat = () => {
    localStorage.setItem("GITHUB_ACCESS_TOKEN", githubPat.trim());
    window.dispatchEvent(new Event("github-token-updated"));
    toast.success("GitHub 访问令牌已保存");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            <DialogTitle>后台设置与 API 密钥管理</DialogTitle>
          </div>
          <DialogDescription>
            管理 Cloudflare Workers AI、主流大模型密钥以及自定义 OpenAI 兼容接口。
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 space-y-5">
          {/* 1. Cloudflare Workers AI 设置 (排首位) */}
          <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
            <h3 className="font-semibold text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Cloud className="size-4 text-orange-500" />
                Cloudflare Workers AI 连接配置
              </span>
              <Button size="sm" onClick={handleSaveCfConfig} className="h-7 text-xs">
                保存 CF 凭证
              </Button>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Cloudflare Account ID</Label>
                <Input
                  placeholder="例如: 32位数字字母组成的账户ID"
                  value={cfAccountId}
                  onChange={(e) => setCfAccountId(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Workers AI API Token</Label>
                <Input
                  type="password"
                  placeholder="例如: CF 模板生成的 API 令牌"
                  value={cfToken}
                  onChange={(e) => setCfToken(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 2. 常用免费 / 商业 API 密钥设置 */}
          <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
            <h3 className="font-semibold text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                大模型提供商 API 密钥
              </span>
              <Button size="sm" onClick={handleSaveProviderKeys} className="h-7 text-xs">
                保存模型密钥
              </Button>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">DeepSeek 官方 API Key</Label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={deepseekKey}
                  onChange={(e) => setDeepseekKey(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Groq 免费 API Key</Label>
                <Input
                  type="password"
                  placeholder="gsk_..."
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Google Gemini API Key</Label>
                <Input
                  type="password"
                  placeholder="AIzaSy..."
                  value={googleKey}
                  onChange={(e) => setGoogleKey(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">本地 Ollama 地址</Label>
                <Input
                  placeholder="http://127.0.0.1:11434/v1"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 3. 自定义 OpenAI 兼容端点 */}
          <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Globe className="size-4 text-blue-500" />
              手动添加自定义 API (OpenAI 兼容)
            </h3>
            <form onSubmit={handleAddApi} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">显示名称</Label>
                  <Input
                    placeholder="如: 硅基流动 Qwen-Max"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">模型标识 (Model ID)</Label>
                  <Input
                    placeholder="如: Qwen/Qwen2.5-72B-Instruct"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Base URL (接口地址)</Label>
                  <Input
                    placeholder="如: https://api.siliconflow.cn/v1 或 https://openrouter.ai/api/v1"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">API Key</Label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" size="sm" className="w-full">
                <Plus className="size-4 mr-1" /> 添加自定义 API 端点
              </Button>
            </form>

            {/* 已配置的自定义 API */}
            {customApis.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="text-xs font-semibold text-muted-foreground">
                  已添加的自定义模型 ({customApis.length})
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {customApis.map((api) => (
                    <div
                      key={api.id}
                      className="flex items-center justify-between p-2 rounded-lg border bg-background text-xs"
                    >
                      <div className="truncate mr-2">
                        <div className="font-medium text-foreground">{api.name}</div>
                        <div className="text-muted-foreground font-mono text-[11px] truncate">
                          {api.modelId} · {api.baseUrl}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive shrink-0"
                        onClick={() => handleDeleteApi(api.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. GitHub 访问令牌 */}
          <div className="border rounded-xl p-4 space-y-2 bg-muted/20">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Key className="size-4 text-emerald-500" />
              GitHub 个人访问令牌 (PAT)
            </h3>
            <p className="text-xs text-muted-foreground">
              直连 GitHub 官方 API 浏览代码、查看分支与提交推送代码所需。
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="ghp_... 或 github_pat_..."
                value={githubPat}
                onChange={(e) => setGithubPat(e.target.value)}
              />
              <Button size="sm" onClick={handleSaveGithubPat}>
                保存令牌
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
