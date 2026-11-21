export function DiscoverSkeleton() {
  return (
    <div className="absolute inset-0 bg-cream" aria-busy="true" aria-label="Loading homes">
      <div className="h-[560px] w-full animate-pulse bg-track/70" />

      <div className="pointer-events-none absolute inset-x-[20px] top-[20px] z-20 flex items-center justify-between">
        <span className="rounded-full bg-cream/94 px-[14px] py-[6px] font-display text-[24px] font-semibold leading-[1.2] text-granate">
          homie
        </span>
        <span className="h-[30px] w-[108px] animate-pulse rounded-full bg-cream/94" />
      </div>

      <div className="absolute inset-x-[12px] top-[420px] bottom-[108px] flex flex-col gap-[12px] rounded-sheet bg-surface p-[20px] shadow-sheet">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-1 flex-col gap-[8px]">
            <div className="h-[26px] w-3/4 animate-pulse rounded-[8px] bg-line" />
            <div className="h-[16px] w-3/5 animate-pulse rounded-[6px] bg-cream" />
          </div>
          <div className="flex flex-col items-end gap-[6px]">
            <div className="h-[28px] w-[72px] animate-pulse rounded-[8px] bg-granate-50" />
            <div className="h-[13px] w-[58px] animate-pulse rounded-[6px] bg-cream" />
          </div>
        </div>

        <div className="flex flex-wrap gap-[6px]">
          <div className="h-[30px] w-[112px] animate-pulse rounded-chip bg-granate-50/70" />
          <div className="h-[30px] w-[82px] animate-pulse rounded-chip bg-granate-50/70" />
          <div className="h-[30px] w-[102px] animate-pulse rounded-chip bg-granate-50/70" />
        </div>

        <div className="mt-auto h-[16px] w-[196px] animate-pulse rounded-[6px] bg-cream" />
      </div>
    </div>
  );
}
