"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState, ViewTransition } from "react";
import { toast } from "sonner";
import AuthDialog from "@/components/auth-dialog";
import ChatInput, { type onSendMessageProps } from "@/components/chat-input";
import ChatList from "@/components/chat-list";
import Footer from "@/components/footer";
import RepoHeaderBar from "@/components/repo-header-bar";
import { Button } from "@/components/ui/button";
import { TextEffect } from "@/components/ui/text-effect";
import { db, type Message } from "@/lib/db";
import { models } from "@/lib/models";
import { getStoredModel } from "@/lib/utils";
import { streamChatUniversal } from "@/lib/universal-client";
import { useI18n } from "@/lib/i18n";
import LoginDialog from "@/components/login-dialog";

// 预设默认 3 个多会话槽位，保持至少三个
const DEFAULT_PRESET_SESSIONS = [
  { id: "session-slot-1", name: "会话 1" },
  { id: "session-slot-2", name: "会话 2" },
  { id: "session-slot-3", name: "会话 3" },
];

export default function Home() {
  const [currentSessionId, setCurrentSessionId] = useState<string>("session-slot-1");
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<"ready" | "streaming" | "submitted" | "error">("ready");
  const [showToBottom, setShowToBottom] = useState(false);
  const chatListRef = useRef<HTMLDivElement>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [forceLoginModalOpen, setForceLoginModalOpen] = useState(false);
  const [isLockedByAuth, setIsLockedByAuth] = useState(false);
  const { t } = useI18n();

  // 暂停与终止控制器 (AbortController)
  const abortControllerRef = useRef<AbortController | null>(null);

  // 检查是否开启“开启登录界面（强制仅管理员使用）”
  const checkAuthLock = () => {
    const isEnforced = localStorage.getItem("CF_AI_AUTH_REQUIRED") === "true";
    const isAdmin = localStorage.getItem("CF_AI_IS_ADMIN") === "true";
    const locked = isEnforced && !isAdmin;
    setIsLockedByAuth(locked);
    if (locked) {
      setForceLoginModalOpen(true);
    }
  };

  useEffect(() => {
    checkAuthLock();
    window.addEventListener("auth-changed", checkAuthLock);
    window.addEventListener("auth-enforce-changed", checkAuthLock);
    return () => {
      window.removeEventListener("auth-changed", checkAuthLock);
      window.removeEventListener("auth-enforce-changed", checkAuthLock);
    };
  }, []);

  // 初始化预设 3 个会话槽位
  useEffect(() => {
    const initDefaultSessions = async () => {
      for (const preset of DEFAULT_PRESET_SESSIONS) {
        const existing = await db.session.get(preset.id);
        if (!existing) {
          await db.session.add({
            id: preset.id,
            name: preset.name,
            updatedAt: new Date(),
          });
        }
      }
    };
    initDefaultSessions();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.hash.match(/#\/c\/(.+)/);
      if (match) {
        setCurrentSessionId(match[1]);
      } else {
        setCurrentSessionId("session-slot-1");
      }
    };

    handlePopState();
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
    };
  }, []);

  const sessionMessages = useLiveQuery(
    async () => {
      if (!currentSessionId) return [] as Message[];
      return await db.message
        .where("sessionId")
        .equals(currentSessionId)
        .limit(100)
        .sortBy("createdAt");
    },
    [currentSessionId],
  );

  useEffect(() => {
    if (sessionMessages) {
      setMessages(sessionMessages);
    }
  }, [sessionMessages]);

  const scrollToBottom = useCallback(
    (behavior: "smooth" | "instant" = "smooth") => {
      chatListRef.current?.scrollTo({
        top: chatListRef.current.scrollHeight,
        behavior,
      });
    },
    [],
  );

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("ready");
    toast.info("已暂停当前会话生成");
  };

  const onSendMessage = async (data: onSendMessageProps) => {
    if (isLockedByAuth) {
      toast.error("管理员已开启全站访问锁定，请先登录管理员账户");
      setForceLoginModalOpen(true);
      return;
    }

    const { text, files } = data;
    const sessionId = currentSessionId || "session-slot-1";

    const userMsg: Message = {
      id: crypto.randomUUID(),
      parts: [
        ...(files ?? []),
        {
          type: "text",
          text,
        },
      ],
      role: "user",
      sessionId,
      createdAt: new Date(),
    };

    await db.message.add(userMsg);
    await db.session.update(sessionId, {
      updatedAt: new Date(),
    });

    setMessages((prev) => [...prev, userMsg]);
    scrollToBottom();

    const assistantMsgId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantMsgId,
      parts: [{ type: "text", text: "" }],
      role: "assistant",
      sessionId,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setStatus("streaming");

    // 初始化 AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const storedModel = getStoredModel("CF_AI_MODEL");
      let customConfig: any;

      if (storedModel.provider === "custom") {
        try {
          const customApis = JSON.parse(localStorage.getItem("CF_AI_CUSTOM_APIS") || "[]");
          const found = customApis.find((c: any) => c.id === storedModel.id);
          if (found) customConfig = found;
        } catch {
          // ignore
        }
      }

      const allMsgs = [...messages, userMsg].map((m) => {
        const textPart = m.parts.find((p) => p.type === "text")?.text || "";
        return {
          role: m.role,
          content: textPart,
        };
      });

      let accumulated = "";
      const stream = streamChatUniversal({
        model: customConfig?.modelId || storedModel.id,
        messages: allMsgs,
        config: {
          id: storedModel.id,
          provider: storedModel.provider,
          baseUrl: customConfig?.baseUrl,
          apiKey: customConfig?.apiKey,
        },
      });

      for await (const chunk of stream) {
        if (controller.signal.aborted) {
          break;
        }
        accumulated += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  parts: [{ type: "text", text: accumulated }],
                }
              : msg
          )
        );
        scrollToBottom("instant");
      }

      await db.message.add({
        ...assistantMsg,
        parts: [{ type: "text", text: accumulated }],
      });
      setStatus("ready");
    } catch (err: any) {
      if (controller.signal.aborted) {
        setStatus("ready");
      } else {
        setStatus("error");
        toast.error(err.message || "生成回复失败，请检查模型与网络配置");
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleInsertCodeContext = (filename: string, content: string) => {
    onSendMessage({
      text: `已载入仓库文件：${filename}\n\`\`\`\n${content}\n\`\`\`\n请仔细审查该代码，并协助我进行优化、重构或功能实现。`,
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 顶部仅显示干净清爽的代码仓库与分支横幅（会话历史移到左侧侧边栏） */}
      <RepoHeaderBar onInsertCodeContext={handleInsertCodeContext} />

      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 px-4">
          <div className="flex flex-col justify-center h-full w-full max-w-2xl space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground font-sans">
                <TextEffect per="word" preset="fade-in-blur">
                  {t("welcome")}
                </TextEffect>
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                {t("welcomeSubtitle")}
              </p>
            </div>
            <ViewTransition name="chat-input">
              <ChatInput
                models={models.filter((i) => i.type === "Text Generation")}
                className="w-full"
                onSendMessage={onSendMessage}
                onStop={handleStopStreaming}
                status={status}
              />
            </ViewTransition>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={chatListRef}
            className="overflow-y-auto scrollbar px-3 md:px-4 flex-1"
            style={{ scrollbarGutter: "stable both-edges" }}
          >
            <ChatList
              status={status}
              messages={messages}
              className="pt-6 pb-48 max-w-3xl mx-auto"
            />
          </div>

          <div className="mt-auto pb-2 space-y-1 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent px-3 md:px-4">
            {showToBottom && (
              <ViewTransition>
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full shadow-xl absolute left-1/2 -translate-x-1/2 -top-10 z-10"
                  onClick={() => {
                    chatListRef.current?.scrollTo({
                      top: chatListRef.current.scrollHeight,
                      behavior: "smooth",
                    });
                  }}
                >
                  <ChevronDown />
                </Button>
              </ViewTransition>
            )}

            <ViewTransition name="chat-input">
              <ChatInput
                models={models.filter((i) => i.type === "Text Generation")}
                className="mx-auto max-w-3xl bg-background shadow-xl"
                onSendMessage={onSendMessage}
                onStop={handleStopStreaming}
                status={status}
              />
            </ViewTransition>
            <Footer />
          </div>
        </>
      )}

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />

      {/* 强制登录弹窗（当管理员在后台开启登录界面保护时） */}
      <LoginDialog
        open={forceLoginModalOpen}
        onOpenChange={setForceLoginModalOpen}
        onLoginSuccess={() => {
          setIsLockedByAuth(false);
          setForceLoginModalOpen(false);
        }}
      />
    </div>
  );
}
