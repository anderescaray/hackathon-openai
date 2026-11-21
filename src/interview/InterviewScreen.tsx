"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { InterviewView } from "../app/_features/interview/InterviewView";
import type { InterviewStatus, Speaker } from "../app/_features/interview/types";
import { saveProfile } from "../app/_lib/api";
import { setSession } from "../app/_lib/session";
import type { Role } from "../domain/profile.ts";
import { buildAgentConfig } from "./agents.ts";
import { handleAndSaveToolCall, startInterview, type InterviewState } from "./interviewSession.ts";
import { logEvent } from "./log.ts";
import { createProfile, saveProfileWrite } from "./profileApi.ts";
import { connectRealtime, type RealtimeConnection } from "./realtimeConnection.ts";
import {
  buildSessionUpdate,
  buildToolOutputEvent,
  extractToolCalls,
  readServerError,
  trackFarewell,
  type FarewellProgress,
} from "./realtimeEvents.ts";
import { formatBarcelonaDate } from "./today.ts";

type ScreenStatus = "idle" | "connecting" | "live" | "finished" | "failed" | "dropped";

const voiceSessionSchema = z.object({ clientSecret: z.string().min(1) });

const FAREWELL_NOT_STARTED: FarewellProgress = { farewellResponseId: undefined, isFinished: false };
const FAREWELL_TIMEOUT_MS = 15000;

// The UI view has no "dropped": it shows it as "failed" (same retry button).
const VIEW_STATUS: Record<ScreenStatus, InterviewStatus> = {
  idle: "idle",
  connecting: "connecting",
  live: "live",
  finished: "finished",
  failed: "failed",
  dropped: "failed",
};

const NEXT_SCREEN: Record<Role, string> = { tenant: "/discover", home: "/interested" };

// Presentation only: who is talking (Homie's mouth / mic) and the subtitles. Never touches the profile.
const voiceActivitySchema = z.looseObject({
  type: z.string(),
  response_id: z.string().optional(),
  delta: z.string().optional(),
  transcript: z.string().optional(),
});

type VoiceActivity =
  | { kind: "speaker"; speaker: Speaker }
  | { kind: "agentDelta"; responseId: string; delta: string }
  | { kind: "agentLine"; line: string }
  | { kind: "userLine"; line: string };

function readVoiceActivity(serverEvent: unknown): VoiceActivity | undefined {
  const parsed = voiceActivitySchema.safeParse(serverEvent);
  if (!parsed.success) return undefined;
  const { type, response_id: responseId = "", delta, transcript } = parsed.data;
  switch (type) {
    case "output_audio_buffer.started":
      return { kind: "speaker", speaker: "agent" };
    case "output_audio_buffer.stopped":
    case "output_audio_buffer.cleared":
    case "input_audio_buffer.speech_stopped":
      return { kind: "speaker", speaker: "none" };
    case "input_audio_buffer.speech_started":
      return { kind: "speaker", speaker: "user" };
    case "response.output_audio_transcript.delta":
      return delta ? { kind: "agentDelta", responseId, delta } : undefined;
    case "response.output_audio_transcript.done":
      return transcript ? { kind: "agentLine", line: transcript } : undefined;
    // Only arrives if input transcription is enabled in the session config.
    case "conversation.item.input_audio_transcription.completed":
      return transcript ? { kind: "userLine", line: transcript.trim() } : undefined;
    default:
      return undefined;
  }
}

function getToday(): string {
  return formatBarcelonaDate(new Date());
}

async function fetchClientSecret(): Promise<string> {
  const response = await fetch("/api/voice/session", { method: "POST" });
  if (!response.ok) throw new Error(`voice session route answered with status ${response.status}`);
  return voiceSessionSchema.parse(await response.json()).clientSecret;
}

