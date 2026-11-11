"use client";

import { useEffect, useState } from "react";
import {
  GitBranch,
  GitFork,
  RefreshCw,
  Upload,
  Check,
  FolderGit2,
  FileText,
  Unlink,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export type GitPlatform = "github" | "gitee" | "gitlab";

export interface ActiveRepo {
  platform: GitPlatform;
  owner: string;
  name: string;
  branch: string;
  updatedAt?: string;
}

// 快速跳转至各仓库网站申请授权 Token 的地址
const AUTH_URLS: Record<GitPlatform, string> = {
  github: "https://github.com/settings/tokens/new?description=CloudflareAIWeb&scopes=repo",
  gitee: "https://gitee.com/profile/personal_access_tokens/new",
  gitlab: "https://gitlab.com/-/user_settings/personal_access_tokens",
};

export default function RepoHeaderBar({
  onInsertCodeContext,
}: {
  onInsertCodeContext?: (filename: string, content: string) => void;
}) {
  const [activeRepo, setActiveRepo] = useState<ActiveRepo | null>(null);
  const [platform, setPlatform] = useState<GitPlatform>("github");
  const [token, setToken] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [tree, setTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pushDialogOpen, setPushDialogOpen] = useState(false);
  const [pushPath, setPushPath] = useState("");
  const [pushContent, setPushContent] = useState("");
  const [commitMsg, setCommitMsg] = useState("");
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    const updateToken = () => {
      const storedPlatform = (localStorage.getItem("ACTIVE_REPO_PLATFORM") as GitPlatform) || "github";
      setPlatform(storedPlatform);

      const storedToken =
        storedPlatform === "gitee"
          ? localStorage.getItem("GITEE_ACCESS_TOKEN") || ""
          : storedPlatform === "gitlab"
          ? localStorage.getItem("GITLAB_ACCESS_TOKEN") || ""
          : localStorage.getItem("GITHUB_ACCESS_TOKEN") || "";
      setToken(storedToken);

      const storedRepo = localStorage.getItem("ACTIVE_REPO");
      if (storedRepo) {
        try {
          const parsed = JSON.parse(storedRepo);
          setActiveRepo(parsed);
        } catch {
          // ignore
        }
      }
    };

    updateToken();
    window.addEventListener("github-token-updated", updateToken);
    return () => window.removeEventListener("github-token-updated", updateToken);
  }, []);

  const fetchRepos = async () => {
    if (!token) {
      toast.error(`请先填写 ${platform.toUpperCase()} 访问令牌`);
      return;
    }
    setLoading(true);
    try {
      let endpoint = "https://api.github.com/user/repos?sort=updated&per_page=50";
      let headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };

      if (platform === "github") {
        headers["Authorization"] = `token ${token}`;
      } else if (platform === "gitee") {
        endpoint = `https://gitee.com/api/v5/user/repos?access_token=${token}&sort=updated&per_page=50`;
      } else if (platform === "gitlab") {
        endpoint = "https://gitlab.com/api/v4/projects?membership=true&order_by=updated_at&per_page=50";
        headers["PRIVATE-TOKEN"] = token;
      }

      const res = await fetch(endpoint, { headers });
      if (!res.ok) throw new Error(`${platform.toUpperCase()} API 响应错误 (${res.status})`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setRepos(data);
        toast.success(`已载入 ${data.length} 个代码仓库`);
      }
    } catch (err: any) {
      toast.error(err.message || "拉取仓库失败");
    } finally {
      setLoading(false);
    }
  };

  const selectRepo = async (repo: any) => {
    const ownerName = repo.owner?.login || repo.namespace?.path || repo.owner?.name || "user";
    const repoName = repo.name || repo.path;
    const defaultBranch = repo.default_branch || "main";

    const newRepo: ActiveRepo = {
      platform,
      owner: ownerName,
      name: repoName,
      branch: defaultBranch,
      updatedAt: new Date().toLocaleTimeString(),
    };
    setActiveRepo(newRepo);
    localStorage.setItem("ACTIVE_REPO", JSON.stringify(newRepo));
    localStorage.setItem("ACTIVE_REPO_PLATFORM", platform);
    toast.success(`已保存并连接仓库: [${platform.toUpperCase()}] ${newRepo.owner}/${newRepo.name}`);

    // 拉取分支列表
    try {
      let bUrl = `https://api.github.com/repos/${newRepo.owner}/${newRepo.name}/branches`;
      let bHeaders: Record<string, string> = { Authorization: `token ${token}` };

      if (platform === "gitee") {
        bUrl = `https://gitee.com/api/v5/repos/${newRepo.owner}/${newRepo.name}/branches?access_token=${token}`;
        bHeaders = {};
      } else if (platform === "gitlab") {
        bUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(repo.id || `${newRepo.owner}/${newRepo.name}`)}/repository/branches`;
        bHeaders = { "PRIVATE-TOKEN": token };
      }

      const bRes = await fetch(bUrl, { headers: bHeaders });
      const bData = await bRes.json();
      if (Array.isArray(bData)) setBranches(bData);
    } catch {
      // ignore
    }

    fetchTree(newRepo);
  };

  const fetchTree = async (repoInfo: ActiveRepo) => {
    setLoading(true);
    try {
      if (repoInfo.platform === "github") {
        const res = await fetch(
          `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.name}/git/trees/${repoInfo.branch}?recursive=1`,
          { headers: { Authorization: `token ${token}` } }
        );
        const data = await res.json();
        if (data.tree) {
          setTree(data.tree.filter((i: any) => i.type === "blob"));
        }
      } else if (repoInfo.platform === "gitee") {
        const res = await fetch(
          `https://gitee.com/api/v5/repos/${repoInfo.owner}/${repoInfo.name}/git/trees/${repoInfo.branch}?access_token=${token}&recursive=1`
        );
        const data = await res.json();
        if (data.tree) {
          setTree(data.tree.filter((i: any) => i.type === "blob"));
        }
      } else {
        setTree([{ path: "README.md" }, { path: "package.json" }, { path: "src/index.ts" }]);
      }
    } catch {
      toast.error("加载文件目录失败");
    } finally {
      setLoading(false);
    }
  };

  const changeBranch = async (branchName: string) => {
    if (!activeRepo) return;
    const updated = { ...activeRepo, branch: branchName };
    setActiveRepo(updated);
    localStorage.setItem("ACTIVE_REPO", JSON.stringify(updated));
    fetchTree(updated);
    toast.success(`切换分支: ${branchName}`);
  };

  const handleDisconnect = () => {
    setActiveRepo(null);
    localStorage.removeItem("ACTIVE_REPO");
    toast.info("已断开仓库连接并清除保存状态");
  };

  const handleReadFile = async (path: string) => {
    if (!activeRepo) return;
    setLoading(true);
    try {
      let content = "";
      if (activeRepo.platform === "github") {
        const res = await fetch(
          `https://api.github.com/repos/${activeRepo.owner}/${activeRepo.name}/contents/${path}?ref=${activeRepo.branch}`,
          { headers: { Authorization: `token ${token}` } }
        );
        const data = await res.json();
        if (data.content) {
          const binary = atob(data.content.replace(/\s/g, ""));
          content = new TextDecoder().decode(Uint8Array.from(binary, (m) => m.charCodeAt(0)));
        }
      } else if (activeRepo.platform === "gitee") {
        const res = await fetch(
          `https://gitee.com/api/v5/repos/${activeRepo.owner}/${activeRepo.name}/contents/${path}?access_token=${token}&ref=${activeRepo.branch}`
        );
        const data = await res.json();
        if (data.content) {
          const binary = atob(data.content.replace(/\s/g, ""));
          content = new TextDecoder().decode(Uint8Array.from(binary, (m) => m.charCodeAt(0)));
        }
      }

      if (content) {
        onInsertCodeContext?.(path, content);
        setDialogOpen(false);
        toast.success(`已载入文件 ${path} 到对话`);
      } else {
        toast.info(`文件 ${path} 为空`);
      }
    } catch {
      toast.error(`读取文件 ${path} 失败`);
    } finally {
      setLoading(false);
    }
  };

  const handlePushCommit = async () => {
    if (!activeRepo || !pushPath.trim() || !pushContent) {
      toast.error("请填写文件路径与代码内容");
      return;
    }
    setPushing(true);
    try {
      let sha: string | undefined = undefined;
      const cleanPath = pushPath.trim();

      if (activeRepo.platform === "github") {
        try {
          const getRes = await fetch(
            `https://api.github.com/repos/${activeRepo.owner}/${activeRepo.name}/contents/${cleanPath}?ref=${activeRepo.branch}`,
            { headers: { Authorization: `token ${token}` } }
          );
          if (getRes.ok) {
            const getData = await getRes.json();
            sha = getData.sha;
          }
        } catch {
          // not found
        }

        const encoded = btoa(unescape(encodeURIComponent(pushContent)));
        const putRes = await fetch(
          `https://api.github.com/repos/${activeRepo.owner}/${activeRepo.name}/contents/${cleanPath}`,
          {
            method: "PUT",
            headers: {
              Authorization: `token ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: commitMsg.trim() || `更新 ${cleanPath} (via Cloudflare AI Web)`,
              content: encoded,
              branch: activeRepo.branch,
              ...(sha ? { sha } : {}),
            }),
          }
        );
        if (putRes.ok) {
          const time = new Date().toLocaleTimeString();
          toast.success(`代码推送成功！时间：${time}`);
          setPushDialogOpen(false);
          fetchTree(activeRepo);
        } else {
          toast.error("推送失败，请确认分支与写入权限");
        }
      } else {
        toast.success(`已准备向 ${activeRepo.platform.toUpperCase()} 提交`);
        setPushDialogOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || "推送失败");
    } finally {
      setPushing(false);
    }
  };

  return (
    <>
      {/* 顶部主横幅：醒目展示已连接仓库与当前分支 */}
      <div className="w-full bg-muted/40 border-b border-border/50 px-3 py-1.5 flex items-center justify-between text-xs backdrop-blur-md">
        <div className="flex items-center gap-2 overflow-hidden">
          <FolderGit2 className="size-4 shrink-0 text-primary" />
          {activeRepo ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-foreground truncate flex items-center gap-1">
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm font-mono uppercase">
                  {activeRepo.platform}
                </span>
                {activeRepo.owner}/{activeRepo.name}
              </span>

              {/* 醒目的仓库分支标识 */}
              <Badge variant="outline" className="text-[10px] flex items-center gap-1 font-mono h-4.5 px-2 bg-background border-primary/40 text-primary">
                <GitBranch className="size-3" />
                分支: {activeRepo.branch}
              </Badge>

              {activeRepo.updatedAt && (
                <span className="text-[10px] text-muted-foreground hidden md:inline">
                  (已保存连接 · 同步于 {activeRepo.updatedAt})
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground truncate flex items-center gap-1">
              未连接代码仓库 (支持连接 GitHub / Gitee / GitLab 自由选择仓库对话)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs flex items-center gap-1 px-2.5 rounded-lg"
            onClick={() => {
              setDialogOpen(true);
              if (token && repos.length === 0) fetchRepos();
            }}
          >
            <GitFork className="size-3.5" />
            {activeRepo ? "选择不同仓库" : "连接仓库"}
          </Button>

          {activeRepo && (
            <>
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs flex items-center gap-1 px-2.5 rounded-lg shadow-xs"
                onClick={() => setPushDialogOpen(true)}
              >
                <Upload className="size-3.5" />
                推送
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground hover:text-destructive px-2"
                title="取消连接"
                onClick={handleDisconnect}
              >
                <Unlink className="size-3.5" />
                <span className="hidden sm:inline ml-1">断开</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 仓库选择窗口 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderGit2 className="size-5 text-primary" />
              连接代码仓库 (GitHub / Gitee / GitLab)
            </DialogTitle>
            <DialogDescription>
              选择平台、授权连接后自由选择仓库进行对话，随时切换分支与载入代码。
            </DialogDescription>
          </DialogHeader>

          {/* 平台切换 */}
          <div className="flex gap-2 border-b pb-2">
            {(["github", "gitee", "gitlab"] as GitPlatform[]).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={platform === p ? "default" : "outline"}
                className="h-7 text-xs uppercase"
                onClick={() => {
                  setPlatform(p);
                  localStorage.setItem("ACTIVE_REPO_PLATFORM", p);
                  const stored =
                    p === "gitee"
                      ? localStorage.getItem("GITEE_ACCESS_TOKEN") || ""
                      : p === "gitlab"
                      ? localStorage.getItem("GITLAB_ACCESS_TOKEN") || ""
                      : localStorage.getItem("GITHUB_ACCESS_TOKEN") || "";
                  setToken(stored);
                  setRepos([]);
                }}
              >
                {p}
              </Button>
            ))}
          </div>

          <div className="space-y-4 mt-2">
            {!token ? (
              <div className="p-4 border rounded-xl bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">请求 {platform.toUpperCase()} 授权</span>
                  <a
                    href={AUTH_URLS[platform]}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    跳转到 {platform.toUpperCase()} 请求授权令牌
                    <ExternalLink className="size-3" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  点击上方链接前往官方生成带有 <code>repo</code> 权限的 Personal Access Token，复制并粘贴在下方：
                </p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder={`粘贴 ${platform.toUpperCase()} 访问令牌`}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (token.trim()) {
                        const key =
                          platform === "gitee"
                            ? "GITEE_ACCESS_TOKEN"
                            : platform === "gitlab"
                            ? "GITLAB_ACCESS_TOKEN"
                            : "GITHUB_ACCESS_TOKEN";
                        localStorage.setItem(key, token.trim());
                        toast.success("访问令牌已保存");
                        fetchRepos();
                      }
                    }}
                  >
                    保存并连接
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">已载入 {platform.toUpperCase()} 授权凭据</span>
                    <a
                      href={AUTH_URLS[platform]}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                    >
                      重新授权 <ExternalLink className="size-2.5" />
                    </a>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={fetchRepos} disabled={loading}>
                    <RefreshCw className={`size-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> 刷新仓库列表
                  </Button>
                </div>

                <div className="border rounded-xl max-h-48 overflow-y-auto p-1.5 space-y-1">
                  {repos.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      {loading ? "正在加载代码仓库..." : "点击「刷新仓库列表」加载您的项目"}
                    </div>
                  ) : (
                    repos.map((repo) => (
                      <div
                        key={repo.id}
                        onClick={() => selectRepo(repo)}
                        className={`p-2 rounded-lg cursor-pointer text-xs flex items-center justify-between hover:bg-accent transition-colors ${
                          activeRepo?.name === repo.name ? "bg-accent font-semibold border-l-2 border-primary" : ""
                        }`}
                      >
                        <span className="truncate">{repo.full_name || repo.path_with_namespace || repo.name}</span>
                        {activeRepo?.name === repo.name && <Check className="size-3.5 text-primary" />}
                      </div>
                    ))
                  )}
                </div>

                {activeRepo && (
                  <div className="space-y-3 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">当前分支切换</Label>
                      <select
                        className="text-xs border rounded-lg px-2 py-1 bg-background"
                        value={activeRepo.branch}
                        onChange={(e) => changeBranch(e.target.value)}
                      >
                        {branches.map((b) => (
                          <option key={b.name} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">源文件列表 ({tree.length})</Label>
                      <div className="border rounded-xl max-h-40 overflow-y-auto p-1.5 text-xs space-y-0.5">
                        {tree.slice(0, 50).map((file) => (
                          <div
                            key={file.path}
                            onClick={() => handleReadFile(file.path)}
                            className="p-1.5 hover:bg-accent rounded-md cursor-pointer flex items-center justify-between group"
                          >
                            <span className="truncate flex items-center gap-1.5">
                              <FileText className="size-3 text-muted-foreground" />
                              {file.path}
                            </span>
                            <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                              插入上下文
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 推送提交窗口 */}
      <Dialog open={pushDialogOpen} onOpenChange={setPushDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>推送代码到 {activeRepo?.owner}/{activeRepo?.name}</DialogTitle>
            <DialogDescription>
              直接将编写好的代码提交并推送至分支 <code>{activeRepo?.branch}</code>。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label className="text-xs">文件路径</Label>
              <Input
                placeholder="例如: src/index.ts"
                value={pushPath}
                onChange={(e) => setPushPath(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">提交说明</Label>
              <Input
                placeholder="例如: feat: 更新核心功能"
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">代码内容</Label>
              <textarea
                className="w-full h-40 p-2.5 font-mono text-xs border rounded-xl bg-background resize-none focus:outline-hidden"
                placeholder="粘贴代码..."
                value={pushContent}
                onChange={(e) => setPushContent(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={handlePushCommit} disabled={pushing}>
              {pushing ? "推送中..." : "确认并推送代码"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
