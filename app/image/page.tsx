"use client";

import { ChevronDown, Download } from "lucide-react";
import { useState } from "react";
import AuthDialog from "@/components/auth-dialog";
import ChatInput, { type onSendMessageProps } from "@/components/chat-input";
import ChatList from "@/components/chat-list";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { models } from "@/lib/models";
import { getStoredModel } from "@/lib/utils";
import { toast } from "sonner";
import type { Message } from "@/lib/db";

export default function ImagePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<"ready" | "submitted" | "streaming" | "error">("ready");
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const onSendMessage = async ({ text }: onSendMessageProps) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      parts: [{ type: "text", text }],
      role: "user",
      sessionId: "image",
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setStatus("submitted");

    try {
      const storedModel = getStoredModel("CF_AI_MODEL_IMAGE");
      const cfAccountId = localStorage.getItem("CF_ACCOUNT_ID") || "";
      const cfToken = localStorage.getItem("CF_WORKERS_AI_TOKEN") || "";

      if (!cfAccountId || !cfToken) {
        toast.error("Please configure Cloudflare Account ID and Workers AI Token in Settings (Gear).");
        setStatus("error");
        return;
      }

      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${storedModel.id}`,
        {
          headers: {
            Authorization: `Bearer ${cfToken}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({ prompt: text }),
        }
      );

      if (!res.ok) {
        throw new Error(`Generation failed: ${res.statusText}`);
      }

      let imageUrl = "";
      if (
        storedModel.id === "@cf/black-forest-labs/flux-1-schnell" ||
        storedModel.id === "@cf/leonardo/lucid-origin"
      ) {
        const data = await res.json();
        imageUrl = `data:image/png;base64,${data.result.image}`;
      } else {
        const blob = await res.blob();
        imageUrl = URL.createObjectURL(blob);
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        parts: [
          {
            type: "data-images",
            data: { urls: [imageUrl] },
          },
        ],
        role: "assistant",
        sessionId: "image",
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setStatus("ready");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate image");
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="overflow-y-auto scrollbar px-2 flex-1">
        <ChatList
          status={status}
          messages={messages}
          className="pt-16 pb-60 max-w-3xl mx-auto"
        />
      </div>

      <div className="mt-auto pb-1 space-y-1 absolute bottom-0 left-0 right-0 bg-linear-to-t from-background to-transparent px-2">
        <ChatInput
          models={models.filter((i) => i.type === "Text to Image")}
          className="mx-auto max-w-3xl bg-background shadow-xl"
          onSendMessage={onSendMessage}
          status={status}
          modalKey="CF_AI_MODEL_IMAGE"
        />
        <Footer />
      </div>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
}
