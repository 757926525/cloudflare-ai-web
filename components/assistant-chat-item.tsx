import { Archive, Brain, Loader2, Volume2, VolumeX } from "lucide-react";
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
import type { ImagesDataPart, Message } from "@/lib/db";
import { cn } from "@/lib/utils";
import ToolCall from "@/components/tool-call";
import type { ChatStatus, ToolUIPart } from "ai";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import "streamdown/styles.css";

const AssistantChatItem = ({
  className,
  parts,
  status,
  isLastMessage,
}: {
  className?: string;
  parts: Message["parts"];
  status: ChatStatus;
  isLastMessage?: boolean;
}) => {
  const { speak, stopSpeaking, isSpeaking } = useVoiceChat();

  // Parse code blocks in text to allow downloading as .zip
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
      // Fallback: download the entire assistant message as text
      extractedFiles.push({ filename: "response.md", content: textContent });
    }

    downloadFilesAsZip(extractedFiles, "ai-code-export.zip");
    toast.success(`Downloaded ${extractedFiles.length} file(s) as zip`);
  };

  return (
    <div className={cn("", className)}>
      <div className="flex items-center gap-1 mb-2 justify-end">
        <Button
          size="icon"
          variant="ghost"
          className="size-7 text-muted-foreground hover:text-foreground"
          title={isSpeaking ? "Stop Speaking" : "Read Aloud"}
          onClick={() => {
            if (isSpeaking) stopSpeaking();
            else speak(textContent);
          }}
        >
          {isSpeaking ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="size-7 text-muted-foreground hover:text-foreground"
          title="Download Code / Output as .zip"
          onClick={handleDownloadCodeZip}
        >
          <Archive className="size-3.5" />
        </Button>
      </div>
      {parts.map((part, index) => {
        const key = `${part.type}-${index}`;

        if (part.type === "text") {
          return (
            <Streamdown
              key={key}
              // caret="circle"
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
                    Reasoning
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
