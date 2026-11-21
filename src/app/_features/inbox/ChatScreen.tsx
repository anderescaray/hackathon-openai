"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import type { Profile } from "@/domain/profile";

import { getChat, getProfile, peekProfile } from "../../_lib/api";
import type { ChatMessage } from "../../_lib/fixtures";
import { formatEur, initials } from "../../_lib/format";
import { useSession } from "../../_lib/session";
import { Homie } from "../../_ui/homie/Homie";
import {
  BackChevronIcon,
  CalendarIcon,
  CheckIcon,
  HouseOutlineIcon,
  SendArrowIcon,
} from "./icons";

type Suggestion = { label: string; text: string };

const TENANT_SUGGESTIONS: Suggestion[] = [
  { label: "Ask about the deposit", text: "Hi! Is the deposit one month or two?" },
  { label: "Share my documents", text: "I can share my contract and payslips whenever you're ready." },
  { label: "Propose a viewing", text: "Would you be free for a viewing this week?" },
];

const LANDLORD_SUGGESTIONS: Suggestion[] = [
  { label: "Propose a viewing", text: "Hi! Your profile fits really well. Would you like to see the flat this week?" },
  { label: "Ask about move-in", text: "Does the move-in date work flexibly for you?" },
  { label: "Share flat details", text: "Happy to answer any questions about the flat or building." },
];

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

