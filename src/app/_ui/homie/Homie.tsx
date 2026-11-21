/**
 * Homie, the reporter house. THE ONLY mascot in the app: never draw another house.
 * Ported path-for-path from docs/ui/mockups/tenant-core.html (reporter pose: notebook + retro mic)
 * and docs/ui/mockups/after-swipe.html (arms-up pose: wink / celebrate). Triangle roof is always granate.
 *
 * Moods
 * - idle:      reporter pose, bobbing, blinking, brow lifting
 * - listening: reporter pose, the mic tilts towards the person
 * - speaking:  reporter pose, mouth opens and closes
 * - wink:      arms up, right eye winks, left arm waves (match moment, greeting)
 * - celebrate: arms up, both eyes open, both arms wave
 * - sleep:     eyes closed, arms down, floating "z" (day done)
 *
 * `disc` draws the cream disc and ochre sparkles behind him, exactly as on the match screen.
 * Animation classes live in globals.css (`.homie-*`) and respect prefers-reduced-motion.
 */
export type HomieMood = "idle" | "listening" | "speaking" | "wink" | "celebrate" | "sleep";

export type HomieProps = {
  mood: HomieMood;
  /** Rendered width in px. Height keeps the 200×240 (or 230×250 with `disc`) aspect ratio. */
  size?: number;
  disc?: boolean;
  className?: string;
};

const INK = "#241A1C";
const GRANATE = "#7C1D2E";
const WALL = "#FBF5EA";
const OCHRE = "#C08A1E";
const OCHRE_300 = "#E2B04A";
const OCHRE_100 = "#F7E3B5";
const CREAM = "#F4EEE6";

function Body({ onDisc }: { onDisc: boolean }) {
  return (
    <>
      <ellipse cx="100" cy="232" rx="46" ry="5" fill={onDisc ? "#000" : INK} opacity={onDisc ? 0.2 : 0.14} />
      <rect x="78" y="198" width="12" height="24" rx="6" fill={INK} />
      <rect x="110" y="198" width="12" height="24" rx="6" fill={INK} />
      <path d="M66 228 Q66 218 80 218 H92 V230 H66 Z" fill={INK} />
      <path d="M108 218 H120 Q134 218 134 228 V230 H108 Z" fill={INK} />
      <rect x="124" y="44" width="16" height="36" rx="2" fill={GRANATE} stroke={INK} strokeWidth="4" />
      <rect x="52" y="94" width="96" height="108" rx="8" fill={WALL} stroke={INK} strokeWidth="4" />
      <path d="M34 102 L100 36 L166 102 Z" fill={GRANATE} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <circle cx="100" cy="76" r="9" fill={OCHRE_100} stroke={INK} strokeWidth="3" />
      <path d="M100 67 V85 M91 76 H109" stroke={INK} strokeWidth="2.5" />
      <rect x="62" y="166" width="16" height="20" rx="3" fill={OCHRE_100} stroke={INK} strokeWidth="3" />
      <rect x="122" y="166" width="16" height="20" rx="3" fill={OCHRE_100} stroke={INK} strokeWidth="3" />
      <path d="M88 202 V180 a12 12 0 0124 0 V202" fill={GRANATE} stroke={INK} strokeWidth="3.5" />
      <circle cx="106" cy="191" r="2" fill={OCHRE_300} />
    </>
  );
}

function Bowtie({ cy }: { cy: number }) {
  const d = `M92 ${cy - 6} L100 ${cy} L92 ${cy + 6} Z M108 ${cy - 6} L100 ${cy} L108 ${cy + 6} Z`;
  return (
    <>
      <path d={d} fill={OCHRE} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="100" cy={cy} r="3" fill={INK} />
    </>
  );
}

function OpenEye({ cx, cy, blink }: { cx: number; cy: number; blink: boolean }) {
  return (
    <g className={blink ? "homie-eye" : undefined}>
      <circle cx={cx} cy={cy} r="7" fill={INK} />
      <circle cx={cx + 2} cy={cy - 2.5} r="2.2" fill="#fff" />
    </g>
  );
}

/** tenant-core.html phone 3: notebook in the left hand, retro mic in the right. */
function ReporterPose({ mood }: { mood: "idle" | "listening" | "speaking" }) {
  return (
    <>
      <path className="homie-brow" d="M68 112 Q76 104 86 110" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M114 114 H132" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <OpenEye cx={78} cy={126} blink />
      <OpenEye cx={122} cy={126} blink />
      <circle cx="66" cy="140" r="6" fill={GRANATE} opacity=".22" />
      <circle cx="134" cy="140" r="6" fill={GRANATE} opacity=".22" />
      <path d="M84 142 Q92 136 100 142 Q108 136 116 142 Q108 150 100 145 Q92 150 84 142 Z" fill={INK} />
      {mood === "speaking" ? (
        <>
          <path className="homie-talk" d="M93 152 Q100 158 107 152" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path
            className="homie-talk-inverse"
            d="M92 150 Q100 161 108 150 Z"
            fill={GRANATE}
            stroke={INK}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <path d="M93 152 Q100 158 107 152" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      )}
      <Bowtie cy={166} />
      <path d="M52 140 Q36 146 34 164" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <g transform="rotate(-12 30 172)">
        <rect x="18" y="160" width="24" height="30" rx="3" fill="#fff" stroke={INK} strokeWidth="3" />
        <path d="M23 169 h14 M23 175 h14 M23 181 h9" stroke="#8A7F7B" strokeWidth="2" />
      </g>
      <g className={mood === "listening" ? "homie-mic homie-mic-tilt" : "homie-mic"}>
        <path d="M148 140 Q166 134 168 112" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
        <path d="M168 116 Q178 150 160 176 Q150 192 166 206" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        <rect x="163" y="96" width="10" height="22" rx="4" fill={INK} transform="rotate(10 168 107)" />
        <rect x="158" y="62" width="26" height="36" rx="13" fill="#C9CDD3" stroke={INK} strokeWidth="3.5" />
        <path d="M159 74 h24 M159 80 h24 M159 86 h24" stroke={GRANATE} strokeWidth="2.5" />
      </g>
    </>
  );
}

