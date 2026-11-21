"use client";

import { Heart, X } from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "motion/react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from "react";

import type { FeedItem, HomeProfile, Profile } from "@/domain/profile";

import {
  DAILY_HOMES,
  getFeed,
  getProfile,
  markMatchSeen,
  matchIdFor,
  swipe,
} from "@/app/_lib/api";
import { evaluateRequirements, type FitResult } from "@/app/_lib/fit";
import { useSession } from "@/app/_lib/session";
import { MatchCelebration } from "@/app/_features/match/MatchCelebration";

import { DayDone } from "./DayDone";
import { DecisionBurst } from "./DecisionBurst";
import { DiscoverSkeleton } from "./DiscoverSkeleton";
import { FitsOverlay } from "./FitsOverlay";
import { HomeCard } from "./HomeCard";
import { photoIndexForPage } from "./PhotoPager";

const CARD_SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };
const SWIPE_DISTANCE_PX = 120;
const SWIPE_VELOCITY_PX = 600;
const TAP_SLOP_PX = 8;

const EMPTY_FIT: FitResult = { musts: [], nice: [], theyRequire: [] };

type SwipeCardHandle = {
  decide: (liked: boolean) => void;
};

type SwipeCardProps = {
  home: HomeProfile;
  viewer: Profile | null;
  fit: FitResult;
  isTop: boolean;
  dragDisabled: boolean;
  activePage: number;
  onPageChange: (page: number) => void;
  onTapPhoto: () => void;
  onDecide: (liked: boolean) => void;
  /** fires as soon as the card starts flying out (drives the heart / ✕ burst) */
  onDecisionStart?: (liked: boolean) => void;
  cardRef?: Ref<SwipeCardHandle>;
};