export function ChatScreen() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const session = useSession("tenant");
  const reduced = useReducedMotion();

  const rawMatchId = typeof params?.matchId === "string" ? decodeURIComponent(params.matchId) : "";
  const thread = getChat(rawMatchId);

  const [loadedProfiles, setLoadedProfiles] = useState<Record<string, Profile>>({});
  const [extraByThread, setExtraByThread] = useState<Record<string, ChatMessage[]>>({});
  const [draft, setDraft] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const ids = [thread.homeId, thread.tenantId].filter(Boolean);

    const loadMissing = async () => {
      for (const id of ids) {
        if (peekProfile(id)) continue;
        try {
          const profile = await getProfile(id);
          if (!cancelled) {
            setLoadedProfiles((prev) => ({ ...prev, [id]: profile }));
          }
        } catch {
          // fallback to thread metadata
        }
      }
    };

    void loadMissing();
    return () => {
      cancelled = true;
    };
  }, [thread.homeId, thread.tenantId]);

  const localMessages = extraByThread[rawMatchId] ?? [];
  const totalCount = thread.messages.length + localMessages.length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }, [totalCount, reduced]);

  if (!session) {
    return <div className="absolute inset-0 bg-cream" />;
  }

  const isLandlord = session.role === "home";
  const home = peekProfile(thread.homeId) ?? loadedProfiles[thread.homeId];
  const tenant = peekProfile(thread.tenantId) ?? loadedProfiles[thread.tenantId];

  const homePhoto = home?.photoUrls[0];
  const homeName = home?.displayName ?? "Home";
  const homeRent = home?.role === "home" ? home.facts.monthlyRentEur : undefined;
  const otherPersonName = isLandlord ? (tenant?.displayName ?? "Tenant") : thread.landlordName;

  const messages = [
    ...thread.messages.map((msg, index) => ({
      key: `fixture-${index}`,
      mine: isLandlord ? msg.from === "them" : msg.from === "me",
      text: msg.text,
      isNew: false,
    })),
    ...localMessages.map((msg, index) => ({
      key: `local-${index}`,
      mine: true,
      text: msg.text,
      isNew: true,
    })),
  ];

  const suggestions = isLandlord ? LANDLORD_SUGGESTIONS : TENANT_SUGGESTIONS;

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(isLandlord ? "/chats" : "/matches");
    }
  };

  const handleSend = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setExtraByThread((prev) => ({
      ...prev,
      [rawMatchId]: [...(prev[rawMatchId] ?? []), { from: "me", text }],
    }));
    setDraft("");
  };

  const handlePickSuggestion = (suggestion: Suggestion) => {
    setDraft(suggestion.text);
    inputRef.current?.focus();
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-cream">
      <header className="flex items-center gap-[10px] border-b border-line bg-surface-2 px-[14px] pt-[18px] pb-[14px]">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back"
          className="flex size-[44px] shrink-0 items-center justify-center rounded-full border-0 bg-transparent transition-colors active:bg-cream"
        >
          <BackChevronIcon size={22} color="#241A1C" />
        </button>

        {isLandlord ? (
          <span className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-ochre-100 font-display text-[16px] font-semibold text-granate">
            {initials(otherPersonName)}
          </span>
        ) : (
          <div className="relative flex size-[42px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-granate-50">
            {homePhoto ? (
              <Image src={homePhoto} alt="" fill sizes="42px" className="object-cover" />
            ) : (
              <HouseOutlineIcon size={20} color="#7C1D2E" strokeWidth={2} />
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] leading-[1.25] font-bold text-ink">
            {otherPersonName}
          </div>
          <div className="truncate text-[12px] text-muted">
            {homeName}
            {homeRent !== undefined ? ` · ${formatEur(homeRent)}` : ""}
          </div>
        </div>
      </header>

      <div className="no-scrollbar flex flex-1 flex-col gap-[10px] overflow-y-auto px-[14px] py-[16px]">
        <div className="inline-flex items-center gap-[6px] self-center rounded-full bg-ochre-100 px-[12px] py-[7px] text-[12px] font-bold text-ochre-ink">
          <CheckIcon size={12} color="#6B4C0E" strokeWidth={3} />
          Matched · must-haves met on both sides
        </div>

        {messages.length === 0 ? (
          <div className="my-auto flex flex-col items-center gap-[10px] px-[24px] py-[20px] text-center">
            <Homie mood="wink" size={90} />
            <div className="font-display text-[19px] leading-[1.2] font-semibold text-ink">
              Say hi to {otherPersonName}
            </div>
            <p className="text-[14px] leading-[1.4] text-muted">
              Break the ice — Homie already told them you fit.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <motion.div
                key={msg.key}
                initial={msg.isNew && !reduced ? { opacity: 0, y: 10, scale: 0.96 } : false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={reduced ? { duration: 0 } : SPRING}
                className={
                  msg.mine
                    ? "max-w-[76%] self-end rounded-[18px] rounded-br-[6px] bg-granate px-[14px] py-[11px] text-[14px] leading-[1.4] text-white"
                    : "max-w-[76%] self-start rounded-[18px] rounded-bl-[6px] bg-surface px-[14px] py-[11px] text-[14px] leading-[1.4] text-ink"
                }
              >
                {msg.text}
              </motion.div>
            ))}

            {thread.viewing && (
              <div className="flex items-center gap-[10px] self-start rounded-[18px] border-[1.5px] border-ochre-300 bg-surface px-[14px] py-[12px] text-[13px]">
                <CalendarIcon size={22} color="#7C1D2E" className="shrink-0" />
                <div>
                  <div className="font-bold text-ink">Viewing · {thread.viewing.when}</div>
                  <div className="text-muted">{thread.viewing.where}</div>
                </div>
              </div>
            )}
          </>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="no-scrollbar flex gap-[6px] overflow-x-auto px-[14px] pb-[10px]">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.label}
            type="button"
            onClick={() => handlePickSuggestion(suggestion)}
            className="shrink-0 whitespace-nowrap rounded-full border border-stone bg-transparent px-[12px] py-[8px] text-[13px] text-ink transition-colors active:bg-surface"
          >
            {suggestion.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-center gap-[8px] border-t border-line bg-surface-2 px-[14px] pt-[10px] pb-[26px]"
      >
        <label className="flex flex-1">
          <span className="sr-only">Message</span>
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Message ${otherPersonName}…`}
            className="min-h-[46px] flex-1 rounded-[23px] border border-stone bg-surface px-[16px] text-[15px] text-ink outline-none placeholder:text-subtle focus:border-granate"
          />
        </label>
        <button
          type="submit"
          aria-label="Send"
          className="flex size-[46px] shrink-0 items-center justify-center rounded-full border-0 bg-granate transition-colors active:bg-granate-700"
        >
          <SendArrowIcon size={20} color="#FFFFFF" />
        </button>
      </form>
    </div>
  );
}
