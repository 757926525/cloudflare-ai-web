"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function LoginDialog({
  open,
  onOpenChange,
  onLoginSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess?: () => void;
}) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error("请输入管理员密码");
      return;
    }

    setLoading(true);
    try {
      const expectedPassword = process.env.NEXT_PUBLIC_APP_PASSWORD;
      const storedSavedPassword = localStorage.getItem("CF_AI_PASSWORD");

      let isValid = false;
      if (expectedPassword) {
        isValid = password === expectedPassword;
      } else if (storedSavedPassword) {
        isValid = password === storedSavedPassword;
      } else {
        // 首次未设定任何环境变量或密码时，将当前输入的密码设为管理凭证
        localStorage.setItem("CF_AI_PASSWORD", password);
        isValid = true;
      }

      if (isValid) {
        localStorage.setItem("CF_AI_IS_ADMIN", "true");
        window.dispatchEvent(new Event("auth-changed"));
        toast.success("登录成功，已解锁管理员权限");
        onLoginSuccess?.();
        onOpenChange(false);
      } else {
        toast.error("管理员密码不正确，请重新输入");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="size-5 text-primary" />
            <DialogTitle>管理员登录</DialogTitle>
          </div>
          <DialogDescription>
            请输入系统设定的 <code>APP_PASSWORD</code> 管理员密码以管理自定义 API 与核心配置。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="请输入管理员密码..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "验证中..." : "确认登录"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