export function InterviewScreen({ role }: { role: Role }): React.JSX.Element {
  const [status, setStatus] = useState<ScreenStatus>("idle");
  const [interview, setInterview] = useState<InterviewState>(() => startInterview(role, crypto.randomUUID()));
  const interviewRef = useRef(interview);
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const farewellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const farewellRef = useRef(FAREWELL_NOT_STARTED);
  const isStartingRef = useRef(false);
  const isUnmountedRef = useRef(false);
  const router = useRouter();
  const [speaker, setSpeaker] = useState<Speaker>("none");
  const [agentLine, setAgentLine] = useState<string | undefined>(undefined);
  const [userLine, setUserLine] = useState<string | undefined>(undefined);
  const [justSaved, setJustSaved] = useState<string[]>([]);
  const agentDraftRef = useRef({ responseId: "", text: "" });
  // Server events are handled one at a time, so complete_facts sees the result of the save before it.
  const eventQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      connectionRef.current?.close();
      if (farewellTimerRef.current) clearTimeout(farewellTimerRef.current);
    };
  }, []);

  function endCall(): void {
    connectionRef.current?.close();
    connectionRef.current = null;
    if (farewellTimerRef.current) clearTimeout(farewellTimerRef.current);
    setStatus("finished");
    setSpeaker("none");
  }

  function showVoiceActivity(serverEvent: unknown): void {
    const activity = readVoiceActivity(serverEvent);
    if (!activity) return;
    if (activity.kind === "speaker") setSpeaker(activity.speaker);
    if (activity.kind === "agentDelta") {
      const draft = agentDraftRef.current;
      const text = draft.responseId === activity.responseId ? draft.text + activity.delta : activity.delta;
      agentDraftRef.current = { responseId: activity.responseId, text };
      setAgentLine(text);
    }
    if (activity.kind === "agentLine") setAgentLine(activity.line);
    if (activity.kind === "userLine") setUserLine(activity.line);
  }

  async function continueToApp(): Promise<void> {
    const { profile } = interviewRef.current;
    // Save first so the feed can find this profile (falls back to the browser's mock store without the API).
    try {
      await saveProfile({ ...profile, status: "complete" });
    } catch (error) {
      console.warn("[homie] could not save the interview profile", error);
    }
    setSession({ profileId: profile.id, role });
    router.push(NEXT_SCREEN[role]);
  }

  function enqueueServerEvent(serverEvent: unknown): void {
    // Subtitles and who-is-talking never wait for a save; only the profile logic is queued.
    showVoiceActivity(serverEvent);
    eventQueueRef.current = eventQueueRef.current
      .then(() => handleServerEvent(serverEvent))
      .catch((error: unknown) => {
        logEvent("error", {
          msg: "Could not handle an event from the voice service",
          event_name: "interview.event_failed",
          request_id: interviewRef.current.profile.id,
          data: { detail: error instanceof Error ? error.message : "unknown error" },
        });
      });
  }

  async function handleServerEvent(serverEvent: unknown): Promise<void> {
    const connection = connectionRef.current;
    if (!connection) return;
    const sessionId = interviewRef.current.profile.id;
    // After each save, a reply for an interview that has since ended or restarted is dropped.
    const isStale = () => connectionRef.current !== connection || interviewRef.current.profile.id !== sessionId;

    const serverError = readServerError(serverEvent);
    if (serverError !== undefined) {
      logEvent("error", {
        msg: "The voice service reported an error",
        event_name: "interview.server_error",
        request_id: sessionId,
        data: { detail: serverError },
      });
      return;
    }

    if (interviewRef.current.phase === "done") {
      farewellRef.current = trackFarewell(farewellRef.current, serverEvent);
      if (farewellRef.current.isFinished) endCall();
      return;
    }

    const toolCalls = extractToolCalls(serverEvent);
    if (toolCalls.length === 0) return;

    const phaseBefore = interviewRef.current.phase;
    const savedNow: string[] = [];
    for (const { callId, toolCall } of toolCalls) {
      const reply = await handleAndSaveToolCall(interviewRef.current, toolCall, (write) =>
        saveProfileWrite(sessionId, write),
      );
      if (isStale()) return;
      interviewRef.current = reply.state;
      logEvent(reply.output.ok ? "info" : "warn", {
        msg: "Applied a tool call from the voice agent",
        event_name: "interview.tool_call_applied",
        request_id: sessionId,
        data: { tool: toolCall.name, result: reply.output.ok ? "accepted" : "rejected" },
      });
      connection.send(buildToolOutputEvent(callId, reply.output));
      if (reply.output.ok) savedNow.push(...reply.output.saved);
    }
    setInterview(interviewRef.current);
    if (savedNow.length > 0) setJustSaved(savedNow);

    const phaseNow = interviewRef.current.phase;
    if (phaseNow !== phaseBefore) {
      logEvent("info", {
        msg: "Interview moved to the next phase",
        event_name: "interview.phase_changed",
        request_id: sessionId,
        data: { from: phaseBefore, to: phaseNow },
      });
      connection.send(buildSessionUpdate(buildAgentConfig(role, phaseNow, getToday())));
    }
    if (phaseNow === "done") {
      farewellRef.current = FAREWELL_NOT_STARTED;
      connection.stopMicrophone();
      farewellTimerRef.current = setTimeout(endCall, FAREWELL_TIMEOUT_MS);
    }
    connection.send({ type: "response.create" });
  }

  function handleDropped(): void {
    connectionRef.current = null;
    if (farewellTimerRef.current) clearTimeout(farewellTimerRef.current);
    const wasSayingGoodbye = interviewRef.current.phase === "done";
    logEvent("warn", {
      msg: "The voice connection closed unexpectedly",
      event_name: "interview.connection_dropped",
      request_id: interviewRef.current.profile.id,
      data: { phase: interviewRef.current.phase },
    });
    setStatus(wasSayingGoodbye ? "finished" : "dropped");
    setSpeaker("none");
  }

  async function startCall(): Promise<void> {
    const audioElement = audioRef.current;
    if (!audioElement || isStartingRef.current) return;
    isStartingRef.current = true;
    setJustSaved([]);
    setAgentLine(undefined);
    setUserLine(undefined);
    setStatus("connecting");

    try {
      // The draft lives in SQLite from the first second, so every tool call has a row to update.
      const profile = await createProfile(role);
      interviewRef.current = { phase: "facts", profile };
      eventQueueRef.current = Promise.resolve();
      setInterview(interviewRef.current);
      const sessionId = profile.id;
      logEvent("info", {
        msg: "Starting the voice interview",
        event_name: "interview.started",
        request_id: sessionId,
        data: { role },
      });

      const clientSecret = await fetchClientSecret();
      const connection = await connectRealtime({
        clientSecret,
        sessionId,
        audioElement,
        onServerEvent: enqueueServerEvent,
        onDropped: handleDropped,
        onOpen: () => {
          connectionRef.current?.send(buildSessionUpdate(buildAgentConfig(role, "facts", getToday())));
          connectionRef.current?.send({ type: "response.create" });
          setStatus("live");
        },
      });
      if (isUnmountedRef.current) {
        connection.close();
        return;
      }
      connectionRef.current = connection;
    } catch (error) {
      logEvent("error", {
        msg: "Could not start the voice interview",
        event_name: "interview.failed",
        request_id: interviewRef.current.profile.id,
        data: { detail: error instanceof Error ? error.message : "unknown error" },
      });
      setStatus("failed");
    } finally {
      isStartingRef.current = false;
    }
  }

  const { profile, phase } = interview;

  return (
    <>
      <audio ref={audioRef} autoPlay />
      <InterviewView
        role={role}
        status={VIEW_STATUS[status]}
        phase={phase}
        profile={profile}
        speaker={speaker}
        agentLine={agentLine}
        userLine={userLine}
        justSaved={justSaved}
        onStart={startCall}
        onEnd={endCall}
        onContinue={() => void continueToApp()}
      />
    </>
  );
}
