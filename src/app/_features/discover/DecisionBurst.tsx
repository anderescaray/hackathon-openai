"use client";

import { Heart, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Feedback when a home is decided: a granate heart that pops with small hearts bursting out (like),
 * or a white ✕ that pops with a small turn (pass). Centred on the photo, never blocks the pointer.
 * Mount it with a fresh `key` per decision and remove it on `onDone`.
 */
const PARTICLES = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
  const distance = i % 2 === 0 ? 96 : 76;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    size: i % 2 === 0 ? 18 : 13,
    color: i % 2 === 0 ? "#E2B04A" : "#F5E1E1",
    delay: 0.08 + (i % 3) * 0.03,
  };
});

export function DecisionBurst({ liked, onDone }: { liked: boolean; onDone: () => void }) {
  const reduced = useReducedMotion() ?? false;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[300px] z-40 flex justify-center" aria-hidden="true">
      <div className="relative flex size-0 items-center justify-center">
        {liked &&
          !reduced &&
          PARTICLES.map((p, i) => (
            <motion.span
              key={i}
              className="absolute"
              initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
              animate={{ x: p.x, y: p.y, scale: [0.3, 1, 0.8], opacity: [0, 1, 0] }}
              transition={{ duration: 0.75, delay: p.delay, ease: "easeOut" }}
            >
              <Heart style={{ width: p.size, height: p.size, color: p.color, fill: p.color }} strokeWidth={0} />
            </motion.span>
          ))}

        <motion.span
          className={`absolute flex size-[112px] items-center justify-center rounded-full ${
            liked ? "bg-granate shadow-fab" : "bg-surface shadow-card"
          }`}
          initial={{ scale: reduced ? 1 : 0.3, opacity: 0, rotate: liked || reduced ? 0 : -18 }}
          animate={
            reduced
              ? { opacity: [0, 1, 1, 0] }
              : { scale: [0.3, 1.14, 1, 1.08], opacity: [0, 1, 1, 0], rotate: liked ? 0 : [-18, 4, 0, 0] }
          }
          transition={{ duration: 0.85, times: [0, 0.32, 0.68, 1], ease: "easeOut" }}
          onAnimationComplete={onDone}
        >
          {liked ? (
            <Heart className="size-[52px] fill-white text-white" strokeWidth={2} />
          ) : (
            <X className="size-[52px] text-ink" strokeWidth={2.6} />
          )}
        </motion.span>
      </div>
    </div>
  );
}
