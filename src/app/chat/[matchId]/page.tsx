import { Suspense } from "react";

import { ChatScreen } from "../../_features/inbox/ChatScreen";

/** Next 16: useParams inside a dynamic route suspends when cacheComponents is on. */
export default function ChatPage() {
  return (
    <Suspense fallback={<div className="absolute inset-0 bg-cream" />}>
      <ChatScreen />
    </Suspense>
  );
}
