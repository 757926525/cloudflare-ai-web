import { Archive, Brain, Loader2, Volume2, VolumeX, Trash2 } from "lucide-react";
import Image from "next/image";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { downloadFilesAsZip } from "@/lib/zip-utils";
import { useVoiceChat } from "@/hooks/use-voice-chat";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { db, type ImagesDataPart, type Message } from "@/lib/db";
import { cn } from "@/lib/utils";
import ToolCall from "@/components/tool-call";
import type { ChatStatus, ToolUIPart } from "ai";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import "streamdown/styles.css";

const AssistantChatItem = ({
  className,
  messageId,
  createdAt,
  parts,
  status,
  isLastMessage,
}: {
  className?: string;
  messageId?: string;
  createdAt?: Date;
  parts: Message["parts"];
  status: ChatStatus;
  isLastMessage?: boolean;
}) => {
  const { speak, stopSpeaking, isSpeaking } = useVoiceChat();

  const textContent = parts
    .filter((p) => p.type === "text")
    .map((p) => (p as any).text || "")
    .join("\n");

  const handleDownloadCodeZip = () => {
    const codeBlockRegex = /```(?:[a-zA-Z0-9_-]+:)?([^\n`]+)?\n([\s\S]*?)```/g;
    const extractedFiles: { filename: string; content: string }[] = [];
    let index = 1;
    let match: RegExpExecArray | null = codeBlockRegex.exec(textContent);

    while (match !== null) {
      let rawFilename = match[1]?.trim();
      const code = match[2];

      if (!rawFilename || rawFilename.includes(" ") || rawFilename.length > 50) {
        rawFilename = `snippet_${index}.txt`;
      }
      extractedFiles.push({ filename: rawFilename, content: code });
      index++;
      match = codeBlockRegex.exec(textContent);
    }

    if (extractedFiles.length === 0) {
      extractedFiles.push({ filename: "response.md", content: textContent });
    }

    downloadFilesAsZip(extractedFiles, "ai-code-export.zip");
    toast.success(`已打包下载 ${extractedFiles.length} 个代码文件`);
  };

  const handleDeleteMessage = async () => {
    if (messageId) {
      try {
        await db.message.delete(messageId);
        toast.success("已删除该条回复");
      } catch {
        // ignore
      }
    }
  };

  const timeString = createdAt
    ? new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "";

  return (
    <div className={cn("group/msg relative", className)}>
      <div className="flex items-center gap-1.5 mb-1 justify-between text-[11px] text-muted-foreground">
        <span>{timeString && <span className="font-mono">{timeString}</span>}</span>
        <div className="flex items-center gap-1 opacity-80 group-hover/msg:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="size-6 text-muted-foreground hover:text-foreground"
            title={isSpeaking ? "停止朗读" : "语音朗读回复"}
            onClick={() => {
              if (isSpeaking) stopSpeaking();
              else speak(textContent);
            }}
          >
            {isSpeaking ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="size-6 text-muted-foreground hover:text-foreground"
            title="打包下载代码 (.zip)"
            onClick={handleDownloadCodeZip}
          >
            <Archive className="size-3" />
          </Button>

          {messageId && (
            <Button
              size="icon"
              variant="ghost"
              className="size-6 text-muted-foreground hover:text-destructive"
              title="删除此消息"
              onClick={handleDeleteMessage}
            >
              <Trash2 className="size-3" />
            </Button>
          )}
        </div>
      </div>
      {parts.map((part, index) => {
        const key = `${part.type}-${index}`;

        if (part.type === "text") {
          return (
            <Streamdown
              key={key}
              animated={{ animation: "blurIn" }}
              isAnimating={status === "streaming" && isLastMessage}
              plugins={{ cjk, code, math }}
              linkSafety={{ enabled: false }}
            >
              {part.text}
            </Streamdown>
          );
        }

        if (part.type === "reasoning") {
          return (
            <Accordion key={key} type="single" collapsible>
              <AccordionItem value={key}>
                <AccordionTrigger>
                  <div className="flex items-center">
                    <Brain className="size-4 mr-2" />
                    深度思考
                    {part.state === "streaming" && (
                      <Loader2 className="size-4 ml-2 animate-spin" />
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Streamdown
                    caret="circle"
                    isAnimating={status === "streaming"}
                  >
                    {part.text}
                  </Streamdown>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        }

        if (part.type === "data-images") {
          return (
            <Fragment key={key}>
              {(part.data as ImagesDataPart).urls?.map((url, index) => {
                const key = `image-${index}`;

                return (
                  <Image
                    src={url}
                    alt={key}
                    key={key}
                    width={512}
                    height={512}
                    className="rounded-md hover:brightness-75 transition-all"
                  />
                );
              })}
            </Fragment>
          );
        }

        if (part.type.startsWith("tool-")) {
          return <ToolCall key={key} part={part as ToolUIPart} />;
        }

        return null;
      })}
    </div>
  );
};

export default AssistantChatItem;
