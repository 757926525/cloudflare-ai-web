"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Key, Globe, Shield } from "lucide-react";
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
  const [type, setType] = useState<"Text Generation" | "Text to Image">("Text Generation");
  const [githubPat, setGithubPat] = useState("");

  useEffect(() => {
    if (open) {
      setCustomApis(getStoredCustomApis());
      setGithubPat(localStorage.getItem("GITHUB_ACCESS_TOKEN") || "");
    }
  }, [open]);

  const handleAddApi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !modelId.trim() || !baseUrl.trim()) {
      toast.error("Please fill in Name, Model ID, and Base URL");
      return;
    }

    const newApi: CustomApiConfig = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      modelId: modelId.trim(),
      baseUrl: baseUrl.trim().replace(/\/$/, ""),
      apiKey: apiKey.trim(),
      type,
    };

    const updated = [...customApis, newApi];
    setCustomApis(updated);
    localStorage.setItem(CUSTOM_API_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("custom-apis-updated"));

    toast.success(`API "${newApi.name}" added successfully`);
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
    toast.success("API removed");
  };

  const handleSaveGithubPat = () => {
    localStorage.setItem("GITHUB_ACCESS_TOKEN", githubPat.trim());
    window.dispatchEvent(new Event("github-token-updated"));
    toast.success("GitHub Token saved");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            <DialogTitle>Admin & Custom API Settings</DialogTitle>
          </div>
          <DialogDescription>
            Manage custom OpenAI-compatible API providers, GitHub tokens, and developer settings. Only visible to administrators.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* Custom APIs Section */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Globe className="size-4" />
              Add Custom API (OpenAI Compatible)
            </h3>
            <form onSubmit={handleAddApi} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Display Name</Label>
                  <Input
                    placeholder="e.g. My Custom DeepSeek / Qwen"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Model ID</Label>
                  <Input
                    placeholder="e.g. deepseek-ai/DeepSeek-V3"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Base URL (OpenAI Compatible)</Label>
                  <Input
                    placeholder="e.g. https://api.siliconflow.cn/v1 or https://openrouter.ai/api/v1"
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
                <Plus className="size-4 mr-1" /> Add API Endpoint
              </Button>
            </form>
          </div>

          {/* Stored Custom APIs list */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Configured Custom APIs ({customApis.length})
            </h4>
            {customApis.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No custom APIs added yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {customApis.map((api) => (
                  <div
                    key={api.id}
                    className="flex items-center justify-between p-2.5 rounded-md border bg-card text-xs"
                  >
                    <div>
                      <div className="font-medium text-foreground">{api.name}</div>
                      <div className="text-muted-foreground font-mono">
                        {api.modelId} · {api.baseUrl}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteApi(api.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GitHub Token / Repository Integration */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Key className="size-4" />
              GitHub Personal Access Token (PAT)
            </h3>
            <p className="text-xs text-muted-foreground">
              Required for browsing, editing, and pushing directly to GitHub repositories. Must have <code className="bg-muted px-1 rounded">repo</code> scope.
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="ghp_... or github_pat_..."
                value={githubPat}
                onChange={(e) => setGithubPat(e.target.value)}
              />
              <Button size="sm" onClick={handleSaveGithubPat}>
                Save Token
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
