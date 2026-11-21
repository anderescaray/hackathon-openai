import { Suspense } from "react";

import { InterviewPreviewClient } from "./InterviewPreviewClient";

/** Interview with the simulator. The real /interview route belongs to Adolfo. */
export default function InterviewPreviewPage() {
  return (
    <Suspense fallback={<div className="absolute inset-0 bg-cream" />}>
      <InterviewPreviewClient />
    </Suspense>
  );
}
