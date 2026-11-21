"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Bottom dock with the raised centre button (docs/ui/mockups: `.dock`, `.di`, `.dc`).
 * tenant:   Matches · Discover (centre) · Profile
 * landlord: Chats · Interested (centre) · My listings
 * Absolutely positioned at the bottom of the phone screen, 86px tall: leave `pb-[86px]` (or more) on screens.
 */
export const DOCK_HEIGHT = 86;

type Item = { href: string; label: string; icon: (color: string) => React.ReactNode };

const chatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" />
  </svg>
);

const profileIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
);

const listingsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 11l6-5 6 5v9H3z" />
    <path d="M15 9l3-2.5 3 2.5v11h-6" />
  </svg>
);

const houseIcon = (color: string) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 11l8-7 8 7v9a1 1 0 01-1 1H5a1 1 0 01-1-1z" />
  </svg>
);

const peopleIcon = (color: string) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20c1-3.5 3.3-5 6-5s5 1.5 6 5M16 4.5a3.5 3.5 0 010 7M18 15c1.6.6 2.6 2.2 3 5" />
  </svg>
);

const ITEMS: Record<"tenant" | "landlord", [Item, Item, Item]> = {
  tenant: [
    { href: "/matches", label: "Matches", icon: chatIcon },
    { href: "/discover", label: "Discover", icon: houseIcon },
    { href: "/profile", label: "Profile", icon: profileIcon },
  ],
  landlord: [
    { href: "/chats", label: "Chats", icon: chatIcon },
    { href: "/interested", label: "Interested", icon: peopleIcon },
    { href: "/listings", label: "My listings", icon: listingsIcon },
  ],
};

const itemClass =
  "flex min-h-11 min-w-[72px] flex-col items-center justify-center gap-[3px] text-[11px] font-bold leading-none";

export function Dock({ variant }: { variant: "tenant" | "landlord" }) {
  const pathname = usePathname();
  const [left, centre, right] = ITEMS[variant];
  const isOn = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const centreOn = isOn(centre.href);

  return (
    <nav
      aria-label="Main"
      className="absolute inset-x-0 bottom-0 z-30 flex h-[86px] items-center justify-around rounded-t-[28px] bg-surface-2 shadow-dock"
    >
      {[left, centre, right].map((item) => {
        const on = isOn(item.href);
        const isCentre = item === centre;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={`${itemClass} ${on ? "text-granate" : "text-subtle"}`}
          >
            {isCentre ? (
              <span
                className={`-mt-[34px] flex size-[66px] items-center justify-center rounded-full border-[5px] border-cream ${
                  centreOn ? "bg-granate shadow-fab" : "bg-surface-2 shadow-fab-off"
                }`}
              >
                {item.icon(centreOn ? "#F4EEE6" : "#7C1D2E")}
              </span>
            ) : (
              item.icon("currentColor")
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
