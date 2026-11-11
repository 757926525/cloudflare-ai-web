"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ChatStatus, FileUIPart } from "ai";
import {
  Earth,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  SendHorizontal,
  Square,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import ModelSelect from "@/components/model-select";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import type { Model } from "@/lib/models";
import { cn, type StoredModelKey } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";
import { extractZipFiles } from "@/lib/zip-utils";
import { useVoiceChat } from "@/hooks/use-voice-chat";

export interface onSendMessageProps {
  text: string;
  files?: FileUIPart[];
}

const formSchema = z.object({
  input: z.string().trim().min(1),
});

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const ChatInput = ({
  className,
  onSendMessage,
  onStop,
  onRetry,
  status = "ready",
  models,
  modalKey,
}: {
  className?: string;
  onSendMessage: (data: onSendMessageProps) => void;
  onStop?: () => void;
  onRetry?: () => void;
  status?: ChatStatus;
  models: Model[];
  modalKey?: StoredModelKey;
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      input: "",
    },
  });
  const input = form.watch("input");
  const [selectedModel, setSelectedModel] = useState<Model>();
  const [files, setFiles] = useState<FileUIPart[]>([]);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const { isListening, startListening, stopListening, transcript } = useVoiceChat();

  useEffect(() => {
    if (transcript) {
      form.setValue("input", transcript);
    }
  }, [transcript, form]);

  useEffect(() => {
    setSearchEnabled(localStorage.getItem("CF_AI_SEARCH_ENABLED") === "true");
  }, []);

  useEffect(() => {
    if (!selectedModel?.input?.includes("image")) {
      setFiles([]);
    }
  }, [selectedModel]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    form.resetField("input");
    setFiles([]);
    onSendMessage({
      text: values.input,
      files,
    });
  }

  const onSendClick = () => {
    switch (status) {
      case "streaming":
        onStop?.();
        break;
      case "error":
        // 用户要求直接发送，重试也直接触发发送
        onRetry ? onRetry() : form.handleSubmit(onSubmit)();
        break;
      case "ready":
        form.handleSubmit(onSubmit)();
        break;
    }
  };

  const onAddFiles = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*,.zip";
    fileInput.multiple = true;
    fileInput.onchange = async () => {
      const fileList = Array.from(fileInput.files ?? []);
      const imageFiles: File[] = [];

      for (const file of fileList) {
        if (file.name.endsWith(".zip")) {
          toast.info(`正在解压: ${file.name}...`);
          try {
            const extracted = await extractZipFiles(file);
            toast.success(`成功从 ${file.name} 提取 ${extracted.length} 个代码文件`);
            const codeSummary = extracted
              .map((f) => `### 文件: ${f.filename}\n\`\`\`\n${f.content}\n\`\`\``)
              .join("\n\n");

            const currentVal = form.getValues("input");
            form.setValue(
              "input",
              (currentVal ? currentVal + "\n\n" : "") +
                `以下是从项目压缩包 ${file.name} 中提取的代码文件内容：\n\n` +
                codeSummary
            );
          } catch (err: any) {
            toast.error(`解压压缩包失败: ${err.message}`);
          }
        } else if (file.type.startsWith("image/")) {
          imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        const newFiles = await Promise.all(
          imageFiles.map(async (file) => ({
            type: "file" as const,
            filename: file.name,
            mediaType: file.type,
            url: await fileToBase64(file),
          })),
        );

        setFiles((prevState) => {
          const combinedFiles = [...prevState, ...newFiles];
          if (combinedFiles.length > 5) {
            toast.warning("最多仅支持上传 5 张图片");
            return combinedFiles.slice(0, 5);
          }
          return combinedFiles;
        });
      }
    };
    fileInput.click();
  };

  const onPaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardItems = event.clipboardData.items;
    const newFiles: FileUIPart[] = [];

    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      if (item.kind === "file") {
        event.preventDefault();
        const file = item.getAsFile();
        if (file?.type.startsWith("image/")) {
          const base64 = await fileToBase64(file);
          newFiles.push({
            type: "file",
            filename: file.name,
            mediaType: file.type,
            url: base64,
          });
        }
      }
    }

    if (newFiles.length > 0) {
      setFiles((prevState) => {
        const combinedFiles = [...prevState, ...newFiles];
        if (combinedFiles.length > 5) {
          toast.warning("最多仅支持上传 5 张图片");
          return combinedFiles.slice(0, 5);
        }
        return combinedFiles;
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
        <div
          className={cn(
            "w-full border-2 border-border/80 bg-background/95 backdrop-blur-md rounded-2xl shadow-lg focus-within:border-primary/80 transition-all overflow-hidden",
            className,
          )}
        >
          <FormField
            control={form.control}
            name="input"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormControl>
                  <Textarea
                    autoFocus
                    rows={2}
                    className="border-0 shadow-none focus-visible:ring-0 resize-none min-h-[64px] max-h-[35vh] px-4 py-3 text-sm md:text-base leading-relaxed placeholder:text-muted-foreground/60 scrollbar"
                    placeholder="输入问题或需求，直接回车发送，支持粘贴图片与上传.zip压缩包..."
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        form.handleSubmit(onSubmit)();
                      }
                    }}
                    onPaste={onPaste}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* 附加图片预览列表 */}
          {files.length > 0 && (
            <ul className="flex px-3 pb-2 gap-2 overflow-x-auto">
              {files.map((file, index) => {
                if (file.mediaType.startsWith("image/")) {
                  return (
                    <li
                      key={`file-${file.filename}-${index}`}
                      className="size-14 shrink-0 overflow-hidden rounded-lg relative border border-border/60 group"
                    >
                      <button
                        type="button"
                        className="absolute top-1 right-1 bg-black/70 hover:bg-black rounded-full p-0.5 text-white cursor-pointer z-10 transition-colors"
                        onClick={() => {
                          setFiles((prevState) =>
                            prevState.filter((_, i) => i !== index),
                          );
                        }}
                      >
                        <X className="size-3.5" />
                      </button>
                      {/** biome-ignore lint/performance/noImgElement: <data_url> */}
                      <img
                        src={file.url}
                        alt={file.filename}
                        className="object-cover size-full"
                      />
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          )}

          {/* 底部操作工具栏 */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-t border-border/40 gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <ModelSelect
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                models={models}
                modalKey={modalKey ?? "CF_AI_MODEL"}
              />

              {selectedModel?.input?.includes("search") && (
                <Toggle
                  aria-label="联网搜索"
                  size="sm"
                  className="h-8 gap-1 text-xs data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                  pressed={searchEnabled}
                  onPressedChange={(pressed) => {
                    localStorage.setItem(
                      "CF_AI_SEARCH_ENABLED",
                      pressed ? "true" : "false",
                    );
                    setSearchEnabled(pressed);
                  }}
                >
                  <Earth className="size-3.5" />
                  <span className="hidden sm:inline">联网</span>
                </Toggle>
              )}

              {/* 上传图片 & Zip */}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                title="上传图片或代码压缩包 (.zip)"
                type="button"
                onClick={onAddFiles}
              >
                <Paperclip className="size-4" />
              </Button>

              {/* 语音输入按钮 */}
              <Button
                size="sm"
                variant={isListening ? "destructive" : "ghost"}
                className={`h-8 w-8 p-0 text-muted-foreground hover:text-foreground ${
                  isListening ? "animate-pulse text-white" : ""
                }`}
                title={isListening ? "停止语音输入" : "麦克风语音输入"}
                type="button"
                onClick={() => {
                  if (isListening) {
                    stopListening();
                  } else {
                    startListening((finalText) => {
                      form.setValue("input", finalText);
                    });
                  }
                }}
              >
                {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </Button>
            </div>

            {/* 明确的【发送】按钮 */}
            <div className="flex items-center ml-auto">
              {status === "streaming" ? (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 px-3 text-xs font-medium rounded-lg gap-1.5 shadow-sm"
                  type="button"
                  onClick={onStop}
                >
                  <Square className="size-3.5 fill-current" />
                  <span>停止</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  className="h-8 px-3.5 text-xs font-semibold rounded-lg gap-1.5 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
                  disabled={
                    status === "submitted" ||
                    (input.trim().length === 0 && status === "ready")
                  }
                  type="submit"
                  onClick={onSendClick}
                >
                  {status === "submitted" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <SendHorizontal className="size-3.5" />
                  )}
                  <span>发送</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default ChatInput;
