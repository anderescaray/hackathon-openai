import { logEvent } from "./log.ts";
import type { RealtimeClientEvent } from "./realtimeEvents.ts";

const REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";
const EVENTS_CHANNEL_NAME = "oai-events";

export type RealtimeConnection = {
  send: (event: RealtimeClientEvent) => void;
  stopMicrophone: () => void;
  close: () => void;
};

export type RealtimeConnectionOptions = {
  clientSecret: string;
  sessionId: string;
  audioElement: HTMLAudioElement;
  onOpen: () => void;
  onServerEvent: (serverEvent: unknown) => void;
  onDropped: () => void;
};

export async function connectRealtime({
  clientSecret,
  sessionId,
  audioElement,
  onOpen,
  onServerEvent,
  onDropped,
}: RealtimeConnectionOptions): Promise<RealtimeConnection> {
  const microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
  const peer = new RTCPeerConnection();

  const stopMicrophone = (): void => {
    microphone.getTracks().forEach((track) => track.stop());
  };
  let isClosed = false;
  const close = (): void => {
    isClosed = true;
    stopMicrophone();
    peer.close();
  };
  const reportDropped = (): void => {
    if (isClosed) return;
    close();
    onDropped();
  };
  peer.addEventListener("connectionstatechange", () => {
    if (peer.connectionState === "failed" || peer.connectionState === "closed") reportDropped();
  });

  peer.ontrack = (trackEvent) => {
    audioElement.srcObject = trackEvent.streams[0];
  };
  microphone.getTracks().forEach((track) => peer.addTrack(track, microphone));

  const eventsChannel = peer.createDataChannel(EVENTS_CHANNEL_NAME);
  eventsChannel.addEventListener("open", onOpen);
  eventsChannel.addEventListener("close", reportDropped);
  eventsChannel.addEventListener("message", (message) => {
    let serverEvent: unknown;
    try {
      serverEvent = JSON.parse(String(message.data));
    } catch {
      logEvent("warn", {
        msg: "Ignored a server message that is not JSON",
        event_name: "interview.server_event_invalid",
        request_id: sessionId,
      });
      return;
    }
    onServerEvent(serverEvent);
  });

  try {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const answer = await fetch(REALTIME_CALLS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${clientSecret}`, "Content-Type": "application/sdp" },
      body: offer.sdp,
    });
    if (!answer.ok) throw new Error(`OpenAI rejected the call with status ${answer.status}`);
    await peer.setRemoteDescription({ type: "answer", sdp: await answer.text() });
  } catch (error) {
    close();
    throw error;
  }

  return {
    send: (event) => eventsChannel.send(JSON.stringify(event)),
    stopMicrophone,
    close,
  };
}
