"use client";

import { Homie } from "../../_ui/homie/Homie";
import type { InterviewViewProps } from "./types";

/** STUB (F0). G2 replaces the body following docs/ui/mockups/tenant-core.html phone 3. Keep the props. */
export function InterviewView(props: InterviewViewProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
      <Homie mood={props.speaker === "agent" ? "speaking" : "listening"} />
      <p className="text-sm text-muted">
        {props.status} · {props.phase}
      </p>
      <button className="rounded-full bg-granate px-5 py-3 font-semibold text-white" onClick={props.onStart}>
        Start
      </button>
    </div>
  );
}
