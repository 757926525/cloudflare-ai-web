import type { Message } from "@/lib/db";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const UserChatItem = ({
  className,
  messageId,
  createdAt,
  parts,
}: {
  className?: string;
  messageId?: string;
  createdAt?: Date;
  parts: Message["parts"];
}) => {
  const handleDelete = async () => {
    if (messageId) {
      try {
        await db.message.delete(messageId);
        toast.success("已删除该条消息");
      } catch {
        // ignore
      }
    }
  };

  const timeString = createdAt
    ? new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "";

  return (
    <div className={cn("space-y-1 flex flex-col items-end group/user", className)}>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {timeString && <span className="font-mono">{timeString}</span>}
        {messageId && (
          <Button
            size="icon"
            variant="ghost"
            className="size-5 text-muted-foreground opacity-0 group-hover/user:opacity-100 hover:text-destructive transition-opacity"
            title="删除此消息"
            onClick={handleDelete}
          >
            <Trash2 className="size-3" />
          </Button>
        )}
      </div>

      {parts.map((part, index) => {
        if (part.type === "text") {
          return (
            <div
              key={`${part.type}-${index}`}
              className="bg-primary text-primary-foreground px-3.5 py-2 rounded-2xl max-w-[85%] self-end text-sm leading-relaxed shadow-xs"
            >
              {part.text}
            </div>
          );
        }

        if (part.type === "file") {
          if (part.mediaType.startsWith("image/")) {
            return (
              // biome-ignore lint/performance/noImgElement: <data_url>
              <img
                key={`${part.type}-${index}`}
                src={part.url}
                alt={part.filename}
                className="hover:brightness-75 transition-all rounded-xl object-cover size-full max-w-[50%] self-end border"
              />
            );
          }
        }

        return null;
      })}
    </div>
  );
};

export default UserChatItem;
