"use client";

import { useEffect, useState } from "react";
import { GitBranch, GitFork, RefreshCw, Upload, Check, FolderGit2, FileText, ChevronRight, Key, ExternalLink } from "lucide-react";
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

    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === "GITHUB_AUTH_SUCCESS" && event.data?.token) {
        localStorage.setItem("GITHUB_ACCESS_TOKEN", event.data.token);
        setToken(event.data.token);
        window.dispatchEvent(new Event("github-token-updated"));
        toast.success("GitHub OAuth connected successfully!");
      }
    };
    window.addEventListener("message", handleOAuthMessage);

    return () => {
      window.removeEventListener("github-token-updated", updateToken);
      window.removeEventListener("message", handleOAuthMessage);
    };
  }, []);

  const handleOAuthConnect = () => {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(
      "/api/github/oauth",
      "GitHub OAuth",
      `width=${width},height=${height},top=${top},left=${left}`
    );
  };

  const fetchRepos = async () => {
    if (!token) {
      toast.error("Please connect GitHub first via OAuth or Token.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/github/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_user_repos", token }),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setRepos(data);
      } else {
        toast.error(data.error || "Failed to load repos");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const selectRepo = async (repo: any) => {
    const newRepo: ActiveRepo = {
      owner: repo.owner.login,
      name: repo.name,
      branch: repo.default_branch || "main",
    };
    setActiveRepo(newRepo);
    localStorage.setItem("ACTIVE_REPO", JSON.stringify(newRepo));
    toast.success(`Selected repository: ${newRepo.owner}/${newRepo.name}`);

    // Fetch branches
    try {
      const bRes = await fetch("/api/github/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "list_branches",
          token,
          owner: newRepo.owner,
          repo: newRepo.name,
        }),
      });
      const bData = await bRes.json();
      if (Array.isArray(bData)) setBranches(bData);
    } catch {
      // ignore
    }

    // Fetch tree
    fetchTree(newRepo);
  };

  const fetchTree = async (repoInfo: ActiveRepo) => {
    setLoading(true);
    try {
      const res = await fetch("/api/github/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_tree",
          token,
          owner: repoInfo.owner,
          repo: repoInfo.name,
          branch: repoInfo.branch,
        }),
      });
      const data = await res.json();
      if (data.tree) {
        setTree(data.tree.filter((i: any) => i.type === "blob"));
      }
    } catch (err: any) {
      toast.error("Failed to load repo files");
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
    toast.success(`Switched branch to ${branchName}`);
  };

  const handleReadFile = async (path: string) => {
    if (!activeRepo) return;
    setLoading(true);
    try {
      const res = await fetch("/api/github/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "read_file",
          token,
          owner: activeRepo.owner,
          repo: activeRepo.name,
          branch: activeRepo.branch,
          path,
        }),
      });
      const data = await res.json();
      if (data.content) {
        const binary = atob(data.content.replace(/\s/g, ""));
        const bytes = Uint8Array.from(binary, (m) => m.charCodeAt(0));
        const decoded = new TextDecoder().decode(bytes);
        onInsertCodeContext?.(path, decoded);
        setDialogOpen(false);
        toast.success(`Loaded ${path} into editor context`);
      }
    } catch {
      toast.error(`Failed to read file ${path}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePushCommit = async () => {
    if (!activeRepo || !pushPath.trim() || !pushContent) {
      toast.error("Please provide file path and content to push");
      return;
    }
    setPushing(true);
    try {
      const res = await fetch("/api/github/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "push_file",
          token,
          owner: activeRepo.owner,
          repo: activeRepo.name,
          branch: activeRepo.branch,
          path: pushPath.trim(),
          content: pushContent,
          message: commitMsg.trim() || `Update ${pushPath} via Cloudflare AI Web`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Successfully pushed to ${activeRepo.branch}!`);
        setPushDialogOpen(false);
        setPushPath("");
        setPushContent("");
        setCommitMsg("");
        fetchTree(activeRepo);
      } else {
        toast.error(data.message || data.error || "Push failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to push");
    } finally {
      setPushing(false);
    }
  };

  return (
    <>
      <div className="w-full bg-muted/40 border-b px-4 py-2 flex items-center justify-between text-xs backdrop-blur-xs">
        <div className="flex items-center gap-2 overflow-hidden">
          <FolderGit2 className="size-4 shrink-0 text-primary" />
          {activeRepo ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold text-foreground truncate">
                {activeRepo.owner}/{activeRepo.name}
              </span>
              <Badge variant="secondary" className="text-[10px] flex items-center gap-1 font-mono">
                <GitBranch className="size-3" />
                {activeRepo.branch}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">No GitHub repository connected</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs flex items-center gap-1"
            onClick={() => {
              setDialogOpen(true);
              if (token && repos.length === 0) fetchRepos();
            }}
          >
            <GitFork className="size-3.5" />
            {activeRepo ? "Change Repo" : "Connect Repo"}
          </Button>

          {activeRepo && (
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs flex items-center gap-1"
              onClick={() => setPushDialogOpen(true)}
            >
              <Upload className="size-3.5" />
              Push Code
            </Button>
          )}
        </div>
      </div>

      {/* Select Repo & Branch Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderGit2 className="size-5" />
              GitHub Repository Connection
            </DialogTitle>
            <DialogDescription>
              Connect your GitHub account to read code, browse files, and commit & push branches.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {!token ? (
              <div className="p-4 border rounded-lg bg-muted/30 text-center space-y-3">
                <p className="text-xs text-muted-foreground">
                  You are not currently authenticated with GitHub. Connect using OAuth or input your Token.
                </p>
                <div className="flex justify-center gap-2">
                  <Button size="sm" onClick={handleOAuthConnect}>
                    <ExternalLink className="size-3.5 mr-1" /> Connect via OAuth
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Token Authenticated</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={fetchRepos} disabled={loading}>
                    <RefreshCw className={`size-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh Repos
                  </Button>
                </div>

                {/* Repos list */}
                <div className="border rounded-md max-h-48 overflow-y-auto p-1 space-y-1">
                  {repos.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      {loading ? "Loading repositories..." : "Click Refresh to load your repositories"}
                    </div>
                  ) : (
                    repos.map((repo) => (
                      <div
                        key={repo.id}
                        onClick={() => selectRepo(repo)}
                        className={`p-2 rounded cursor-pointer text-xs flex items-center justify-between hover:bg-accent transition-colors ${
                          activeRepo?.name === repo.name ? "bg-accent font-semibold" : ""
                        }`}
                      >
                        <span>{repo.full_name}</span>
                        {activeRepo?.name === repo.name && <Check className="size-3.5 text-primary" />}
                      </div>
                    ))
                  )}
                </div>

                {/* Active Repo Branches & Files */}
                {activeRepo && (
                  <div className="space-y-3 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Current Branch</Label>
                      <select
                        className="text-xs border rounded px-2 py-1 bg-background"
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
                      <Label className="text-xs">Repository Files ({tree.length})</Label>
                      <div className="border rounded-md max-h-40 overflow-y-auto p-1 text-xs space-y-0.5">
                        {tree.slice(0, 50).map((file) => (
                          <div
                            key={file.path}
                            onClick={() => handleReadFile(file.path)}
                            className="p-1.5 hover:bg-accent rounded cursor-pointer flex items-center justify-between group"
                          >
                            <span className="truncate flex items-center gap-1.5">
                              <FileText className="size-3 text-muted-foreground" />
                              {file.path}
                            </span>
                            <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                              Load into chat
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

      {/* Push Code Dialog */}
      <Dialog open={pushDialogOpen} onOpenChange={setPushDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Push Code to {activeRepo?.owner}/{activeRepo?.name}</DialogTitle>
            <DialogDescription>
              Commit and push modified file directly to branch <code>{activeRepo?.branch}</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label className="text-xs">File Path</Label>
              <Input
                placeholder="e.g. src/index.ts or README.md"
                value={pushPath}
                onChange={(e) => setPushPath(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Commit Message</Label>
              <Input
                placeholder="e.g. update code via Cloudflare AI Web"
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">File Content</Label>
              <textarea
                className="w-full h-40 p-2 font-mono text-xs border rounded bg-background resize-none focus:outline-hidden"
                placeholder="Paste code or text to commit..."
                value={pushContent}
                onChange={(e) => setPushContent(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={handlePushCommit} disabled={pushing}>
              {pushing ? "Pushing to GitHub..." : "Confirm & Push Commit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
