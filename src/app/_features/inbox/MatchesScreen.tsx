"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import type { FeedItem } from "@/domain/profile";

import {
  MATCH_POLL_MS,
  getMatches,
  landlordNameFor,
  listChats,
  matchIdFor,
  peekProfile,
} from "../../_lib/api";
import { formatEur } from "../../_lib/format";
import { demoSession, useSession } from "../../_lib/session";
import { HouseOutlineIcon } from "./icons";

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

export function MatchesScreen() {
  const session = useSession("tenant");
  const reduced = useReducedMotion();
  const [matches, setMatches] = useState<FeedItem[]>([]);

  const tenantId = session
    ? session.role === "tenant"
      ? session.profileId
      : demoSession("tenant").profileId
    : null;

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const result = await getMatches(tenantId);
        if (!cancelled) setMatches(result);
      } catch {
        // best effort
      }
    };

    void load();
    const timer = setInterval(load, MATCH_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tenantId]);

  if (!session || !tenantId) {
    return <div className="absolute inset-0 bg-cream" />;
  }

  const threads = listChats();

  return (
    <div className="no-scrollbar absolute inset-0 overflow-y-auto bg-cream pb-[100px]">
      <header className="px-[20px] pt-[26px]">
        <h1 className="font-display text-[32px] leading-[1.15] font-semibold text-ink">Matches</h1>
        <p className="mt-[2px] text-[14px] text-muted">Landlords who said yes to you</p>
      </header>

      {matches.length > 0 && (
        <section aria-label="New matches" className="mt-[16px] flex flex-col gap-[10px] px-[12px]">
          {matches.map((item) => {
            const home = item.profile;
            const photo = home.photoUrls[0];
            const rent = home.role === "home" ? home.facts.monthlyRentEur : undefined;
            const landlord = landlordNameFor(home.id);
            const matchId = matchIdFor(tenantId, home.id);

            return (
              <motion.div
                key={home.id}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduced ? { duration: 0 } : SPRING}
                className="flex items-center gap-[12px] rounded-card border-[1.5px] border-ochre-300 bg-surface p-[14px]"
              >
                <div className="relative flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-granate-50">
                  {photo ? (
                    <Image src={photo} alt="" fill sizes="52px" className="object-cover" />
                  ) : (
                    <HouseOutlineIcon size={24} color="#7C1D2E" strokeWidth={2} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-[6px]">
                    <span className="rounded-[6px] bg-ochre-100 px-[7px] py-[3px] text-[10px] leading-none font-extrabold tracking-[0.06em] text-ochre-ink">
                      NEW
                    </span>
                    <span className="text-[12px] text-subtle">just now</span>
                  </div>
                  <div className="mt-[3px] truncate font-display text-[17px] leading-[1.2] font-semibold text-ink">
                    {home.displayName}
                  </div>
                  <div className="truncate text-[13px] text-muted">
                    {landlord}
                    {rent !== undefined ? ` · ${formatEur(rent)}/mo` : ""}
                  </div>
                </div>

                <Link
                  href={`/chat/${encodeURIComponent(matchId)}`}
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-[14px] bg-granate px-[14px] text-[13px] font-bold text-white transition-colors active:bg-granate-700"
                >
                  Say hi
                </Link>
              </motion.div>
            );
          })}
        </section>
      )}

      <div className="px-[20px] pt-[22px] text-[12px] font-bold tracking-[0.06em] text-subtle uppercase">
        Chats
      </div>

      <div className="px-[20px]">
        {threads.map((thread) => {
          const home = peekProfile(thread.homeId);
          const photo = home?.photoUrls[0];
          const lastMessage = thread.messages.at(-1);
          const preview = lastMessage
            ? lastMessage.from === "me"
              ? `You: ${lastMessage.text}`
              : lastMessage.text
            : "Matched · say hi";

          return (
            <Link
              key={thread.id}
              href={`/chat/${encodeURIComponent(thread.id)}`}
              className="flex items-center gap-[12px] border-b border-line py-[12px] transition-opacity active:opacity-75"
            >
              <div className="relative flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-granate-50">
                {photo ? (
                  <Image src={photo} alt="" fill sizes="52px" className="object-cover" />
                ) : (
                  <HouseOutlineIcon size={24} color="#7C1D2E" strokeWidth={2} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-[8px]">
                  <span className="truncate text-[15px] font-bold text-ink">
                    {thread.landlordName} · {home?.displayName ?? "Home"}
                  </span>
                  <span className="shrink-0 text-[12px] text-subtle">{thread.lastAt}</span>
                </div>
                <div className="mt-[2px] truncate text-[14px] text-muted">{preview}</div>
              </div>

              {thread.unread && (
                <span
                  aria-label="Unread message"
                  className="size-[10px] shrink-0 rounded-full bg-granate"
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
