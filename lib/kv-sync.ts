import { db, type Session, type Message } from "@/lib/db";

export interface SyncData {
  sessions: Session[];
  messages: Message[];
  syncedAt: string;
}

export async function exportLocalChatData(): Promise<SyncData> {
  const sessions = await db.session.toArray();
  const messages = await db.message.toArray();
  return {
    sessions,
    messages,
    syncedAt: new Date().toISOString(),
  };
}

export async function importRemoteChatData(data: SyncData): Promise<number> {
  if (!data || !Array.isArray(data.sessions)) {
    throw new Error("远程数据格式无效");
  }

  let count = 0;
  await db.transaction("rw", db.session, db.message, async () => {
    for (const session of data.sessions) {
      const exists = await db.session.get(session.id);
      if (!exists) {
        await db.session.add({
          ...session,
          updatedAt: new Date(session.updatedAt),
        });
        count++;
      }
    }

    if (Array.isArray(data.messages)) {
      for (const msg of data.messages) {
        const exists = await db.message.get(msg.id);
        if (!exists) {
          await db.message.add({
            ...msg,
            createdAt: new Date(msg.createdAt),
          });
        }
      }
    }
  });

  return count;
}

/**
 * 推送本地对话数据到 Cloudflare KV 数据库
 */
export async function pushChatHistoryToKv(): Promise<void> {
  const payload = await exportLocalChatData();
  const kvNamespaceId = localStorage.getItem("CF_KV_NAMESPACE_ID") || "";
  const cfAccountId = localStorage.getItem("CF_ACCOUNT_ID") || "";
  const cfToken = localStorage.getItem("CF_WORKERS_AI_TOKEN") || "";

  const res = await fetch("/api/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cfAccountId ? { "X-CF-Account": cfAccountId } : {}),
      ...(cfToken ? { "X-CF-Token": cfToken } : {}),
      ...(kvNamespaceId ? { "X-CF-KV-Namespace": kvNamespaceId } : {}),
    },
    body: JSON.stringify({
      key: "chat_history_backup",
      payload,
      kvNamespaceId,
      cfAccountId,
      cfToken,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "KV 同步失败" }));
    throw new Error(err.error || "KV 同步失败");
  }
}

/**
 * 从 Cloudflare KV 数据库拉取并恢复历史对话
 */
export async function pullChatHistoryFromKv(): Promise<number> {
  const kvNamespaceId = localStorage.getItem("CF_KV_NAMESPACE_ID") || "";
  const cfAccountId = localStorage.getItem("CF_ACCOUNT_ID") || "";
  const cfToken = localStorage.getItem("CF_WORKERS_AI_TOKEN") || "";

  const res = await fetch("/api/sync?key=chat_history_backup", {
    method: "GET",
    headers: {
      ...(cfAccountId ? { "X-CF-Account": cfAccountId } : {}),
      ...(cfToken ? { "X-CF-Token": cfToken } : {}),
      ...(kvNamespaceId ? { "X-CF-KV-Namespace": kvNamespaceId } : {}),
    },
  });

  if (!res.ok) {
    throw new Error(`拉取 KV 数据失败 (${res.status})`);
  }

  const raw = await res.text();
  if (!raw || raw === "{}") {
    throw new Error("KV 数据库中暂无已同步的备份数据");
  }

  const data: SyncData = JSON.parse(raw);
  return await importRemoteChatData(data);
}
