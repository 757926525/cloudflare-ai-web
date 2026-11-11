"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Key,
  Globe,
  Shield,
  Cloud,
  Sparkles,
  BookOpen,
  Server,
  LogOut,
  Palette,
  Smartphone,
  Monitor,
  Database,
  Lock,
  UploadCloud,
  DownloadCloud,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { CustomApiConfig } from "@/lib/models";
import { useThemeCustom, type ColorTheme, type ViewportMode } from "@/lib/theme-custom";
import { pushChatHistoryToKv, pullChatHistoryFromKv } from "@/lib/kv-sync";

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
  const [activeTab, setActiveTab] = useState<"keys" | "custom" | "kv" | "guide" | "deploy" | "appearance">("keys");
  const [customApis, setCustomApis] = useState<CustomApiConfig[]>([]);
  const [name, setName] = useState("");
  const [modelId, setModelId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isFreeApi, setIsFreeApi] = useState(false);

  // Cloudflare Workers AI Credentials
  const [cfAccountId, setCfAccountId] = useState("");
  const [cfToken, setCfToken] = useState("");

  // Cloudflare KV Namespace ID
  const [kvNamespaceId, setKvNamespaceId] = useState("");
  const [syncing, setSyncing] = useState(false);

  // 全站管理员登录保护开关 (开启后只有管理员登录才能使用，关闭时普通用户可用，默认关闭)
  const [authEnforced, setAuthEnforced] = useState(false);

  // OpenAI Native API
  const [openAiKey, setOpenAiKey] = useState("");
  const [openAiBaseUrl, setOpenAiBaseUrl] = useState("https://api.openai.com/v1");

  // Other AI Provider Keys
  const [deepseekKey, setDeepseekKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("");

  const { colorTheme, setColorTheme, viewportMode, setViewportMode } = useThemeCustom();

  useEffect(() => {
    if (open) {
      setCustomApis(getStoredCustomApis());
      setCfAccountId(localStorage.getItem("CF_ACCOUNT_ID") || "");
      setCfToken(localStorage.getItem("CF_WORKERS_AI_TOKEN") || "");
      setKvNamespaceId(localStorage.getItem("CF_KV_NAMESPACE_ID") || "");
      setAuthEnforced(localStorage.getItem("CF_AI_AUTH_REQUIRED") === "true");
      setOpenAiKey(localStorage.getItem("OPENAI_API_KEY") || "");
      setOpenAiBaseUrl(localStorage.getItem("OPENAI_BASE_URL") || "https://api.openai.com/v1");
      setDeepseekKey(localStorage.getItem("DEEPSEEK_API_KEY") || "");
      setGroqKey(localStorage.getItem("GROQ_API_KEY") || "");
      setGoogleKey(localStorage.getItem("GOOGLE_API_KEY") || "");
      setOllamaUrl(localStorage.getItem("OLLAMA_BASE_URL") || "http://127.0.0.1:11434/v1");
    }
  }, [open]);

  const handleSaveCfConfig = () => {
    if (cfAccountId.trim()) localStorage.setItem("CF_ACCOUNT_ID", cfAccountId.trim());
    if (cfToken.trim()) localStorage.setItem("CF_WORKERS_AI_TOKEN", cfToken.trim());
    toast.success("Cloudflare Workers AI 凭据已保存");
  };

  const handleSaveOpenAiConfig = () => {
    if (openAiKey.trim()) localStorage.setItem("OPENAI_API_KEY", openAiKey.trim());
    if (openAiBaseUrl.trim()) localStorage.setItem("OPENAI_BASE_URL", openAiBaseUrl.trim());
    toast.success("OpenAI 平台 API 接口配置已保存");
  };

  const handleSaveProviderKeys = () => {
    if (deepseekKey.trim()) localStorage.setItem("DEEPSEEK_API_KEY", deepseekKey.trim());
    if (groqKey.trim()) localStorage.setItem("GROQ_API_KEY", groqKey.trim());
    if (googleKey.trim()) localStorage.setItem("GOOGLE_API_KEY", googleKey.trim());
    if (ollamaUrl.trim()) localStorage.setItem("OLLAMA_BASE_URL", ollamaUrl.trim());
    toast.success("各大模型提供商 API Key 已成功保存");
  };

  const handleToggleAuthEnforced = (checked: boolean) => {
    setAuthEnforced(checked);
    localStorage.setItem("CF_AI_AUTH_REQUIRED", checked ? "true" : "false");
    window.dispatchEvent(new Event("auth-enforce-changed"));
    if (checked) {
      toast.warning("已开启强制登录界面！普通访客必须登录管理员后方可使用");
    } else {
      toast.info("已关闭登录界面限制，普通访客可自由使用");
    }
  };

  const handleSaveKvConfig = () => {
    localStorage.setItem("CF_KV_NAMESPACE_ID", kvNamespaceId.trim());
    toast.success("Cloudflare KV 配置已保存");
  };

  const handlePushToKv = async () => {
    setSyncing(true);
    try {
      await pushChatHistoryToKv();
      toast.success("本地历史对话已成功备份同步至 Cloudflare KV 数据库！");
    } catch (err: any) {
      toast.error(err.message || "同步至 KV 失败");
    } finally {
      setSyncing(false);
    }
  };

  const handlePullFromKv = async () => {
    setSyncing(true);
    try {
      const restored = await pullChatHistoryFromKv();
      toast.success(`成功从 Cloudflare KV 恢复 ${restored} 个历史会话！`);
    } catch (err: any) {
      toast.error(err.message || "从 KV 恢复失败");
    } finally {
      setSyncing(false);
    }
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
      isFree: isFreeApi,
      pricingLabel: isFreeApi ? "免费" : "按量收费",
    };

    const updated = [...customApis, newApi];
    setCustomApis(updated);
    localStorage.setItem(CUSTOM_API_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("custom-apis-updated"));

    toast.success(`自定义模型「${newApi.name}」已添加`);
    setName("");
    setModelId("");
    setBaseUrl("");
    setApiKey("");
    setIsFreeApi(false);
  };

  const handleDeleteApi = (id: string) => {
    const updated = customApis.filter((item) => item.id !== id);
    setCustomApis(updated);
    localStorage.setItem(CUSTOM_API_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("custom-apis-updated"));
    toast.success("自定义模型已删除");
  };

  const handleLogout = () => {
    localStorage.removeItem("CF_AI_IS_ADMIN");
    localStorage.removeItem("CF_AI_PASSWORD");
    window.dispatchEvent(new Event("auth-changed"));
    onOpenChange(false);
    toast.info("已退出管理员模式并清除会话");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              <DialogTitle className="text-base sm:text-lg">系统设置与 API 管理中心</DialogTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="size-3.5 mr-1" /> 退出管理
            </Button>
          </div>
          <DialogDescription className="text-xs">
            管理平台 API 密钥（含 OpenAI 原生接口）、全站访问登录开关、Cloudflare KV 同步与多端部署。
          </DialogDescription>
        </DialogHeader>

        {/* 导航标签切换 */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 border-b text-xs">
          <Button
            size="sm"
            variant={activeTab === "keys" ? "default" : "ghost"}
            className="h-8 text-xs shrink-0"
            onClick={() => setActiveTab("keys")}
          >
            <Key className="size-3.5 mr-1" /> 平台 API 密钥
          </Button>
          <Button
            size="sm"
            variant={activeTab === "kv" ? "default" : "ghost"}
            className="h-8 text-xs shrink-0"
            onClick={() => setActiveTab("kv")}
          >
            <Database className="size-3.5 mr-1" /> KV 数据库同步
          </Button>
          <Button
            size="sm"
            variant={activeTab === "custom" ? "default" : "ghost"}
            className="h-8 text-xs shrink-0"
            onClick={() => setActiveTab("custom")}
          >
            <Globe className="size-3.5 mr-1" /> 自定义 API 接入
          </Button>
          <Button
            size="sm"
            variant={activeTab === "appearance" ? "default" : "ghost"}
            className="h-8 text-xs shrink-0"
            onClick={() => setActiveTab("appearance")}
          >
            <Palette className="size-3.5 mr-1" /> 手机/电脑视图与主题
          </Button>
          <Button
            size="sm"
            variant={activeTab === "guide" ? "default" : "ghost"}
            className="h-8 text-xs shrink-0"
            onClick={() => setActiveTab("guide")}
          >
            <BookOpen className="size-3.5 mr-1" /> API 使用说明文件
          </Button>
          <Button
            size="sm"
            variant={activeTab === "deploy" ? "default" : "ghost"}
            className="h-8 text-xs shrink-0"
            onClick={() => setActiveTab("deploy")}
          >
            <Server className="size-3.5 mr-1" /> 部署全指南
          </Button>
        </div>

        <div className="space-y-4 pt-1">
          {/* TAB 1: 平台密钥 (含 OpenAI 官方与管理员登录界面开关) */}
          {activeTab === "keys" && (
            <div className="space-y-4">
              {/* 全站管理员登录锁定开关 */}
              <div className="border rounded-xl p-4 space-y-2 bg-amber-500/5 border-amber-500/20">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs sm:text-sm flex items-center gap-1.5 text-foreground">
                    <Lock className="size-4 text-amber-500" />
                    开启登录界面保护 (全站仅管理员可用)
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={authEnforced}
                      onChange={(e) => handleToggleAuthEnforced(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <strong>开关作用说明：</strong>
                  开启后，任何未登录的普通访客打开网站时将强制弹出登录界面，只有输入管理员密码（<code>APP_PASSWORD</code>）登录后才能使用；关闭时，普通访客可无需登录直接使用。默认关闭。
                </p>
              </div>

              {/* Cloudflare Workers AI */}
              <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                    <Cloud className="size-4 text-orange-500" />
                    Cloudflare Workers AI 认证 (首选推荐)
                  </span>
                  <Button size="sm" onClick={handleSaveCfConfig} className="h-7 text-xs">
                    保存 CF 密钥
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs">Cloudflare Account ID</Label>
                    <Input
                      placeholder="您的 32 位 Cloudflare 账户 ID"
                      value={cfAccountId}
                      onChange={(e) => setCfAccountId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Workers AI API Token</Label>
                    <Input
                      type="password"
                      placeholder="带有 Workers AI 权限的令牌"
                      value={cfToken}
                      onChange={(e) => setCfToken(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* OpenAI 官方平台 */}
              <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                    <Sparkles className="size-4 text-emerald-500" />
                    OpenAI 官方原生接口选项
                  </span>
                  <Button size="sm" onClick={handleSaveOpenAiConfig} className="h-7 text-xs">
                    保存 OpenAI 配置
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs">OpenAI API Key (sk-...)</Label>
                    <Input
                      type="password"
                      placeholder="sk-proj-..."
                      value={openAiKey}
                      onChange={(e) => setOpenAiKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">OpenAI 接口地址 (Base URL)</Label>
                    <Input
                      placeholder="https://api.openai.com/v1"
                      value={openAiBaseUrl}
                      onChange={(e) => setOpenAiBaseUrl(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 其他常用大模型 */}
              <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                    <Sparkles className="size-4 text-primary" />
                    其他常用大模型密钥
                  </span>
                  <Button size="sm" onClick={handleSaveProviderKeys} className="h-7 text-xs">
                    保存模型密钥
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs">DeepSeek 官方 API Key (极低成本)</Label>
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={deepseekKey}
                      onChange={(e) => setDeepseekKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Groq 免费 API Key (极速推理)</Label>
                    <Input
                      type="password"
                      placeholder="gsk_..."
                      value={groqKey}
                      onChange={(e) => setGroqKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Google Gemini API Key (免费配额)</Label>
                    <Input
                      type="password"
                      placeholder="AIzaSy..."
                      value={googleKey}
                      onChange={(e) => setGoogleKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">本地 Ollama Base URL (完全免费/离线)</Label>
                    <Input
                      placeholder="http://127.0.0.1:11434/v1"
                      value={ollamaUrl}
                      onChange={(e) => setOllamaUrl(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Cloudflare KV 数据库同步 */}
          {activeTab === "kv" && (
            <div className="space-y-4">
              <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs sm:text-sm flex items-center gap-1.5 text-foreground">
                    <Database className="size-4 text-blue-500" />
                    Cloudflare KV 命名空间配置
                  </span>
                  <Button size="sm" onClick={handleSaveKvConfig} className="h-7 text-xs">
                    保存 KV 配置
                  </Button>
                </div>
                <div className="space-y-1 text-xs">
                  <Label className="text-xs">Cloudflare KV Namespace ID</Label>
                  <Input
                    placeholder="例如: 32位 KV 命名空间 ID (绑定 CF_AI_KV 时可留空)"
                    value={kvNamespaceId}
                    onChange={(e) => setKvNamespaceId(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    若已在 Cloudflare Pages 设置中绑定 <code>CF_AI_KV</code> 变量，则自动实现零配置云端同步。
                  </p>
                </div>
              </div>

              <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
                <span className="font-semibold text-xs sm:text-sm text-foreground">
                  历史对话数据云端同步操作
                </span>
                <p className="text-xs text-muted-foreground">
                  连接 KV 数据库后，你可以将所有历史会话和消息一键备份到云端，也可以从云端拉取恢复历史对话：
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <Button
                    variant="outline"
                    className="h-9 text-xs flex items-center justify-center gap-1.5"
                    onClick={handlePushToKv}
                    disabled={syncing}
                  >
                    <UploadCloud className="size-4 text-primary" />
                    备份当前历史到 KV 数据库
                  </Button>
                  <Button
                    variant="default"
                    className="h-9 text-xs flex items-center justify-center gap-1.5"
                    onClick={handlePullFromKv}
                    disabled={syncing}
                  >
                    <DownloadCloud className="size-4" />
                    从 KV 数据库恢复历史对话
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 自定义 API 接入 */}
          {activeTab === "custom" && (
            <div className="space-y-4">
              <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
                <h3 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                  <Globe className="size-4 text-blue-500" />
                  手动加入任意 OpenAI 兼容端点 (SiliconFlow / OpenRouter / OneAPI / vLLM)
                </h3>
                <form onSubmit={handleAddApi} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <Label className="text-xs">显示名称</Label>
                      <Input
                        placeholder="例如: 硅基流动 Qwen-2.5"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">模型标识 (Model ID)</Label>
                      <Input
                        placeholder="例如: Qwen/Qwen2.5-72B-Instruct"
                        value={modelId}
                        onChange={(e) => setModelId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Base URL (接口地址)</Label>
                      <Input
                        placeholder="例如: https://api.siliconflow.cn/v1"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">API Key</Label>
                      <Input
                        type="password"
                        placeholder="sk-..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="isFreeCheck"
                        checked={isFreeApi}
                        onChange={(e) => setIsFreeApi(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="isFreeCheck" className="text-xs cursor-pointer select-none">
                        标记此模型为【免费】模型
                      </label>
                    </div>
                  </div>

                  <Button type="submit" size="sm" className="w-full text-xs">
                    <Plus className="size-3.5 mr-1" /> 添加模型到列表
                  </Button>
                </form>
              </div>

              {/* 已有列表 */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  已添加的自定义模型 ({customApis.length})
                </h4>
                {customApis.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">暂无自定义模型，可通过上方表单添加。</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {customApis.map((api) => (
                      <div
                        key={api.id}
                        className="flex items-center justify-between p-2 rounded-lg border bg-background text-xs"
                      >
                        <div className="truncate mr-2">
                          <div className="font-medium flex items-center gap-1.5">
                            {api.name}
                            <Badge variant={api.isFree ? "default" : "secondary"} className="text-[9px] px-1 h-3.5">
                              {api.isFree ? "免费" : "收费"}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground font-mono text-[10px] truncate">
                            {api.modelId} · {api.baseUrl}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6 text-destructive shrink-0"
                          onClick={() => handleDeleteApi(api.id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: 界面与主题 */}
          {activeTab === "appearance" && (
            <div className="space-y-4">
              <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
                <h3 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                  <Smartphone className="size-4 text-primary" />
                  布局模式切换 (手机界面 / 电脑全屏)
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant={viewportMode === "auto" ? "default" : "outline"}
                    className="text-xs h-9 flex items-center gap-1"
                    onClick={() => setViewportMode("auto")}
                  >
                    自适应 (默认)
                  </Button>
                  <Button
                    size="sm"
                    variant={viewportMode === "mobile" ? "default" : "outline"}
                    className="text-xs h-9 flex items-center gap-1"
                    onClick={() => setViewportMode("mobile")}
                  >
                    <Smartphone className="size-3.5" /> 手机端模拟
                  </Button>
                  <Button
                    size="sm"
                    variant={viewportMode === "desktop" ? "default" : "outline"}
                    className="text-xs h-9 flex items-center gap-1"
                    onClick={() => setViewportMode("desktop")}
                  >
                    <Monitor className="size-3.5" /> 电脑宽屏
                  </Button>
                </div>
              </div>

              <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
                <h3 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                  <Palette className="size-4 text-purple-500" />
                  主题色彩选择 (适用于手机与大屏)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "dark", name: "现代深色", bg: "bg-neutral-900 text-white" },
                    { id: "light", name: "清爽浅色", bg: "bg-white text-black border" },
                    { id: "oled", name: "纯黑极简 (OLED超省电)", bg: "bg-black text-white" },
                    { id: "purple", name: "科技暗紫", bg: "bg-purple-950 text-purple-200" },
                    { id: "cyan", name: "极光青蓝", bg: "bg-cyan-950 text-cyan-200" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setColorTheme(t.id as ColorTheme)}
                      className={`p-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${t.bg} ${
                        colorTheme === t.id ? "ring-2 ring-primary ring-offset-2" : "opacity-80 hover:opacity-100"
                      }`}
                    >
                      <span>{t.name}</span>
                      {colorTheme === t.id && <span className="text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: API 与模型使用说明文件 */}
          {activeTab === "guide" && (
            <div className="border rounded-xl p-4 space-y-3 bg-muted/20 text-xs text-muted-foreground leading-relaxed">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                <BookOpen className="size-4 text-primary" />
                API 接口使用说明与模型详细指南
              </h3>
              <div className="space-y-3">
                <div className="p-2.5 rounded-lg bg-background border space-y-1">
                  <div className="font-semibold text-foreground">1. OpenAI 官方原生接口说明</div>
                  <p>
                    • <strong>获取方式</strong>：访问 <code className="bg-muted px-1 rounded">https://platform.openai.com/api-keys</code> 创建 API Key。<br />
                    • <strong>接口地址 (Base URL)</strong>：默认为 <code>https://api.openai.com/v1</code>。若在国内无法直连或使用聚合转接，可填写自定义反向代理或中转地址。<br />
                    • <strong>支持模型</strong>：GPT-4o、GPT-4o-mini、o1、o3-mini，输入图文多模态及推理链全支持。
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border space-y-1">
                  <div className="font-semibold text-foreground">2. Cloudflare Workers AI (排首位)</div>
                  <p>
                    • <strong>获取方式</strong>：登录 Cloudflare 控制台 -&gt; 点击左侧 Workers &amp; Pages -&gt; 访问 AI -&gt; 管理账户 API 令牌，使用 Workers AI 模板创建。<br />
                    • <strong>全功能</strong>：完全无需服务端 Node.js 镜像，部署在 Cloudflare Pages 上即可通过 Pages Functions 零成本无限制转发。
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border space-y-1">
                  <div className="font-semibold text-foreground">3. Groq 极速推理 (限额免费)</div>
                  <p>
                    基于 LPU 硬件芯片加速，每秒数十 Token 输出。可在 <code className="bg-muted px-1 rounded">https://console.groq.com/keys</code> 免费创建 API Key。
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border space-y-1">
                  <div className="font-semibold text-foreground">4. Google Gemini (含免费额度)</div>
                  <p>
                    在 Google AI Studio (<code className="bg-muted px-1 rounded">https://aistudio.google.com/apikey</code>) 申请，支持 Gemini 2.5 Flash / Pro 超长上下文推理。
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border space-y-1">
                  <div className="font-semibold text-foreground">5. 本地 Ollama (完全免费离线)</div>
                  <p>
                    本地安装 Ollama 并执行 <code className="bg-muted px-1 rounded">ollama run qwen2.5-coder</code>，零数据泄露风险，无任何额外开销。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: 部署全指南 */}
          {activeTab === "deploy" && (
            <div className="border rounded-xl p-4 space-y-3 bg-muted/20 text-xs text-muted-foreground leading-relaxed">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                <Server className="size-4 text-primary" />
                本项目多平台部署详细指南
              </h3>
              <div className="space-y-3">
                <div className="p-2.5 rounded-lg bg-background border space-y-1">
                  <div className="font-semibold text-foreground">Cloudflare Pages (首选推荐，100%成功)</div>
                  <p>
                    1. 在 Cloudflare Dashboard 接入 Git 仓库。<br />
                    2. 构建命令：<code>npm run build</code>（静态导出）。<br />
                    3. 输出目录：<code>out</code>。<br />
                    无需复杂 Edge 依赖，直接部署永久稳定。
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border space-y-1">
                  <div className="font-semibold text-foreground">Docker / Docker Compose</div>
                  <p>
                    在仓库根目录执行：<code>docker compose up -d</code>。<br />
                    访问 <code>http://localhost:3000</code> 即可立即使用。
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border space-y-1">
                  <div className="font-semibold text-foreground">Vercel / Netlify / Zeabur / Railway</div>
                  <p>
                    直接导入 Git 仓库，所有配置均已内置适配（<code>netlify.toml</code> 等），一键即刻上线。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
