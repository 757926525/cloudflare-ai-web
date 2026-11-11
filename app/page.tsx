"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ChevronDown, Plus, Trash2, MessageSquare, Pause, Play } from "lucide-react";
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

// 预设默认 3 个多会话槽位，方便用户随时切换
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
  const { t } = useI18n();

  // 暂停与终止控制器 (AbortController)
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const allSessions = useLiveQuery(
    async () => {
      return await db.session.limit(20).reverse().sortBy("updatedAt");
    },
    [],
  );

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

  const switchSession = (id: string) => {
    if (status === "streaming") {
      handleStopStreaming();
    }
    setCurrentSessionId(id);
    window.location.hash = `#/c/${id}`;
  };

  const createNewSession = async () => {
    const newId = `session-${Date.now()}`;
    await db.session.add({
      id: newId,
      name: `新会话 ${allSessions ? allSessions.length + 1 : 4}`,
      updatedAt: new Date(),
    });
    switchSession(newId);
    toast.success("已创建并切换至新会话");
  };

  const clearCurrentSessionMessages = async () => {
    if (!currentSessionId) return;
    await db.message.where("sessionId").equals(currentSessionId).delete();
    setMessages([]);
    toast.info("已清空当前会话的消息记录");
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("ready");
    toast.info("已暂停当前会话生成");
  };

  const onSendMessage = async (data: onSendMessageProps) => {
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

  // 会话列表（至少 3 个会话供用户无缝切换）
  const sessionList = (allSessions && allSessions.length > 0) ? allSessions : DEFAULT_PRESET_SESSIONS;

  return (
    <div className="flex flex-col h-screen bg-background">
      <RepoHeaderBar onInsertCodeContext={handleInsertCodeContext} />

      {/* 顶部多会话快速切换标签栏 (至少支持 3 个会话切换 + 清空/暂停) */}
      <div className="w-full bg-background/80 border-b border-border/40 px-3 py-1 flex items-center justify-between gap-1 overflow-x-auto text-xs backdrop-blur-xs">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          {sessionList.slice(0, 6).map((s) => {
            const isActive = currentSessionId === s.id;
            return (
              <Button
                key={s.id}
                size="sm"
                variant={isActive ? "default" : "ghost"}
                className={`h-7 px-2.5 text-xs rounded-lg flex items-center gap-1.5 shrink-0 transition-all ${
                  isActive ? "shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => switchSession(s.id)}
              >
                <MessageSquare className="size-3" />
                <span className="max-w-[80px] truncate">{s.name}</span>
              </Button>
            );
          })}

          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs rounded-lg shrink-0"
            title="新建会话"
            onClick={createNewSession}
          >
            <Plus className="size-3 mr-0.5" />
            新建会话
          </Button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* 暂停按钮 */}
          {status === "streaming" && (
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs px-2 flex items-center gap-1 animate-pulse"
              onClick={handleStopStreaming}
              title="暂停生成"
            >
              <Pause className="size-3" />
              <span>暂停</span>
            </Button>
          )}

          {/* 清空历史按钮 */}
          {messages.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground hover:text-destructive px-2"
              title="清空当前会话"
              onClick={clearCurrentSessionMessages}
            >
              <Trash2 className="size-3 mr-1" />
              清空
            </Button>
          )}
        </div>
      </div>

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
    </div>
  );
}
