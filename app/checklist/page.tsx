"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  RotateCcw,
  ChevronRight,
  Circle,
  ArrowUpRight,
  Save,
} from "lucide-react";
import {
  saveChecklistSnapshot,
  type TimeframeSnapshot,
} from "@/lib/checklistSnapshots";

type ChecklistItem = {
  name: string;
  weight: number;
  done: boolean;
};

type EntryGroup = {
  title: string;
  items: ChecklistItem[];
};

type TimeframeData = {
  label: string;
  short: string;
  items: ChecklistItem[];
  entryGroups?: EntryGroup[];
};

type Data = Record<string, TimeframeData>;

const INITIAL_DATA: Data = {
  WEEKLY: {
    label: "WEEKLY",
    short: "W",
    items: [
      { name: "Trend", weight: 10, done: false },
      { name: "At AOI / Rejected", weight: 10, done: false },
      { name: "Touching EMA", weight: 5, done: false },
      { name: "Round Psychological Level", weight: 5, done: false },
      { name: "Rejection from Previous Structure", weight: 10, done: false },
      { name: "Candlestick Rejection from AOI", weight: 10, done: false },
      {
        name: "Break & Retest / Head & Shoulders Pattern",
        weight: 10,
        done: false,
      },
    ],
  },

  DAILY: {
    label: "DAILY",
    short: "D",
    items: [
      { name: "Trend", weight: 10, done: false },
      { name: "At AOI / Rejected", weight: 10, done: false },
      { name: "Touching EMA", weight: 5, done: false },
      { name: "EMA Rejection", weight: 5, done: false },
      { name: "Round Psychological Level", weight: 5, done: false },
      { name: "Rejection from Previous Structure", weight: 10, done: false },
      { name: "Candlestick Rejection from AOI", weight: 10, done: false },
      {
        name: "Break & Retest / Head & Shoulders Pattern",
        weight: 10,
        done: false,
      },
    ],
  },

  "4H": {
    label: "4H",
    short: "4H",
    items: [
      { name: "Trend", weight: 5, done: false },
      { name: "At AOI / Rejected", weight: 5, done: false },
      { name: "Touching EMA", weight: 5, done: false },
      { name: "EMA Rejection", weight: 5, done: false },
      { name: "Round Psychological Level", weight: 5, done: false },
      { name: "Rejection from Previous Structure", weight: 10, done: false },
      { name: "Candlestick Rejection from AOI", weight: 5, done: false },
      {
        name: "Break & Retest / Head & Shoulders Pattern",
        weight: 10,
        done: false,
      },
    ],
  },

  "LOWER TF": {
    label: "LOWER TF",
    short: "LTF",
    items: [
      { name: "Trend", weight: 5, done: false },
      { name: "Touching EMA", weight: 5, done: false },
      {
        name: "Break & Retest / Head & Shoulders Pattern",
        weight: 5,
        done: false,
      },
    ],
  },

  ENTRY: {
    label: "ENTRY",
    short: "E",
    items: [],
    entryGroups: [
      {
        title: "ENTRY SIGNAL",
        items: [
          { name: "SOS", weight: 10, done: false },
          {
            name: "Engulfing Candlestick (30M, 1H, 2H, 4H)",
            weight: 10,
            done: false,
          },
        ],
      },
      {
        title: "STOP LOSS & TAKE PROFIT",
        items: [
          { name: "Stop Loss", weight: 0, done: false },
          { name: "Take Profit", weight: 0, done: false },
        ],
      },
    ],
  },
};

const TIMEFRAMES = ["WEEKLY", "DAILY", "4H", "LOWER TF", "ENTRY"];

function calculateScore(data: TimeframeData) {
  const items =
    data.entryGroups?.flatMap((group) => group.items) ?? data.items;

  const scoredItems = items.filter((item) => item.weight > 0);

  const available = scoredItems.reduce(
    (sum, item) => sum + item.weight,
    0
  );

  const earned = scoredItems
    .filter((item) => item.done)
    .reduce((sum, item) => sum + item.weight, 0);

  if (available === 0) return 0;

  return Math.round((earned / available) * 100);
}

/* =============================================================== */
/* CHECKLIST CLICK SOUND                                           */
/*                                                                  */
/* Module-level singleton AudioContext — lives outside React's     */
/* component lifecycle entirely, so it survives ChecklistRow        */
/* remounts (e.g. the `key={activeTf}` remount on timeframe switch) */
/* and is never recreated per click. Built with the Web Audio API   */
/* only: two short sine-tone oscillators (a rising primary "chirp"  */
/* plus a quieter higher harmonic layer) with fast exponential      */
/* attack/decay envelopes for a short, subtle, futuristic-HUD       */
/* confirmation tick (~130ms). Wrapped in try/catch throughout so   */
/* any AudioContext failure or missing browser support silently     */
/* no-ops rather than breaking the checklist.                       */
/* =============================================================== */

let sharedAudioContext: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    if (!sharedAudioContext) {
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioContextCtor) return null;

      sharedAudioContext = new AudioContextCtor();
    }

    return sharedAudioContext;
  } catch {
    return null;
  }
}

function playChecklistSound() {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    // Autoplay policies can leave the context suspended until a
    // user gesture — this call happens synchronously inside the
    // click handler, so it's a valid gesture to resume from.
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const duration = 0.13;

    // Primary tone: quick rising "chirp"
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(2200, now + 0.06);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);

    // Subtle higher harmonic layer for a more "technical" texture
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(2800, now);
    osc2.frequency.exponentialRampToValueAtTime(3600, now + 0.05);

    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.7);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + duration + 0.02);
  } catch {
    // Never let audio failure affect checklist functionality.
  }
}

