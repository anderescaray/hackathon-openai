"use client";

import { Heart, X } from "lucide-react";
import { motion, useReducedMotion, useTransform, type MotionValue } from "motion/react";

/**
 * The decision icon: a bare granate heart (like) or grey ✕ (pass), centred on the photo. No background.
 * - DragIntent grows with the drag distance (0 → full at the threshold) and fades back if the card returns.
 * - DecisionBurst pops it once the decision is made (release past the threshold, a flick, or ←/→).
 * Neither blocks the pointer.
 */
const ICON_WRAP = "pointer-events-none absolute inset-x-0 top-[240px] z-40 flex justify-center";
const ICON_SHADOW = "flex items-center justify-center drop-shadow-[0_4px_14px_rgba(36,26,28,0.28)]";

function LikeIcon() {
  return <Heart className="size-[120px] fill-granate text-granate" strokeWidth={1.5} />;
}

function PassIcon() {
  return <X className="size-[120px] text-subtle" strokeWidth={3} />;
}

export function DragIntent({ x, threshold }: { x: MotionValue<number>; threshold: number }) {
  const start = threshold * 0.2;
  const likeOpacity = useTransform(x, [start, threshold], [0, 1]);
  const likeScale = useTransform(x, [start, threshold], [0.4, 1]);
  const passOpacity = useTransform(x, [-threshold, -start], [1, 0]);
  const passScale = useTransform(x, [-threshold, -start], [1, 0.4]);
  const passRotate = useTransform(x, [-threshold, -start], [0, -18]);

  return (
    <div className={ICON_WRAP} aria-hidden="true">
      <div className="relative size-[120px]">
        <motion.span className={`absolute inset-0 ${ICON_SHADOW}`} style={{ opacity: likeOpacity, scale: likeScale }}>
          <LikeIcon />
        </motion.span>
        <motion.span
          className={`absolute inset-0 ${ICON_SHADOW}`}
          style={{ opacity: passOpacity, scale: passScale, rotate: passRotate }}
        >
          <PassIcon />
        </motion.span>
      </div>
    </div>
  );
}

export function DecisionBurst({ liked, onDone }: { liked: boolean; onDone: () => void }) {
  const reduced = useReducedMotion() ?? false;

  return (
    <div className={ICON_WRAP} aria-hidden="true">
      <motion.span
        className={`size-[120px] ${ICON_SHADOW}`}
        initial={{ scale: 1, opacity: 1 }}
        animate={reduced ? { opacity: [1, 1, 0] } : { scale: [1, 1.25, 1.1], opacity: [1, 1, 0] }}
        transition={{ duration: 0.6, times: [0, 0.35, 1], ease: "easeOut" }}
        onAnimationComplete={onDone}
      >
        {liked ? <LikeIcon /> : <PassIcon />}
      </motion.span>
    </div>
  );
}