/** after-swipe.html phone 1: both arms up, open mouth, raised brows. */
function ArmsUpPose({ mood }: { mood: "wink" | "celebrate" }) {
  return (
    <>
      <path d="M68 108 Q76 102 86 106" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M114 108 Q122 102 132 106" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <OpenEye cx={78} cy={124} blink={mood === "celebrate"} />
      {mood === "wink" ? (
        <path d="M113 126 Q122 117 131 126" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
      ) : (
        <OpenEye cx={122} cy={124} blink />
      )}
      <circle cx="66" cy="140" r="7" fill={GRANATE} opacity=".3" />
      <circle cx="134" cy="140" r="7" fill={GRANATE} opacity=".3" />
      <path d="M84 140 Q92 134 100 140 Q108 134 116 140 Q108 148 100 143 Q92 148 84 140 Z" fill={INK} />
      <path d="M88 150 Q100 166 112 150 Z" fill={GRANATE} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <Bowtie cy={174} />
      <g className="homie-wave">
        <path d="M52 132 Q34 118 32 96" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
        <circle cx="32" cy="92" r="7" fill={WALL} stroke={INK} strokeWidth="3" />
      </g>
      <g className={mood === "celebrate" ? "homie-wave-right" : undefined}>
        <path d="M148 132 Q166 118 168 96" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
        <circle cx="168" cy="92" r="7" fill={WALL} stroke={INK} strokeWidth="3" />
      </g>
    </>
  );
}

/** Day done: same face, eyes shut, arms resting, a "z" floating from the chimney. */
function SleepPose() {
  return (
    <>
      <path d="M68 112 Q76 108 86 110" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M114 110 Q124 108 132 112" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M71 126 Q78 132 85 126" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M115 126 Q122 132 129 126" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <circle cx="66" cy="140" r="6" fill={GRANATE} opacity=".22" />
      <circle cx="134" cy="140" r="6" fill={GRANATE} opacity=".22" />
      <path d="M84 142 Q92 136 100 142 Q108 136 116 142 Q108 150 100 145 Q92 150 84 142 Z" fill={INK} />
      <path d="M95 153 Q100 156 105 153" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <Bowtie cy={166} />
      <path d="M52 140 Q40 152 40 170" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M148 140 Q160 152 160 170" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <text className="homie-zzz" x="146" y="36" fill={GRANATE} fontFamily="Georgia, serif" fontWeight="600" fontSize="20">
        z
      </text>
      <text className="homie-zzz" style={{ animationDelay: "1.2s" }} x="156" y="22" fill={GRANATE} fontFamily="Georgia, serif" fontWeight="600" fontSize="14">
        z
      </text>
    </>
  );
}

function DiscBackdrop() {
  return (
    <g transform="translate(-15 -4)">
      <circle cx="115" cy="128" r="104" fill={CREAM} />
      <path className="homie-spark" d="M30 60 l5 12 12 5 -12 5 -5 12 -5 -12 -12 -5 12 -5z" fill={OCHRE_300} />
      <path className="homie-spark" style={{ animationDelay: ".5s" }} d="M196 40 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4z" fill={OCHRE_300} />
      <path className="homie-spark" style={{ animationDelay: ".9s" }} d="M206 150 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill={OCHRE_100} />
      <path className="homie-spark" style={{ animationDelay: ".3s" }} d="M20 170 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill={OCHRE_100} />
    </g>
  );
}

export function Homie({ mood, size, disc = false, className }: HomieProps) {
  const width = size ?? (disc ? 230 : 132);
  const height = disc ? (width * 250) / 230 : (width * 240) / 200;
  const viewBox = disc ? "-15 -4 230 250" : "0 0 200 240";
  const bobClass =
    mood === "wink" || mood === "celebrate" ? "homie-bob-fast" : mood === "sleep" ? "homie-bob-slow" : "homie-bob";

  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      aria-hidden="true"
      className={className}
      style={{ flex: "none", overflow: "visible" }}
    >
      {disc && <DiscBackdrop />}
      <g className={bobClass}>
        <Body onDisc={disc} />
        {(mood === "idle" || mood === "listening" || mood === "speaking") && <ReporterPose mood={mood} />}
        {(mood === "wink" || mood === "celebrate") && <ArmsUpPose mood={mood} />}
        {mood === "sleep" && <SleepPose />}
      </g>
    </svg>
  );
}
