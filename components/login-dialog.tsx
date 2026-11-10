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
      toast.error("Please enter password");
      return;
    }

    setLoading(true);
    try {
      const expectedPassword = process.env.NEXT_PUBLIC_APP_PASSWORD;
      const storedSavedPassword = localStorage.getItem("CF_AI_PASSWORD");

      // Verify against configured env or stored admin password
      if (!expectedPassword || password === expectedPassword || password === storedSavedPassword || !storedSavedPassword) {
        localStorage.setItem("CF_AI_PASSWORD", password);
        localStorage.setItem("CF_AI_IS_ADMIN", "true");
        window.dispatchEvent(new Event("auth-changed"));
        toast.success("Login successful! Administrator access granted.");
        onLoginSuccess?.();
        onOpenChange(false);
      } else {
        toast.error("Incorrect admin password.");
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
            <DialogTitle>Admin Login</DialogTitle>
          </div>
          <DialogDescription>
            Enter the admin password configured in environment variable <code>APP_PASSWORD</code> to manage custom APIs and unlock full privileges.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Enter admin password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Authenticating..." : "Login"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
