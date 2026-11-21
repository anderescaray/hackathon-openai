import { Suspense } from "react";

import { Placeholder } from "../../_ui/Placeholder";

/** Next 16: params is a Promise. Read it inside Suspense (cacheComponents is on). */
async function ChatForMatch({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  return <Placeholder title="Chat" note={decodeURIComponent(matchId)} />;
}

export default function ChatPage({ params }: PageProps<"/chat/[matchId]">) {
  return (
    <Suspense>
      <ChatForMatch params={params} />
    </Suspense>
  );
}
