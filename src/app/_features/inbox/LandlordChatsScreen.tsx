"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { FeedItem } from "@/domain/profile";

import { MATCH_POLL_MS, getMatches, matchIdFor, peekProfile } from "../../_lib/api";
import { demoLandlord } from "../../_lib/fixtures";
import { initials } from "../../_lib/format";
import { useSession } from "../../_lib/session";
import { Homie } from "../../_ui/homie/Homie";

export function LandlordChatsScreen() {
  const session = useSession("home");
  const [byHome, setByHome] = useState<Record<string, FeedItem[]>>({});

  const homeId = session
    ? session.role === "home"
      ? session.profileId
      : demoLandlord.homeIds[0]!
    : null;

  useEffect(() => {
    if (!homeId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const result = await getMatches(homeId);
        if (!cancelled) {
          setByHome((prev) => ({ ...prev, [homeId]: result }));
        }
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
  }, [homeId]);

  if (!session || !homeId) {
    return <div className="absolute inset-0 bg-cream" />;
  }

  const currentHome = peekProfile(homeId);
  const matches = byHome[homeId];
  const loading = matches === undefined;
  const list = matches ?? [];

  return (
    <div className="no-scrollbar absolute inset-0 overflow-y-auto bg-cream pb-[100px]">
      <header className="px-[20px] pt-[26px]">
        <h1 className="font-display text-[32px] leading-[1.15] font-semibold text-ink">Chats</h1>
        <p className="mt-[2px] text-[14px] text-muted">
          {currentHome ? `Matches for ${currentHome.displayName}` : "People you’ve accepted"}
        </p>
      </header>

      {list.length > 0 ? (
        <div className="mt-[12px] px-[20px]">
          {list.map((item) => {
            const tenant = item.profile;
            const matchId = matchIdFor(tenant.id, homeId);

            return (
              <Link
                key={tenant.id}
                href={`/chat/${encodeURIComponent(matchId)}`}
                className="flex items-center gap-[12px] border-b border-line py-[12px] transition-opacity active:opacity-75"
              >
                <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-ochre-100 font-display text-[20px] font-semibold text-granate">
                  {initials(tenant.displayName)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-[8px]">
                    <span className="truncate text-[15px] font-bold text-ink">
                      {tenant.displayName}
                    </span>
                    <span className="shrink-0 text-[12px] text-subtle">now</span>
                  </div>
                  <div className="mt-[2px] truncate text-[14px] text-muted">Matched · say hi</div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : !loading ? (
        <div className="mt-[56px] flex flex-col items-center px-[32px] text-center">
          <Homie mood="idle" size={128} />
          <div className="mt-[10px] font-display text-[22px] font-semibold text-ink">
            No chats yet
          </div>
          <p className="mt-[6px] text-[14px] leading-[1.45] text-muted">
            Accept someone in Interested to start chatting about a viewing.
          </p>
          <Link
            href="/interested"
            className="mt-[18px] inline-flex min-h-[46px] items-center justify-center rounded-btn bg-granate px-[20px] text-[14px] font-bold text-white transition-colors active:bg-granate-700"
          >
            See interested
          </Link>
        </div>
      ) : null}
    </div>
  );
}
