"use client";

import Link from "next/link";

import { DAILY_HOMES, resetMockData } from "@/app/_lib/api";
import { Homie } from "@/app/_ui/homie/Homie";

export function DayDone() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-cream px-[32px] pt-[64px] pb-[106px] text-center">
      <div className="pointer-events-none absolute top-[20px] left-[20px]">
        <span className="inline-block rounded-full bg-cream/94 px-[14px] py-[6px] font-display text-[24px] font-semibold leading-[1.2] text-granate">
          roomie
        </span>
      </div>

      <Homie mood="sleep" size={150} />

      <h1 className="mt-[20px] font-display text-[28px] font-semibold leading-[1.15] text-ink">
        That&rsquo;s your {DAILY_HOMES} for today
      </h1>

      <p className="mt-[10px] max-w-[280px] text-[15px] leading-[1.45] text-muted">
        Roomie is out looking for more. Come back tomorrow &mdash; we&rsquo;ll only show you homes that fit both ways.
      </p>

      <Link
        href="/matches"
        className="mt-[20px] inline-flex min-h-[44px] items-center justify-center px-[16px] text-[15px] font-semibold text-granate transition-colors hover:text-granate-700"
      >
        See your matches
      </Link>

      <button
        type="button"
        onClick={() => {
          resetMockData();
          window.location.reload();
        }}
        className="mt-[4px] min-h-[40px] px-[14px] text-[13px] font-medium text-subtle underline decoration-dash underline-offset-4 transition-colors hover:text-muted"
      >
        Start the demo again
      </button>
    </div>
  );
}