/* =============================================================== */
/* ANIMATED NUMBER                                                 */
/* =============================================================== */

function useAnimatedNumber(target: number, duration = 600) {
  const [display, setDisplay] = useState(target);

  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setDisplay(target);
      fromRef.current = target;
      return;
    }

    const from = fromRef.current;

    if (from === target) return;

    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);

      const eased =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const next = Math.round(from + (target - from) * eased);

      setDisplay(next);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
        rafRef.current = null;
      }
    };

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, duration]);

  return display;
}

function AnimatedPercent({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const display = useAnimatedNumber(value);

  return <span className={className}>{display}%</span>;
}

/* =============================================================== */
/* PROGRESS RING                                                    */
/* =============================================================== */

function ProgressRing({
  value,
  active,
  sweepKey,
}: {
  value: number;
  active: boolean;
  sweepKey: number;
}) {
  const display = useAnimatedNumber(value);

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (display / 100) * circumference;

  const [sweepId, setSweepId] = useState<number | null>(null);

  useEffect(() => {
    if (sweepKey > 0) {
      setSweepId(sweepKey);
    }
  }, [sweepKey]);

  return (
    <div className="relative h-[76px] w-[76px]">
      {sweepId !== null && (
        <span
          key={`impact-${sweepId}`}
          className="tw-ring-impact pointer-events-none absolute inset-0 rounded-full"
          aria-hidden="true"
        />
      )}

      <svg
        className="h-full w-full -rotate-90 overflow-visible"
        viewBox="0 0 80 80"
      >
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="#182432"
          strokeWidth="4"
        />

        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={active ? "#28D7F5" : "#1688B0"}
          strokeWidth="4"
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
          style={{
            filter: active
              ? "drop-shadow(0 0 6px rgba(40,215,245,0.55))"
              : undefined,
          }}
        />

        {active && value > 0 && (
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="#B9F7FF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="13 201"
            className="tw-ring-scanner"
            style={{
              filter: "drop-shadow(0 0 4px rgba(185,247,255,0.8))",
            }}
          />
        )}

        {sweepId !== null && (
          <circle
            key={`sweep-${sweepId}`}
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="26 188"
            className="tw-ring-sweep"
            onAnimationEnd={() => setSweepId(null)}
          />
        )}
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`text-[15px] font-black transition-all duration-300 ${
            active
              ? "text-white [text-shadow:0_0_10px_rgba(40,215,245,0.55)]"
              : "text-slate-300"
          }`}
        >
          {display}%
        </span>
      </div>
    </div>
  );
}

/* =============================================================== */
/* BOTTOM NODE MARKER                                               */
/* =============================================================== */

function BottomNodeMarker({
  active,
  pulseKey,
}: {
  active: boolean;
  pulseKey: number;
}) {
  return (
    <div className="relative mt-2 flex h-[8px] items-center justify-center">
      {pulseKey > 0 && (
        <span
          key={`marker-pulse-${pulseKey}`}
          className="tw-marker-pulse pointer-events-none absolute h-[7px] w-[7px] rounded-full"
        />
      )}

      <span
        className={`relative h-[5px] w-[5px] rounded-full transition-all duration-300 ${
          active
            ? "bg-[#28D7F5] shadow-[0_0_9px_rgba(40,215,245,0.9)]"
            : "bg-[#526171]"
        }`}
      />
    </div>
  );
}

/* =============================================================== */
/* CHECKLIST ROW                                                    */
/* =============================================================== */

function ChecklistRow({
  item,
  onToggle,
  reactionKey,
}: {
  item: ChecklistItem;
  onToggle: () => void;
  reactionKey: number;
}) {
  const [flashKey, setFlashKey] = useState(0);

  const handleClick = () => {
    playChecklistSound();
    setFlashKey((k) => k + 1);
    onToggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="tw-press group relative flex h-[39px] w-full items-center overflow-hidden border-b border-[#14202D] text-left transition-colors duration-150 hover:bg-[#0C1722]"
    >
      {flashKey > 0 && (
        <span
          key={`row-${flashKey}`}
          className="tw-row-energy pointer-events-none absolute inset-y-0 left-0 w-[35%]"
          aria-hidden="true"
        />
      )}

      {flashKey > 0 && (
        <span
          key={`flash-${flashKey}`}
          className="tw-row-flash pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
      )}

      <span
        className={`relative z-10 mr-3 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
          item.done
            ? "border-[#19D5A2] bg-[#19D5A2]/10 text-[#19D5A2] shadow-[0_0_9px_rgba(25,213,162,0.45)]"
            : "border-[#304154] text-transparent group-hover:border-[#4D6378]"
        }`}
      >
        {item.done ? (
          <span
            key={`check-${flashKey}`}
            className="tw-check-pop flex items-center justify-center"
          >
            <Check size={10} strokeWidth={3} />
          </span>
        ) : null}
      </span>

      <span
        className={`relative z-10 min-w-0 flex-1 truncate text-[12px] transition-all duration-200 ${
          item.done
            ? "font-bold text-white"
            : "font-semibold text-[#87A1B9]"
        }`}
      >
        {item.name}
      </span>

      <span
        className={`relative z-10 ml-3 text-[10px] font-bold transition-colors duration-200 ${
          item.done ? "text-[#19D5A2]" : "text-[#526B82]"
        }`}
      >
        {item.done ? "+" : ""}
        {item.weight}%
      </span>
    </button>
  );
}

