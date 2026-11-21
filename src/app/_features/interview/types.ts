/**
 * CONTRACT (docs/3-plan-ui.md §4.2) — owned by Claude, do not change the shape.
 * InterviewView is presentational: Adolfo's InterviewScreen (src/interview, OpenAI Realtime) feeds it these
 * props; useInterviewSimulator feeds the same props from a fake script for development and plan B.
 */
import type { Profile, Role } from "@/domain/profile";

export type InterviewStatus = "idle" | "connecting" | "live" | "finished" | "failed";
export type InterviewPhase = "facts" | "requirements" | "done";
export type Speaker = "agent" | "user" | "none";

export type InterviewViewProps = {
  role: Role;
  status: InterviewStatus;
  phase: InterviewPhase;
  /** facts + requirements filling in live */
  profile: Profile;
  /** moves Homie's mouth (agent) or tilts his mic (user) */
  speaker: Speaker;
  /** Homie's subtitle; hide the bubble text when missing */
  agentLine?: string;
  userLine?: string;
  /** field names saved by the last tool call → entry animation on those cards */
  justSaved?: string[];
  muted?: boolean;
  onStart(): void;
  onEnd(): void;
  onToggleMute?(): void;
  onTypeInstead?(): void;
  /** "See your 5 homes" / "See who's interested" on the finished screen */
  onContinue?(): void;
};
