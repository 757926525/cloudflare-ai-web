"use client";

import { useEffect, useState } from "react";
import { GitBranch, GitFork, RefreshCw, Upload, Check, FolderGit2, FileText, ExternalLink, X, Unlink } from "lucide-react";
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

export interface ActiveRepo {
  owner: string;
  name: string;
  branch: string;
  updatedAt?: string;
}

export default function RepoHeaderBar({
  onInsertCodeContext,
}: {
  onInsertCodeContext?: (filename: string, content: string) => void;
}) {
  const [activeRepo, setActiveRepo] = useState<ActiveRepo | null>(null);
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
      const storedToken = localStorage.getItem("GITHUB_ACCESS_TOKEN") || "";
      setToken(storedToken);
      const storedRepo = localStorage.getItem("ACTIVE_REPO");
      if (storedRepo) {
        try {
          setActiveRepo(JSON.parse(storedRepo));
        } catch {
          // ignore
        }
      }
    };

    updateToken();
    window.addEventListener("github-token-updated", updateToken);
    return () => window.removeEventListener("github-token-updated", updateToken);
  }, []);

  // 直接调用 GitHub 官方 REST API (无需本地后端，支持 CORS)
  const fetchRepos = async () => {
    if (!token) {
      toast.error("请先在设置中填写 GitHub 个人访问令牌 (PAT)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=30", {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (!res.ok) {
        throw new Error(`GitHub API 响应失败 (${res.status})`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setRepos(data);
        toast.success(`成功加载 ${data.length} 个代码仓库`);
      }
    } catch (err: any) {
      toast.error(err.message || "拉取仓库列表失败");
    } finally {
      setLoading(false);
    }
  };

  const selectRepo = async (repo: any) => {
    const newRepo: ActiveRepo = {
      owner: repo.owner.login,
      name: repo.name,
      branch: repo.default_branch || "main",
      updatedAt: new Date().toLocaleTimeString(),
    };
    setActiveRepo(newRepo);
    localStorage.setItem("ACTIVE_REPO", JSON.stringify(newRepo));
    toast.success(`已连接仓库: ${newRepo.owner}/${newRepo.name}`);

    // 拉取分支列表
    try {
      const bRes = await fetch(`https://api.github.com/repos/${newRepo.owner}/${newRepo.name}/branches`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      const bData = await bRes.json();
      if (Array.isArray(bData)) setBranches(bData);
    } catch {
      // ignore
    }

    // 获取文件树
    fetchTree(newRepo);
  };

  const fetchTree = async (repoInfo: ActiveRepo) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.name}/git/trees/${repoInfo.branch}?recursive=1`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
      const data = await res.json();
      if (data.tree) {
        setTree(data.tree.filter((i: any) => i.type === "blob"));
      }
    } catch {
      toast.error("加载仓库文件目录失败");
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
    toast.success(`已切换分支至 ${branchName}`);
  };

  const handleDisconnect = () => {
    setActiveRepo(null);
    localStorage.removeItem("ACTIVE_REPO");
    toast.info("已取消连接代码仓库");
  };

  const handleReadFile = async (path: string) => {
    if (!activeRepo) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.github.com/repos/${activeRepo.owner}/${activeRepo.name}/contents/${path}?ref=${activeRepo.branch}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
      const data = await res.json();
      if (data.content) {
        const binary = atob(data.content.replace(/\s/g, ""));
        const bytes = Uint8Array.from(binary, (m) => m.charCodeAt(0));
        const decoded = new TextDecoder().decode(bytes);
        onInsertCodeContext?.(path, decoded);
        setDialogOpen(false);
        toast.success(`已载入文件 ${path} 至对话上下文`);
      }
    } catch {
      toast.error(`读取文件 ${path} 失败`);
    } finally {
      setLoading(false);
    }
  };

  const handlePushCommit = async () => {
    if (!activeRepo || !pushPath.trim() || !pushContent) {
      toast.error("请填写文件路径和文件内容");
      return;
    }
    setPushing(true);
    try {
      // 检查原文件 SHA（用于更新）
      let sha: string | undefined ;
      try {
        const getRes = await fetch(
          `https://api.github.com/repos/${activeRepo.owner}/${activeRepo.name}/contents/${pushPath.trim()}?ref=${activeRepo.branch}`,
          {
            headers: {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );
        if (getRes.ok) {
          const getData = await getRes.json();
          sha = getData.sha;
        }
      } catch {
        // file doesn't exist
      }

      const encodedContent = btoa(unescape(encodeURIComponent(pushContent)));
      const putRes = await fetch(
        `https://api.github.com/repos/${activeRepo.owner}/${activeRepo.name}/contents/${pushPath.trim()}`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: commitMsg.trim() || `更新 ${pushPath.trim()} (通过 Cloudflare AI Web)`,
            content: encodedContent,
            branch: activeRepo.branch,
            ...(sha ? { sha } : {}),
          }),
        }
      );

      const putData = await putRes.json();
      if (putRes.ok) {
        const timeStr = new Date().toLocaleTimeString();
        toast.success(`推送提交成功！时间：${timeStr}`);
        setPushDialogOpen(false);
        setPushPath("");
        setPushContent("");
        setCommitMsg("");
        fetchTree(activeRepo);
      } else {
        toast.error(putData.message || "推送失败，请确认分支与权限");
      }
    } catch (err: any) {
      toast.error(err.message || "推送异常");
    } finally {
      setPushing(false);
    }
  };

  return (
    <>
      <div className="w-full bg-muted/40 border-b border-border/40 px-3 py-1.5 flex items-center justify-between text-xs backdrop-blur-md">
        <div className="flex items-center gap-2 overflow-hidden">
          <FolderGit2 className="size-4 shrink-0 text-primary" />
          {activeRepo ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold text-foreground truncate">
                {activeRepo.owner}/{activeRepo.name}
              </span>
              <Badge variant="secondary" className="text-[10px] flex items-center gap-1 font-mono h-4 px-1.5">
                <GitBranch className="size-3" />
                {activeRepo.branch}
              </Badge>
              {activeRepo.updatedAt && (
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  (同步于 {activeRepo.updatedAt})
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">未连接代码仓库 (只读模式)</span>
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
            {activeRepo ? "切换仓库" : "连接代码仓库"}
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
                推送代码
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground hover:text-destructive px-2"
                title="取消连接"
                onClick={handleDisconnect}
              >
                <Unlink className="size-3.5" />
                <span className="hidden sm:inline ml-1">取消连接</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 选择仓库与分支对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderGit2 className="size-5 text-primary" />
              代码仓库连接与浏览
            </DialogTitle>
            <DialogDescription>
              在线拉取个人代码仓库、浏览源文件注入 AI 编程上下文，并支持实时提交修改。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {!token ? (
              <div className="p-4 border rounded-xl bg-muted/20 text-center space-y-3">
                <p className="text-xs text-muted-foreground">
                  尚未配置 GitHub 访问令牌。请先输入个人访问令牌 (Personal Access Token, repo权限)：
                </p>
                <div className="flex gap-2 max-w-sm mx-auto">
                  <Input
                    type="password"
                    placeholder="ghp_... 访问令牌"
                    onChange={(e) => setToken(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (token.trim()) {
                        localStorage.setItem("GITHUB_ACCESS_TOKEN", token.trim());
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
                  <span className="text-xs text-muted-foreground">已通过 GitHub 令牌认证</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={fetchRepos} disabled={loading}>
                    <RefreshCw className={`size-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> 刷新仓库列表
                  </Button>
                </div>

                {/* 仓库列表 */}
                <div className="border rounded-xl max-h-48 overflow-y-auto p-1.5 space-y-1">
                  {repos.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      {loading ? "正在从 GitHub 获取仓库..." : "点击「刷新仓库列表」加载您的项目"}
                    </div>
                  ) : (
                    repos.map((repo) => (
                      <div
                        key={repo.id}
                        onClick={() => selectRepo(repo)}
                        className={`p-2 rounded-lg cursor-pointer text-xs flex items-center justify-between hover:bg-accent transition-colors ${
                          activeRepo?.name === repo.name ? "bg-accent font-semibold" : ""
                        }`}
                      >
                        <span className="truncate">{repo.full_name}</span>
                        {activeRepo?.name === repo.name && <Check className="size-3.5 text-primary" />}
                      </div>
                    ))
                  )}
                </div>

                {/* 当前仓库分支与文件 */}
                {activeRepo && (
                  <div className="space-y-3 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">当前分支</Label>
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
                      <Label className="text-xs font-semibold">项目源文件 ({tree.length})</Label>
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
                              插入对话
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

      {/* 推送代码对话框 */}
      <Dialog open={pushDialogOpen} onOpenChange={setPushDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>推送代码到 {activeRepo?.owner}/{activeRepo?.name}</DialogTitle>
            <DialogDescription>
              直接将编写好的代码提交并推送到分支 <code>{activeRepo?.branch}</code>。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label className="text-xs">文件路径</Label>
              <Input
                placeholder="例如: src/index.ts 或 README.md"
                value={pushPath}
                onChange={(e) => setPushPath(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">提交信息 (Commit Message)</Label>
              <Input
                placeholder="例如: feat: 更新代码并修复问题"
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">代码内容</Label>
              <textarea
                className="w-full h-40 p-2.5 font-mono text-xs border rounded-xl bg-background resize-none focus:outline-hidden"
                placeholder="粘贴需提交的代码文本..."
                value={pushContent}
                onChange={(e) => setPushContent(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={handlePushCommit} disabled={pushing}>
              {pushing ? "正在提交并推送到 GitHub..." : "确认并推送提交"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