function SwipeCard({
  home,
  viewer,
  fit,
  isTop,
  dragDisabled,
  activePage,
  onPageChange,
  onTapPhoto,
  onDecide,
  onDecisionStart,
  cardRef,
}: SwipeCardProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const x = useMotionValue(0);
  const cardOpacity = useMotionValue(1);

  const rawRotate = useTransform(x, [-240, 0, 240], [-12, 0, 12]);
  const cardRadius = useTransform(x, [-24, 0, 24], [28, 0, 28]);
  const likeOpacity = useTransform(x, [0, SWIPE_DISTANCE_PX], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_DISTANCE_PX, 0], [1, 0]);
  const rawLikeScale = useTransform(x, [0, SWIPE_DISTANCE_PX], [0.75, 1]);
  const rawPassScale = useTransform(x, [-SWIPE_DISTANCE_PX, 0], [1, 0.75]);

  const decidingRef = useRef(false);
  const didDragRef = useRef(false);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  const runDecision = useCallback(
    async (liked: boolean, velocityX = 0) => {
      if (decidingRef.current) return;
      decidingRef.current = true;
      onDecisionStart?.(liked);
      if (prefersReducedMotion) {
        await animate(cardOpacity, 0, { duration: 0.16 });
      } else {
        await animate(x, liked ? 600 : -600, {
          ...CARD_SPRING,
          velocity: velocityX,
          restDelta: 15,
          restSpeed: 15,
        });
      }
      onDecide(liked);
    },
    [cardOpacity, onDecide, onDecisionStart, prefersReducedMotion, x],
  );

  useImperativeHandle(
    cardRef,
    () => ({
      decide: (liked: boolean) => {
        void runDecision(liked, 0);
      },
    }),
    [runDecision],
  );

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    didDragRef.current = false;
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleDragStart = () => {
    didDragRef.current = true;
  };

  const handleDragEnd = (_event: globalThis.MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (decidingRef.current) return;
    const passedDistance = Math.abs(info.offset.x) > SWIPE_DISTANCE_PX;
    const passedVelocity = Math.abs(info.velocity.x) > SWIPE_VELOCITY_PX;
    if (passedDistance || passedVelocity) {
      const liked = passedDistance ? info.offset.x > 0 : info.velocity.x > 0;
      void runDecision(liked, info.velocity.x);
    } else {
      animate(x, 0, CARD_SPRING);
    }
  };

  const handleTapPhoto = (e: MouseEvent<HTMLElement>) => {
    if (!isTop || dragDisabled || decidingRef.current || didDragRef.current) return;
    const start = pointerDownRef.current;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) >= TAP_SLOP_PX) return;
    onTapPhoto();
  };

  return (
    <motion.div
      initial={isTop ? false : { scale: 0.96 }}
      animate={{ scale: isTop ? 1 : 0.96 }}
      transition={prefersReducedMotion ? { duration: 0.15 } : CARD_SPRING}
      drag={isTop && !dragDisabled ? "x" : false}
      dragDirectionLock
      dragMomentum={false}
      onPointerDown={handlePointerDown}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        x: isTop ? x : 0,
        rotate: isTop && !prefersReducedMotion ? rawRotate : 0,
        opacity: cardOpacity,
        borderRadius: isTop ? cardRadius : 0,
      }}
      className={`absolute inset-0 touch-pan-y select-none overflow-hidden bg-cream ${
        isTop ? "z-10 cursor-grab active:cursor-grabbing" : "pointer-events-none z-0"
      }`}
    >
      <HomeCard
        home={home}
        viewer={viewer}
        fit={fit}
        preload={isTop}
        activePage={activePage}
        onPageChange={onPageChange}
        onTapPhoto={handleTapPhoto}
      />

      {/* Border tints + Like/Pass badges (60fps via MotionValues, zero React state) */}
      {isTop && (
        <>
          <motion.div
            aria-hidden="true"
            style={{ opacity: likeOpacity, borderRadius: cardRadius }}
            className="pointer-events-none absolute inset-0 z-20 border-[4px] border-granate"
          />
          <motion.div
            aria-hidden="true"
            style={{ opacity: passOpacity, borderRadius: cardRadius }}
            className="pointer-events-none absolute inset-0 z-20 border-[4px] border-subtle"
          />

          <motion.div
            aria-hidden="true"
            style={{
              opacity: likeOpacity,
              scale: prefersReducedMotion ? 1 : rawLikeScale,
            }}
            className="pointer-events-none absolute top-[88px] left-[24px] z-20 flex size-[64px] items-center justify-center rounded-full bg-granate text-white shadow-fab"
          >
            <Heart className="size-7 fill-white text-white" strokeWidth={2.2} />
          </motion.div>

          <motion.div
            aria-hidden="true"
            style={{
              opacity: passOpacity,
              scale: prefersReducedMotion ? 1 : rawPassScale,
            }}
            className="pointer-events-none absolute top-[88px] right-[24px] z-20 flex size-[64px] items-center justify-center rounded-full bg-ink text-cream ring-2 ring-subtle/40 shadow-card"
          >
            <X className="size-7" strokeWidth={2.6} />
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

export function SwipeDeck() {
  const session = useSession("tenant");
  const router = useRouter();

  const [loadedForId, setLoadedForId] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [initialCount, setInitialCount] = useState(0);
  const [viewer, setViewer] = useState<Profile | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activePages, setActivePages] = useState<Record<string, number>>({});
  const [fitsOpen, setFitsOpen] = useState(false);
  const [activeMatch, setActiveMatch] = useState<FeedItem | null>(null);
  const [burst, setBurst] = useState<{ id: number; liked: boolean } | null>(null);

  const topCardRef = useRef<SwipeCardHandle | null>(null);
  const profileId = session?.profileId ?? null;

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;

    Promise.all([getFeed(profileId), getProfile(profileId)])
      .then(([items, viewerProfile]) => {
        if (cancelled) return;
        const homesOnly = items.filter((item) => item.profile.role === "home").slice(0, DAILY_HOMES);
        setFeed(homesOnly);
        setInitialCount(homesOnly.length);
        setViewer(viewerProfile);
        setCurrentIndex(0);
        setActivePages({});
        setFitsOpen(false);
        setLoadedForId(profileId);
      })
      .catch((err) => {
        console.warn("[homie] discover load failed", err);
        if (cancelled) return;
        setFeed([]);
        setInitialCount(0);
        setCurrentIndex(0);
        setLoadedForId(profileId);
      });

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const isLoading = !profileId || loadedForId !== profileId;
  const topItem = feed[currentIndex] ?? null;
  const nextItem = feed[currentIndex + 1] ?? null;

  const topHome = topItem && topItem.profile.role === "home" ? topItem.profile : null;
  const nextHome = nextItem && nextItem.profile.role === "home" ? nextItem.profile : null;

  const topFit = useMemo(
    () => (viewer && topHome ? evaluateRequirements(viewer, topHome) : EMPTY_FIT),
    [viewer, topHome],
  );
  const nextFit = useMemo(
    () => (viewer && nextHome ? evaluateRequirements(viewer, nextHome) : EMPTY_FIT),
    [viewer, nextHome],
  );

  const handleDecide = useCallback(
    (homeId: string, liked: boolean) => {
      if (!profileId) return;
      setFitsOpen(false);
      setCurrentIndex((prev) => prev + 1);

      void swipe(profileId, homeId, liked)
        .then((result) => {
          if (result.match) {
            markMatchSeen(matchIdFor(profileId, result.match.profile.id));
            setActiveMatch(result.match);
          }
        })
        .catch((err) => {
          console.warn("[homie] swipe failed", err);
        });
    },
    [profileId],
  );

  // Keyboard support: ArrowLeft = pass, ArrowRight = like, Escape = close FitsOverlay
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (e.key === "Escape" && fitsOpen) {
        setFitsOpen(false);
        return;
      }
      if (isLoading || fitsOpen || activeMatch || !topHome) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        topCardRef.current?.decide(false);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        topCardRef.current?.decide(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeMatch, fitsOpen, isLoading, topHome]);

  if (isLoading) {
    return <DiscoverSkeleton />;
  }

  const alreadyDecidedBeforeLoad = Math.max(0, DAILY_HOMES - initialCount);
  const counterNumber = Math.min(DAILY_HOMES, alreadyDecidedBeforeLoad + currentIndex + 1);

  const topActivePage = topHome ? (activePages[topHome.id] ?? 0) : 0;
  const topPhotoIndex = topHome
    ? Math.min(photoIndexForPage(topActivePage), Math.max(0, topHome.photoUrls.length - 1))
    : 0;
  const topActivePhotoUrl = topHome?.photoUrls[topPhotoIndex];

  return (
    <div className="absolute inset-0 overflow-hidden bg-cream">
      {!topHome ? (
        <DayDone />
      ) : (
        <>
          {/* Card stack: next peeking behind at scale 0.96, top interactive */}
          {nextHome && (
            <SwipeCard
              key={nextHome.id}
              home={nextHome}
              viewer={viewer}
              fit={nextFit}
              isTop={false}
              dragDisabled
              activePage={activePages[nextHome.id] ?? 0}
              onPageChange={(page) => setActivePages((prev) => ({ ...prev, [nextHome.id]: page }))}
              onTapPhoto={() => {}}
              onDecide={() => {}}
            />
          )}

          <SwipeCard
            key={topHome.id}
            cardRef={topCardRef}
            home={topHome}
            viewer={viewer}
            fit={topFit}
            isTop
            dragDisabled={fitsOpen || activeMatch !== null}
            activePage={topActivePage}
            onPageChange={(page) => setActivePages((prev) => ({ ...prev, [topHome.id]: page }))}
            onTapPhoto={() => setFitsOpen(true)}
            onDecide={(liked) => handleDecide(topHome.id, liked)}
            onDecisionStart={(liked) => setBurst((prev) => ({ id: (prev?.id ?? 0) + 1, liked }))}
          />

          {/* Fixed header pills above the card stack */}
          {!fitsOpen && (
            <div className="pointer-events-none absolute inset-x-[20px] top-[20px] z-20 flex items-center justify-between">
              <span className="rounded-full bg-cream/94 px-[14px] py-[6px] font-display text-[24px] font-semibold leading-[1.2] text-granate">
                homie
              </span>
              <span className="inline-flex items-center gap-[6px] rounded-full bg-cream/94 px-[12px] py-[8px] text-[12px] font-bold leading-none text-ink">
                <span className="size-[7px] rounded-full bg-ochre" />
                {counterNumber} of {DAILY_HOMES} today
              </span>
            </div>
          )}

          {/* Phone 2: "Fits you X/Y" overlay on tap */}
          <AnimatePresence>
            {fitsOpen && (
              <FitsOverlay
                key="fits-overlay"
                home={topHome}
                fit={topFit}
                photoUrl={topActivePhotoUrl}
                onClose={() => setFitsOpen(false)}
              />
            )}
          </AnimatePresence>
        </>
      )}

      {burst && <DecisionBurst key={burst.id} liked={burst.liked} onDone={() => setBurst(null)} />}

      {/* Mutual match celebration (can show even right after the 5th swipe) */}
      {activeMatch && profileId && (
        <MatchCelebration
          item={activeMatch}
          viewer={viewer}
          side="tenant"
          onSayHi={() => {
            const id = matchIdFor(profileId, activeMatch.profile.id);
            setActiveMatch(null);
            router.push(`/chat/${encodeURIComponent(id)}`);
          }}
          onClose={() => setActiveMatch(null)}
        />
      )}
    </div>
  );
}
