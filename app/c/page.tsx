import { Suspense } from "react";
import ChatSessionPage from "@/components/chat-session-page";

export default function ChatRoute() {
  return (
    <Suspense fallback={null}>
      <ChatSessionPage />
    </Suspense>
  );
}
