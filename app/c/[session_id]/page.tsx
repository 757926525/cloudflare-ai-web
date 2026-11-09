import { Suspense } from "react";
import ChatSessionPage from "@/components/chat-session-page";

export const dynamicParams = false;

export function generateStaticParams() {
  return [];
}

export default function LegacyChatRoute() {
  return (
    <Suspense fallback={null}>
      <ChatSessionPage />
    </Suspense>
  );
}
