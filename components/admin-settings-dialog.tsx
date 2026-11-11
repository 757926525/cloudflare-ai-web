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
  const [activeTab, setActiveTab] = useState<"keys" | "custom" | "guide" | "deploy" | "appearance">("keys");
  const [customApis, setCustomApis] = useState<CustomApiConfig[]>([]);
  const [name, setName] = useState("");
  const [modelId, setModelId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isFreeApi, setIsFreeApi] = useState(false);

  // Cloudflare Workers AI Credentials
  const [cfAccountId, setCfAccountId] = useState("");
  const [cfToken, setCfToken] = useState("");

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

  const handleSaveProviderKeys = () => {
    if (deepseekKey.trim()) localStorage.setItem("DEEPSEEK_API_KEY", deepseekKey.trim());
    if (groqKey.trim()) localStorage.setItem("GROQ_API_KEY", groqKey.trim());
    if (googleKey.trim()) localStorage.setItem("GOOGLE_API_KEY", googleKey.trim());
    if (ollamaUrl.trim()) localStorage.setItem("OLLAMA_BASE_URL", ollamaUrl.trim());
    toast.success("大模型提供商 API Key 已成功保存");
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
              <DialogTitle className="text-base sm:text-lg">系统设置与知识中心</DialogTitle>
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
            管理 API 密钥、查看添加说明、模型详情、项目部署指南与切换主题/界面。
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
            <BookOpen className="size-3.5 mr-1" /> API 与模型详情
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
          {/* TAB 1: 平台密钥 */}
          {activeTab === "keys" && (
            <div className="space-y-4">
              <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                    <Cloud className="size-4 text-orange-500" />
                    Cloudflare Workers AI 认证
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

          {/* TAB 2: 自定义 API 接入 */}
          {activeTab === "custom" && (
            <div className="space-y-4">
              <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
                <h3 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                  <Globe className="size-4 text-blue-500" />
                  添加任意 OpenAI 兼容端点 (SiliconFlow / OpenRouter / OneAPI / vLLM)
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

          {/* TAB 3: 界面与主题 */}
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

          {/* TAB 4: API 与模型使用指南 */}
          {activeTab === "guide" && (
            <div className="border rounded-xl p-4 space-y-3 bg-muted/20 text-xs text-muted-foreground leading-relaxed">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                <BookOpen className="size-4 text-primary" />
                各种模型详情与 API 获取说明
              </h3>
              <div className="space-y-3">
                <div className="p-2.5 rounded-lg bg-background border space-y-1">
                  <div className="font-semibold text-foreground">1. Cloudflare Workers AI (排首位)</div>
                  <p>
                    全球分布式边缘推理，支持 Llama 3.1、QWQ-32B、Kimi K2.6、GLM-4.7 等大模型。
                    在 Cloudflare 控制台创建 Workers AI 令牌即可填入获得极速体验。
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border space-y-1">
                  <div className="font-semibold text-foreground">2. Groq 极速推理 (限额免费)</div>
                  <p>
                    基于 LPU 硬件芯片加速，每秒数十 Token 输出。可在 <code className="bg-muted px-1 rounded">console.groq.com/keys</code> 免费创建 API Key。
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border space-y-1">
                  <div className="font-semibold text-foreground">3. Google Gemini (含免费额度)</div>
                  <p>
                    在 Google AI Studio (<code className="bg-muted px-1 rounded">aistudio.google.com</code>) 申请，支持 Gemini 2.5 Flash / Pro 超长上下文推理。
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border space-y-1">
                  <div className="font-semibold text-foreground">4. 本地 Ollama (完全免费离线)</div>
                  <p>
                    本地运行 <code className="bg-muted px-1 rounded">ollama run qwen2.5-coder</code>，零数据泄露风险，无任何额外开销。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: 部署全指南 */}
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
