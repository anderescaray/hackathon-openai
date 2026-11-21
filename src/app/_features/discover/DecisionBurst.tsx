"use client";

import { Heart, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Feedback when a home is decided: just the icon, no background — a granate heart (like) or a grey ✕ (pass)
 * that pops in the middle of the photo and fades. Never blocks the pointer.
 * Mount it with a fresh `key` per decision and remove it on `onDone`.
 */
export function DecisionBurst({ liked, onDone }: { liked: boolean; onDone: () => void }) {
  const reduced = useReducedMotion() ?? false;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[300px] z-40 flex justify-center" aria-hidden="true">
      <motion.span
        className="flex items-center justify-center drop-shadow-[0_4px_14px_rgba(36,26,28,0.28)]"
        initial={{ scale: reduced ? 1 : 0.3, opacity: 0, rotate: liked || reduced ? 0 : -18 }}
        animate={
          reduced
            ? { opacity: [0, 1, 1, 0] }
            : { scale: [0.3, 1.18, 1, 1.06], opacity: [0, 1, 1, 0], rotate: liked ? 0 : [-18, 4, 0, 0] }
        }
        transition={{ duration: 0.85, times: [0, 0.32, 0.68, 1], ease: "easeOut" }}
        onAnimationComplete={onDone}
        style={{ marginTop: -60 }}
      >
        {liked ? (
          <Heart className="size-[120px] fill-granate text-granate" strokeWidth={1.5} />
        ) : (
          <X className="size-[120px] text-subtle" strokeWidth={3} />
        )}
      </motion.span>
    </div>
  );
}