/* =============================================================== */
/* PAGE                                                             */
/* =============================================================== */

export default function ChecklistPage() {
  const [data, setData] = useState<Data>(INITIAL_DATA);

  const [activeTf, setActiveTf] = useState("WEEKLY");

  const [resetting, setResetting] = useState(false);

  const [savedToJournalKey, setSavedToJournalKey] = useState(0);

  const [instrument, setInstrument] = useState("");
  const [instrumentWarningKey, setInstrumentWarningKey] = useState(0);
  const instrumentValid = instrument.trim().length > 0;

  const [hasInteracted, setHasInteracted] = useState(false);

  const [energyKey, setEnergyKey] = useState(0);

  const [transitionFrom, setTransitionFrom] = useState(0);
  const [transitionTo, setTransitionTo] = useState(0);

  const [panelDir, setPanelDir] = useState(1);

  const [ringSweepKeys, setRingSweepKeys] = useState<
    Record<string, number>
  >({});

  const [reactionKey, setReactionKey] = useState(0);

  const scores = useMemo(() => {
    return TIMEFRAMES.map((tf) => ({
      tf,
      score: calculateScore(data[tf]),
    }));
  }, [data]);

  const overallScore = useMemo(() => {
    const total = scores.reduce((sum, item) => sum + item.score, 0);

    return Math.round(total / scores.length);
  }, [scores]);

  const setupValid = scores.every((item) => item.score >= 70);

  const activeData = data[activeTf];

  const activeScore = calculateScore(activeData);

  const activeItems =
    activeData.entryGroups?.flatMap((group) => group.items) ??
    activeData.items;

  /* ============================================================= */
  /* TIMEFRAME NAVIGATION                                           */
  /* ============================================================= */

  const handleTimeframeChange = (tf: string) => {
    setHasInteracted(true);

    if (tf === activeTf) {
      setRingSweepKeys((previous) => ({
        ...previous,
        [tf]: (previous[tf] ?? 0) + 1,
      }));

      return;
    }

    const fromIndex = TIMEFRAMES.indexOf(activeTf);
    const toIndex = TIMEFRAMES.indexOf(tf);

    setTransitionFrom(fromIndex);
    setTransitionTo(toIndex);

    setPanelDir(toIndex >= fromIndex ? 1 : -1);

    setEnergyKey((key) => key + 1);

    window.setTimeout(() => {
      setActiveTf(tf);

      setRingSweepKeys((previous) => ({
        ...previous,
        [tf]: (previous[tf] ?? 0) + 1,
      }));
    }, 430);
  };

  /* ============================================================= */
  /* CHECKBOX                                                       */
  /* ============================================================= */

  const toggleItem = (
    timeframe: string,
    itemIndex: number,
    groupIndex?: number
  ) => {
    setHasInteracted(true);

    setData((previous) => {
      const copy: Data = structuredClone(previous);

      const current = copy[timeframe];

      if (groupIndex !== undefined && current.entryGroups) {
        current.entryGroups[groupIndex].items[itemIndex].done =
          !current.entryGroups[groupIndex].items[itemIndex].done;
      } else {
        current.items[itemIndex].done =
          !current.items[itemIndex].done;
      }

      return copy;
    });

    setReactionKey((key) => key + 1);

    setRingSweepKeys((previous) => ({
      ...previous,
      [activeTf]: (previous[activeTf] ?? 0) + 1,
    }));
  };

  /* ============================================================= */
  /* RESET                                                          */
  /* ============================================================= */

  const resetAll = () => {
    setResetting(true);

    setData(structuredClone(INITIAL_DATA));

    setHasInteracted(false);

    setReactionKey((key) => key + 1);

    window.setTimeout(() => {
      setResetting(false);
    }, 550);
  };

  /* ============================================================= */
  /* SAVE TO JOURNAL                                                */
  /*                                                                 */
  /* Captures the CURRENT live checklist state — whatever is        */
  /* actually checked/unchecked right now — into a frozen snapshot.  */
  /* This is a plain data copy (via the snapshot store's JSON        */
  /* round-trip), so nothing here can be mutated later by further   */
  /* changes in the Direction Engine. Nothing is manufactured: an    */
  /* unchecked item is saved as done: false, exactly as it appears.  */
  /* ============================================================= */

  const saveToJournal = () => {
    if (!instrumentValid) {
      setInstrumentWarningKey((key) => key + 1);
      return;
    }

    const timeframes: TimeframeSnapshot[] = TIMEFRAMES.map((tf) => {
      const tfData = data[tf];

      const items =
        tfData.entryGroups?.flatMap((group) => group.items) ?? tfData.items;

      return {
        label: tfData.label,
        short: tfData.short,
        score: calculateScore(tfData),
        items: items.map((item) => ({
          name: item.name,
          weight: item.weight,
          done: item.done,
        })),
      };
    });

    saveChecklistSnapshot({
      pair: instrument.trim(),
      timeframes,
      overallScore,
      setupValid,
    });

    setSavedToJournalKey((key) => key + 1);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#05090E] text-white">
      <style jsx global>{`
        /* ========================================================= */
        /* SYSTEM MOTION                                             */
        /* ========================================================= */

        @keyframes tw-ring-scanner {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        .tw-ring-scanner {
          animation: tw-ring-scanner 2.4s linear infinite;
          transform-box: fill-box;
          transform-origin: center;
          opacity: 0.85;
        }

        /* ========================================================= */
        /* ONE-SHOT RING SWEEP                                       */
        /* ========================================================= */

        @keyframes tw-ring-sweep {
          0% {
            stroke-dashoffset: 0;
            opacity: 0;
            transform: rotate(-90deg);
          }

          8% {
            opacity: 1;
          }

          55% {
            opacity: 1;
          }

          100% {
            stroke-dashoffset: -214;
            opacity: 0;
            transform: rotate(270deg);
          }
        }

        .tw-ring-sweep {
          animation: tw-ring-sweep 620ms
            cubic-bezier(0.22, 1, 0.36, 1);
          transform-box: fill-box;
          transform-origin: center;
        }

        /* ========================================================= */
        /* RING IMPACT                                               */
        /* ========================================================= */

        @keyframes tw-ring-impact {
          0% {
            transform: scale(0.72);
            opacity: 0;
            box-shadow: 0 0 0 0 rgba(40, 215, 245, 0.55);
          }

          30% {
            transform: scale(1);
            opacity: 1;
            box-shadow: 0 0 0 5px rgba(40, 215, 245, 0.22);
          }

          100% {
            transform: scale(1.18);
            opacity: 0;
            box-shadow: 0 0 0 16px rgba(40, 215, 245, 0);
          }
        }

        .tw-ring-impact {
          animation: tw-ring-impact 650ms
            cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* ========================================================= */
        /* BOTTOM NODE PULSE                                         */
        /* ========================================================= */

        @keyframes tw-marker-pulse {
          0% {
            transform: scale(0.6);
            opacity: 0;
            box-shadow: 0 0 0 0 rgba(40, 215, 245, 0.8);
          }

          35% {
            transform: scale(1.25);
            opacity: 1;
            box-shadow: 0 0 0 5px rgba(40, 215, 245, 0.22);
          }

          100% {
            transform: scale(2.2);
            opacity: 0;
            box-shadow: 0 0 0 9px rgba(40, 215, 245, 0);
          }
        }

        .tw-marker-pulse {
          animation: tw-marker-pulse 600ms ease-out;
        }

        /* ========================================================= */
        /* CHECK POP                                                 */
        /* ========================================================= */

        @keyframes tw-check-pop {
          0% {
            transform: scale(0.45) rotate(-18deg);
            opacity: 0;
          }

          55% {
            transform: scale(1.18) rotate(3deg);
            opacity: 1;
          }

          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        .tw-check-pop {
          animation: tw-check-pop 260ms
            cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* ========================================================= */
        /* ROW FLASH                                                 */
        /* ========================================================= */

        @keyframes tw-row-flash {
          0% {
            background-color: rgba(40, 215, 245, 0.13);
          }

          45% {
            background-color: rgba(40, 215, 245, 0.055);
          }

          100% {
            background-color: rgba(40, 215, 245, 0);
          }
        }

        .tw-row-flash {
          animation: tw-row-flash 500ms ease-out;
        }

        /* ========================================================= */
        /* ROW ENERGY                                                */
        /* ========================================================= */

        @keyframes tw-row-energy {
          0% {
            transform: translateX(-130%);
            opacity: 0;
          }

          15% {
            opacity: 0.9;
          }

          70% {
            opacity: 0.55;
          }

          100% {
            transform: translateX(420%);
            opacity: 0;
          }
        }

        .tw-row-energy {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(40, 215, 245, 0.65),
            rgba(185, 247, 255, 0.85),
            transparent
          );

          filter: blur(1px);

          animation: tw-row-energy 650ms
            cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* ========================================================= */
        /* CONTINUOUS BAR FLOW                                       */
        /* ========================================================= */

        @keyframes tw-flow {
          0% {
            transform: translateX(-130%);
          }

          100% {
            transform: translateX(430%);
          }
        }

        .tw-flow {
          animation: tw-flow 2.4s linear infinite;
          will-change: transform;
        }

        /* ========================================================= */
        /* SCORE BAR ENERGY                                          */
        /* ========================================================= */

        @keyframes tw-score-energy {
          0% {
            transform: translateX(-120%);
            opacity: 0;
          }

          12% {
            opacity: 1;
          }

          65% {
            opacity: 0.8;
          }

          100% {
            transform: translateX(350%);
            opacity: 0;
          }
        }

        .tw-score-energy {
          animation: tw-score-energy 900ms
            cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* ========================================================= */
        /* PIPELINE ENERGY PROJECTILE                                */
        /* ========================================================= */

        @keyframes tw-energy-flight {
          0% {
            left: var(--energy-from);
            opacity: 0;
            transform: translateX(-50%) scale(0.65);
          }

          8% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }

          78% {
            opacity: 1;
          }

          100% {
            left: var(--energy-to);
            opacity: 0;
            transform: translateX(-50%) scale(1.18);
          }
        }

        .tw-energy-projectile {
          animation: tw-energy-flight 430ms
            cubic-bezier(0.55, 0, 0.25, 1) forwards;
        }

        /* ========================================================= */
        /* PROJECTILE CORE                                           */
        /* ========================================================= */

        @keyframes tw-projectile-core {
          0% {
            box-shadow:
              0 0 4px 1px rgba(40, 215, 245, 0.75),
              0 0 10px 3px rgba(40, 215, 245, 0.45);
          }

          50% {
            box-shadow:
              0 0 7px 2px rgba(185, 247, 255, 1),
              0 0 18px 6px rgba(40, 215, 245, 0.62);
          }

          100% {
            box-shadow:
              0 0 5px 1px rgba(40, 215, 245, 0.75),
              0 0 12px 4px rgba(40, 215, 245, 0.45);
          }
        }

        .tw-projectile-core {
          animation: tw-projectile-core 300ms ease-in-out infinite;
        }

        /* ========================================================= */
        /* PROJECTILE TRAIL                                          */
        /* ========================================================= */

        @keyframes tw-projectile-trail {
          0% {
            width: 0;
            opacity: 0;
          }

          10% {
            width: 25px;
            opacity: 0.9;
          }

          100% {
            width: 110px;
            opacity: 0;
          }
        }

        .tw-projectile-trail {
          animation: tw-projectile-trail 430ms ease-out
            forwards;
          transform-origin: right center;
        }

        .tw-projectile-trail[data-dir="-1"] {
          transform-origin: left center;
        }

        /* ========================================================= */
        /* PANEL SCAN                                                */
        /* ========================================================= */

        @keyframes tw-panel-scan {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }

          15% {
            opacity: 0.55;
          }

          70% {
            opacity: 0.2;
          }

          100% {
            transform: translateY(900%);
            opacity: 0;
          }
        }

        .tw-panel-scan {
          animation: tw-panel-scan 650ms ease-out;
        }

        /* ========================================================= */
        /* PANEL ENTRANCE                                            */
        /* ========================================================= */

        @keyframes tw-panel-in-fwd {
          0% {
            opacity: 0.5;
            transform: translateX(6px);
          }

          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes tw-panel-in-back {
          0% {
            opacity: 0.5;
            transform: translateX(-6px);
          }

          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .tw-panel-in-fwd {
          animation: tw-panel-in-fwd 300ms ease-out;
        }

        .tw-panel-in-back {
          animation: tw-panel-in-back 300ms ease-out;
        }

        /* ========================================================= */
        /* RESET                                                      */
        /* ========================================================= */

        @keyframes tw-reset-flash {
          0% {
            box-shadow: 0 0 0 0 rgba(40, 215, 245, 0);
          }

          40% {
            box-shadow: 0 0 18px 3px rgba(40, 215, 245, 0.5);
          }

          100% {
            box-shadow: 0 0 0 0 rgba(40, 215, 245, 0);
          }
        }

        .tw-reset-flash {
          animation: tw-reset-flash 550ms ease-out;
        }

        /* ========================================================= */
        /* SAVE TO JOURNAL CONFIRMATION TEXT                         */
        /* ========================================================= */

        @keyframes tw-fade-out-hold {
          0% {
            opacity: 0;
            transform: translateY(2px);
          }

          15% {
            opacity: 1;
            transform: translateY(0);
          }

          75% {
            opacity: 1;
          }

          100% {
            opacity: 0;
          }
        }

        .tw-reset-flash-text {
          animation: tw-fade-out-hold 2200ms ease-out forwards;
        }

        /* ========================================================= */
        /* INSTRUMENT VALIDATION WARNING                              */
        /* ========================================================= */

        @keyframes tw-instrument-warning {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 89, 104, 0.5);
          }

          25% {
            box-shadow: 0 0 0 3px rgba(255, 89, 104, 0.35);
          }

          60% {
            box-shadow: 0 0 0 0 rgba(255, 89, 104, 0);
          }

          100% {
            box-shadow: 0 0 0 0 rgba(255, 89, 104, 0);
          }
        }

        .tw-instrument-warning {
          animation: tw-instrument-warning 900ms ease-out;
        }

        /* ========================================================= */
        /* CHECKPOINT ACTIVATION                                     */
        /* ========================================================= */

        @keyframes tw-checkpoint {
          0% {
            opacity: 0.6;
            transform: scale(0.96);
          }

          45% {
            opacity: 1;
            transform: scale(1.03);
          }

          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .tw-checkpoint-active {
          animation: tw-checkpoint 500ms
            cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* ========================================================= */
        /* BUTTON                                                     */
        /* ========================================================= */

        .tw-press {
          transition:
            transform 150ms ease-out,
            filter 150ms ease-out,
            border-color 150ms ease-out;
        }

        .tw-press:hover {
          filter: brightness(1.08);
        }

        .tw-press:active {
          transform: scale(0.985);
        }

        /* ========================================================= */
        /* REDUCED MOTION                                             */
        /* ========================================================= */

        @media (prefers-reduced-motion: reduce) {
          .tw-ring-scanner,
          .tw-flow,
          .tw-projectile-core {
            animation: none !important;
          }

          .tw-ring-sweep,
          .tw-ring-impact,
          .tw-marker-pulse,
          .tw-row-energy,
          .tw-row-flash,
          .tw-score-energy,
          .tw-energy-projectile,
          .tw-projectile-trail,
          .tw-panel-scan,
          .tw-panel-in-fwd,
          .tw-panel-in-back,
          .tw-reset-flash,
          .tw-reset-flash-text,
          .tw-instrument-warning,
          .tw-checkpoint-active,
          .tw-check-pop {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>

      {/* =========================================================
          TOP STATUS BAR
      ========================================================= */}

      <header className="flex h-[62px] shrink-0 items-center justify-between border-b border-[#172532] bg-[#080F17] px-7">
        <div className="flex items-center gap-3">
          <div className="flex h-[36px] w-[36px] items-center justify-center rounded-lg border border-[#0D6F95] bg-[#071B27] shadow-[0_0_10px_rgba(13,111,149,0.25)]">
            <ArrowUpRight
              size={19}
              strokeWidth={2}
              className="text-[#28D7F5]"
            />
          </div>

          <div>
            <div className="text-[13px] font-black tracking-[0.12em] text-white [text-shadow:0_0_14px_rgba(40,215,245,0.18)]">
              TRADEWING
            </div>

            <div className="mt-[1px] text-[8px] font-semibold tracking-[0.22em] text-[#4E718D]">
              DIRECTION ENGINE
            </div>
          </div>
        </div>

        <div className="flex h-full items-center">
          <div className="relative flex h-full items-center border-l border-[#172532] px-5">
            <span className="mr-2 text-[8px] font-medium tracking-[0.14em] text-[#4D657A]">
              INSTRUMENT
            </span>

            <input
              value={instrument}
              onChange={(e) => setInstrument(e.target.value.toUpperCase())}
              placeholder="—"
              spellCheck={false}
              autoComplete="off"
              className="w-[92px] bg-transparent text-[11px] font-black uppercase text-[#28D7F5] outline-none placeholder:text-[#3A5068]"
            />

            {instrumentWarningKey > 0 && !instrumentValid && (
              <span
                key={instrumentWarningKey}
                className="tw-instrument-warning pointer-events-none absolute inset-0 rounded"
                aria-hidden="true"
              />
            )}
          </div>

          <div className="flex h-full items-center border-l border-[#172532] px-5">
            <span className="mr-2 text-[8px] font-medium tracking-[0.14em] text-[#4D657A]">
              MODE
            </span>

            <span className="text-[11px] font-black text-white">
              SWING
            </span>
          </div>

          <div className="flex h-full items-center border-l border-[#172532] px-5">
            <span className="mr-2 text-[8px] font-medium tracking-[0.14em] text-[#4D657A]">
              BIAS
            </span>

            <span className="text-[11px] font-black text-[#19D5A2]">
              BULLISH
            </span>
          </div>

          <div className="flex h-full items-center border-l border-[#172532] px-5">
            <span className="mr-2 text-[8px] font-medium tracking-[0.14em] text-[#4D657A]">
              OVERALL SCORE
            </span>

            <AnimatedPercent
              value={overallScore}
              className="text-[11px] font-black text-white"
            />
          </div>

          <div className="flex h-full items-center border-x border-[#172532] px-5">
            <span className="mr-2 h-[7px] w-[7px] rounded-full bg-[#19D5A2] shadow-[0_0_9px_rgba(25,213,162,0.8)]" />

            <span className="text-[9px] font-bold tracking-[0.08em] text-[#8DA5B9]">
              MARKET OPEN
            </span>
          </div>
        </div>
      </header>

      {/* =========================================================
          PIPELINE
      ========================================================= */}

      <section className="relative h-[202px] shrink-0 overflow-hidden bg-[#050A10] px-8 pt-5">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(34,83,112,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(34,83,112,0.12)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="text-[9px] font-semibold tracking-[0.2em] text-[#4F6C82]">
            DIRECTIONAL PIPELINE — WEEKLY → ENTRY
          </div>

          <div className="flex items-center gap-2 text-[9px] font-bold tracking-[0.12em] text-[#19D5A2]">
            <span>→</span>
            <span>TRAVELING BULLISH</span>
          </div>
        </div>

        <div className="relative mx-auto mt-4 h-[132px] max-w-[1220px]">
          <div className="absolute left-[5%] right-[5%] top-[45px] h-px bg-gradient-to-r from-[#27D9F5] via-[#1C718C] to-[#1A3141]" />

          {energyKey > 0 && (
            <div
              key={energyKey}
              className="tw-energy-projectile pointer-events-none absolute top-[41px] z-30 h-[9px] w-[9px] rounded-full bg-[#B9F7FF]"
              style={
                {
                  "--energy-from": `${5 + transitionFrom * 22.5}%`,
                  "--energy-to": `${5 + transitionTo * 22.5}%`,
                  boxShadow:
                    "0 0 7px 2px rgba(185,247,255,0.95), 0 0 18px 6px rgba(40,215,245,0.55)",
                } as React.CSSProperties
              }
            >
              <span className="tw-projectile-core absolute inset-0 rounded-full bg-[#DFFFFF]" />

              <span
                data-dir={
                  transitionTo >= transitionFrom ? "1" : "-1"
                }
                className={`tw-projectile-trail absolute top-1/2 h-[2px] -translate-y-1/2 rounded-full ${
                  transitionTo >= transitionFrom
                    ? "right-[3px] bg-gradient-to-l from-[#B9F7FF] via-[#28D7F5] to-transparent"
                    : "left-[3px] bg-gradient-to-r from-[#B9F7FF] via-[#28D7F5] to-transparent"
                }`}
                aria-hidden="true"
              />
            </div>
          )}

          <div className="relative flex h-full items-start justify-between">
            {TIMEFRAMES.map((tf) => {
              const score =
                scores.find((item) => item.tf === tf)?.score ?? 0;

              const active =
                hasInteracted && activeTf === tf;

              const ringKey = ringSweepKeys[tf] ?? 0;

              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => handleTimeframeChange(tf)}
                  className="tw-press group flex w-[120px] flex-col items-center"
                >
                  <div
                    className={`rounded-full transition-all duration-300 ${
                      active
                        ? "shadow-[0_0_25px_rgba(40,215,245,0.10)]"
                        : ""
                    }`}
                  >
                    <ProgressRing
                      value={score}
                      active={active}
                      sweepKey={ringKey}
                    />
                  </div>

                  <div
                    className={`mt-2 text-[9px] font-black tracking-[0.13em] transition-colors duration-300 ${
                      active
                        ? "text-[#28D7F5] [text-shadow:0_0_10px_rgba(40,215,245,0.4)]"
                        : "text-[#61788C]"
                    }`}
                  >
                    {tf}
                  </div>

                  <BottomNodeMarker
                    active={active}
                    pulseKey={ringKey}
                  />

                  {tf === "LOWER TF" && (
                    <span className="mt-1 text-[8px] font-medium text-[#53697B]">
                      2H · 1H · 30M
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          MAIN CONTENT
      ========================================================= */}

      <section className="flex min-h-0 flex-1 gap-5 overflow-hidden px-8 pb-5">
        {/* =======================================================
            ANALYSIS CARD
        ======================================================= */}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#1A2A39] bg-[linear-gradient(145deg,#101923,#090F16)] shadow-[0_15px_45px_rgba(0,0,0,0.22)]">
          <div className="flex h-[62px] shrink-0 items-center justify-between border-b border-[#1A2937] px-5">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] font-black tracking-tight text-white">
                  {activeData.label} ANALYSIS
                </h1>

                <span className="flex h-[25px] min-w-[25px] items-center justify-center rounded border border-[#17637D] bg-[#08202D] px-1.5 text-[9px] font-black text-[#28D7F5]">
                  {activeData.short}
                </span>
              </div>

              <div className="mt-1 text-[8px] font-semibold tracking-[0.18em] text-[#4F687D]">
                ACTIVE ANALYSIS
              </div>
            </div>

            <div className="flex items-center gap-3">
              {savedToJournalKey > 0 && (
                <span
                  key={savedToJournalKey}
                  className="tw-reset-flash-text text-[8px] font-bold uppercase tracking-[0.12em] text-[#19D5A2]"
                >
                  Saved to Journal
                </span>
              )}

              <button
                type="button"
                onClick={saveToJournal}
                className="tw-press flex h-[28px] items-center gap-1.5 rounded border border-[#2A3A49] px-3 text-[8px] font-bold uppercase tracking-[0.15em] text-[#587087] transition-colors hover:border-[#1E5C48] hover:text-[#19D5A2]"
              >
                <Save size={10} />
                Save to Journal
              </button>

              <button
                type="button"
                onClick={resetAll}
                className="tw-press group flex items-center gap-2 text-[8px] font-bold tracking-[0.15em] text-[#587087] transition-colors hover:text-white"
              >
                <span>RESET</span>

                <span
                  className={`flex h-[28px] items-center rounded border border-[#2A3A49] px-3 text-[8px] text-[#8EA2B3] transition-all duration-150 group-hover:border-[#426074] ${
                    resetting ? "tw-reset-flash" : ""
                  }`}
                >
                  <RotateCcw
                    size={10}
                    className={`mr-1.5 transition-transform duration-500 ${
                      resetting ? "-rotate-180" : ""
                    }`}
                  />

                  RESET
                </span>
              </button>
            </div>
          </div>

          {/* =====================================================
              CHECKLIST
          ===================================================== */}

          <div
            key={`${activeTf}-${ringSweepKeys[activeTf] ?? 0}`}
            className={`${
              panelDir >= 0
                ? "tw-panel-in-fwd"
                : "tw-panel-in-back"
            } relative min-h-0 flex-1 overflow-hidden px-5`}
          >
            {ringSweepKeys[activeTf] > 0 && (
              <div
                key={`scan-${activeTf}-${ringSweepKeys[activeTf]}`}
                className="tw-panel-scan pointer-events-none absolute inset-x-0 top-0 z-20 h-[1px] bg-gradient-to-r from-transparent via-[#28D7F5] to-transparent opacity-60"
              />
            )}

            {activeData.entryGroups ? (
              <div className="grid h-full grid-cols-2 gap-7">
                {activeData.entryGroups.map(
                  (group, groupIndex) => (
                    <div key={group.title} className="min-w-0">
                      <div className="flex h-[34px] items-end pb-1 text-[8px] font-bold tracking-[0.16em] text-[#4E718D]">
                        {group.title}
                      </div>

                      {group.items.map((item, itemIndex) => (
                        <ChecklistRow
                          key={item.name}
                          item={item}
                          reactionKey={reactionKey}
                          onToggle={() =>
                            toggleItem(
                              activeTf,
                              itemIndex,
                              groupIndex
                            )
                          }
                        />
                      ))}
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="grid h-full grid-cols-2 gap-x-7">
                {activeItems.map((item, index) => (
                  <ChecklistRow
                    key={item.name}
                    item={item}
                    reactionKey={reactionKey}
                    onToggle={() =>
                      toggleItem(activeTf, index)
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* =====================================================
              SCORE FOOTER
          ===================================================== */}

          <div className="flex h-[62px] shrink-0 items-center border-t border-[#182633] px-5">
            <div className="w-[105px] shrink-0">
              <div className="text-[8px] font-bold tracking-[0.14em] text-[#4E718D]">
                TIMEFRAME SCORE
              </div>

              <AnimatedPercent
                value={activeScore}
                className="mt-1 block text-[17px] font-black text-white"
              />
            </div>

            <div className="flex-1">
              <div className="relative h-[5px] overflow-hidden rounded-full bg-[#17232F]">
                <div
                  className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-[#159BFF] to-[#28D7F5] transition-all duration-700 ease-out"
                  style={{
                    width: `${activeScore}%`,
                    boxShadow:
                      activeScore >= 70
                        ? "0 0 10px rgba(25,213,162,0.35)"
                        : "0 0 8px rgba(40,215,245,0.25)",
                  }}
                >
                  {activeScore > 0 && (
                    <span
                      className="tw-flow pointer-events-none absolute inset-y-0 left-0 w-[30%] bg-gradient-to-r from-transparent via-white/70 to-transparent"
                      aria-hidden="true"
                    />
                  )}

                  {reactionKey > 0 && activeScore > 0 && (
                    <span
                      key={`score-energy-${reactionKey}`}
                      className="tw-score-energy pointer-events-none absolute inset-y-0 left-0 w-[30%] bg-gradient-to-r from-transparent via-white/90 to-transparent"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
            </div>

            <div
              className={`ml-5 text-[8px] font-bold transition-colors duration-300 ${
                activeScore >= 70
                  ? "text-[#19D5A2] tw-checkpoint-active"
                  : "text-[#536C80]"
              }`}
            >
              {activeScore >= 70
                ? "CHECKPOINT PASSED"
                : "CHECKPOINT PENDING"}
            </div>
          </div>
        </div>

        {/* =======================================================
            CONFLUENCE SIDEBAR
        ======================================================= */}

        <aside className="flex w-[270px] shrink-0 min-h-0 flex-col overflow-hidden border-l border-[#172532] bg-[#080F17] px-5">
          <div className="pt-2 text-[9px] font-bold tracking-[0.22em] text-[#4F6C82]">
            CONFLUENCE
          </div>

          <div className="mt-3 space-y-3">
            {scores.map(({ tf, score }) => {
              const active =
                hasInteracted && activeTf === tf;

              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => handleTimeframeChange(tf)}
                  className="tw-press block w-full text-left"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span
                      className={`text-[9px] font-black tracking-[0.1em] transition-colors duration-300 ${
                        active
                          ? "text-[#28D7F5]"
                          : "text-[#7890A4]"
                      }`}
                    >
                      {tf}
                    </span>

                    <AnimatedPercent
                      value={score}
                      className="text-[10px] font-black text-white"
                    />
                  </div>

                  <div className="relative h-[4px] overflow-hidden rounded-full bg-[#18232F]">
                    <div
                      className={`relative h-full overflow-hidden rounded-full transition-all duration-700 ease-out ${
                        score >= 70
                          ? "bg-[#19D5A2]"
                          : score > 0
                            ? "bg-[#28D7F5]"
                            : "bg-[#263747]"
                      }`}
                      style={{
                        width: `${score}%`,
                        boxShadow:
                          score >= 70
                            ? `0 0 ${active ? "12px" : "8px"} rgba(25,213,162,${
                                active ? "0.5" : "0.35"
                              })`
                            : score > 0
                              ? `0 0 ${active ? "9px" : "6px"} rgba(40,215,245,${
                                  active ? "0.4" : "0.25"
                                })`
                              : undefined,
                      }}
                    >
                      {score > 0 && (
                        <span
                          className="tw-flow pointer-events-none absolute inset-y-0 left-0 w-[32%] bg-gradient-to-r from-transparent via-white/60 to-transparent"
                          aria-hidden="true"
                        />
                      )}

                      {reactionKey > 0 && score > 0 && (
                        <span
                          key={`conf-${tf}-${reactionKey}`}
                          className="tw-score-energy pointer-events-none absolute inset-y-0 left-0 w-[32%] bg-gradient-to-r from-transparent via-white/90 to-transparent"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="my-4 h-px shrink-0 bg-[#1B2A38]" />

          {/* =====================================================
              TOTAL SCORE
          ===================================================== */}

          <div className="rounded-xl border border-[#263746] bg-[#0A1119] px-4 py-4 text-center">
            <div className="text-[8px] font-bold tracking-[0.2em] text-[#526D83]">
              TOTAL SETUP SCORE
            </div>

            <AnimatedPercent
              value={overallScore}
              className="mt-1 block text-[43px] font-black leading-none tracking-tight text-white"
            />

            <div
              className={`mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[8px] font-black tracking-[0.12em] transition-all duration-300 ${
                setupValid
                  ? "border-[#19D5A2]/40 bg-[#19D5A2]/10 text-[#19D5A2] shadow-[0_0_14px_rgba(25,213,162,0.25)]"
                  : "border-[#334454] bg-[#111B24] text-[#63798C]"
              }`}
            >
              <Circle
                size={7}
                fill="currentColor"
                strokeWidth={0}
              />

              {setupValid ? "SETUP VALID" : "NOT READY"}
            </div>
          </div>

          {/* =====================================================
              BOTTOM CHECKPOINT
          ===================================================== */}

          <div className="mt-auto border-t border-[#182633] pt-3 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[0.15em] text-[#4F687D]">
                  NEXT CHECKPOINT
                </div>

                <div className="mt-1 text-[10px] font-bold text-[#A1B5C5]">
                  {activeTf === "ENTRY"
                    ? "Execute only if valid"
                    : "Confirm next timeframe"}
                </div>
              </div>

              <ChevronRight
                size={16}
                className="text-[#28D7F5]"
              />
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}