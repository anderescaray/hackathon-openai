"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import type { Role } from "../domain/profile.ts";
import { buildAgentConfig, type InterviewPhase } from "./agents.ts";
import { handleAndSaveToolCall, startInterview, type InterviewState } from "./interviewSession.ts";
import { HOME_FACT_LABELS, TENANT_FACT_LABELS, formatRequirement, formatValue } from "./labels.ts";
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

const ROLE_TITLES: Record<Role, string> = { tenant: "Busco piso", home: "Alquilo mi piso" };

const PHASE_TITLES: Record<Role, Record<InterviewPhase, string>> = {
  tenant: { facts: "1 de 2 · Sobre ti", requirements: "2 de 2 · Qué buscas", done: "Perfil completo" },
  home: { facts: "1 de 2 · Tu piso", requirements: "2 de 2 · A quién buscas", done: "Perfil completo" },
};

const STATUS_MESSAGES: Record<ScreenStatus, string> = {
  idle: "Pulsa para empezar. Solo tienes que hablar.",
  connecting: "Conectando…",
  live: "Te escucho. Habla con normalidad.",
  finished: "Entrevista terminada.",
  failed: "No se ha podido iniciar la entrevista. Revisa el micrófono y vuelve a intentarlo.",
  dropped: "Se ha cortado la conexión. Vuelve a empezar la entrevista.",
};

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
  }

  function enqueueServerEvent(serverEvent: unknown): void {
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
    }
    setInterview(interviewRef.current);

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
      // The feed reads this tab's profile; sessionStorage keeps each tab (tenant, landlord) separate.
      try {
        sessionStorage.setItem("profileId", sessionId);
      } catch {
        // Storage can be blocked; the interview still ends and the profile is already saved.
      }
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
  }

  async function startCall(): Promise<void> {
    const audioElement = audioRef.current;
    if (!audioElement || isStartingRef.current) return;
    isStartingRef.current = true;
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
  const factLabels: Record<string, string> = role === "tenant" ? TENANT_FACT_LABELS : HOME_FACT_LABELS;
  const facts: Record<string, unknown> = profile.facts;
  const canStart = status === "idle" || status === "failed" || status === "dropped";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 bg-white px-5 py-8 text-zinc-900">
      <audio ref={audioRef} autoPlay />

      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-zinc-500">{ROLE_TITLES[role]}</p>
        <h1 className="text-2xl font-semibold">{PHASE_TITLES[role][phase]}</h1>
        <p role="status" className="text-sm text-zinc-600">
          {STATUS_MESSAGES[status]}
        </p>
      </header>

      {canStart && (
        <button
          type="button"
          onClick={startCall}
          className="h-14 rounded-full bg-zinc-900 text-base font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          Empezar entrevista
        </button>
      )}

      <section aria-labelledby="facts-heading" className="flex flex-col gap-2">
        <h2 id="facts-heading" className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {role === "tenant" ? "Sobre ti" : "Tu piso"}
        </h2>
        <dl className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200">
          {Object.entries(factLabels).map(([field, label]) => {
            const value = facts[field];
            return (
              <div key={field} className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-zinc-600">{label}</dt>
                <dd className={value === undefined ? "text-sm text-zinc-300" : "text-sm font-medium"}>
                  {value === undefined ? "—" : formatValue(value)}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section aria-labelledby="requirements-heading" className="flex flex-col gap-2">
        <h2 id="requirements-heading" className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {role === "tenant" ? "Qué buscas" : "A quién buscas"}
        </h2>
        {profile.requirements.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-400">
            Aparecerá aquí mientras lo cuentas.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {profile.requirements.map((requirement) => (
              <li
                key={`${requirement.field}-${requirement.operator}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 px-4 py-3"
              >
                <span className="text-sm font-medium">{formatRequirement(requirement)}</span>
                <span
                  className={
                    requirement.isMust
                      ? "shrink-0 rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white"
                      : "shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700"
                  }
                >
                  {requirement.isMust ? "Imprescindible" : "Preferencia"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {profile.notes !== "" && (
        <section aria-labelledby="notes-heading" className="flex flex-col gap-2">
          <h2 id="notes-heading" className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Notas
          </h2>
          <p className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm">{profile.notes}</p>
        </section>
      )}
    </main>
  );
}
