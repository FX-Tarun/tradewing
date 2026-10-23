"use client";

import { useEffect, useState } from "react";

const candles = [
  { x: 55, open: 145, close: 118, high: 105, low: 158 },
  { x: 82, open: 120, close: 138, high: 112, low: 151 },
  { x: 109, open: 138, close: 102, high: 91, low: 148 },
  { x: 136, open: 103, close: 117, high: 94, low: 130 },
  { x: 163, open: 117, close: 82, high: 70, low: 125 },
  { x: 190, open: 82, close: 96, high: 73, low: 108 },
  { x: 217, open: 96, close: 62, high: 52, low: 101 },
  { x: 244, open: 62, close: 74, high: 55, low: 84 },
  { x: 271, open: 74, close: 47, high: 38, low: 79 },
  { x: 298, open: 47, close: 58, high: 34, low: 67 },
  { x: 325, open: 58, close: 31, high: 23, low: 64 },
];

export default function StartupAnimation() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    /*
     * MARKET IGNITION
     *
     * 0ms    → startup appears
     * 250ms  → chart begins
     * 300ms  → candles begin revealing
     * 900ms  → trend line begins
     * 1500ms → logo appears
     * 1750ms → exit begins
     * 2300ms → startup removed
     *
     * Audio is intentionally NOT handled here.
     * AppShell controls the audio independently.
     */

    const exitTimer = window.setTimeout(() => {
      setExiting(true);
    }, 1750);

    const removeTimer = window.setTimeout(() => {
      setVisible(false);
    }, 2300);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#05080C] transition-opacity duration-500 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      {/* =========================================================
          ATMOSPHERIC BACKGROUND
      ========================================================= */}

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#087BCB] opacity-[0.045] blur-[120px]" />

        <div
          className={`absolute left-1/2 top-1/2 h-[420px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#159FFF]/10 transition-all duration-[1600ms] ${
            exiting ? "scale-[1.12] opacity-0" : "scale-100 opacity-100"
          }`}
        />
      </div>

      {/* =========================================================
          MAIN MARKET IGNITION DISPLAY
      ========================================================= */}

      <div
        className={`relative h-[250px] w-[480px] transition-all duration-700 ease-out ${
          exiting
            ? "scale-[1.08] opacity-0"
            : "scale-100 opacity-100"
        }`}
      >
        {/* =======================================================
            TERMINAL GRID
        ======================================================= */}

        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-[210px] transition-opacity duration-700 ${
            exiting ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* Horizontal grid */}
          <div className="absolute left-0 right-0 top-[20%] border-t border-[#1B5D86]/20" />
          <div className="absolute left-0 right-0 top-[40%] border-t border-[#1B5D86]/20" />
          <div className="absolute left-0 right-0 top-[60%] border-t border-[#1B5D86]/20" />
          <div className="absolute left-0 right-0 top-[80%] border-t border-[#1B5D86]/20" />

          {/* Vertical grid */}
          <div className="absolute bottom-0 left-[10%] top-0 border-l border-[#1B5D86]/20" />
          <div className="absolute bottom-0 left-[30%] top-0 border-l border-[#1B5D86]/20" />
          <div className="absolute bottom-0 left-[50%] top-0 border-l border-[#1B5D86]/20" />
          <div className="absolute bottom-0 left-[70%] top-0 border-l border-[#1B5D86]/20" />
          <div className="absolute bottom-0 left-[90%] top-0 border-l border-[#1B5D86]/20" />

          {/* Moving scan line */}
          <div
            className="absolute bottom-0 top-0 w-px bg-gradient-to-b from-transparent via-[#159FFF]/40 to-transparent animate-[marketScan_1400ms_ease-in-out_200ms_forwards]"
            style={{ left: "0%" }}
          />
        </div>

        {/* =======================================================
            CHART
        ======================================================= */}

        <svg
          viewBox="0 0 380 180"
          className="absolute left-1/2 top-0 h-[210px] w-[440px] -translate-x-1/2 overflow-visible"
        >
          <defs>
            {/* Main blue glow */}
            <filter id="marketGlow">
              <feGaussianBlur
                stdDeviation="2.5"
                result="blur"
              />

              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Stronger pulse glow */}
            <filter id="pulseGlow">
              <feGaussianBlur
                stdDeviation="4"
                result="blur"
              />

              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Chart fade */}
            <linearGradient
              id="chartFade"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop
                offset="0%"
                stopColor="#159FFF"
                stopOpacity="0.1"
              />

              <stop
                offset="50%"
                stopColor="#159FFF"
                stopOpacity="0.7"
              />

              <stop
                offset="100%"
                stopColor="#159FFF"
                stopOpacity="1"
              />
            </linearGradient>
          </defs>

          {/* =====================================================
              CANDLESTICKS
          ===================================================== */}

          <g filter="url(#marketGlow)">
            {candles.map((candle, index) => {
              const bullish = candle.close < candle.open;

              const bodyTop = Math.min(
                candle.open,
                candle.close
              );

              const bodyHeight = Math.max(
                Math.abs(candle.open - candle.close),
                5
              );

              return (
                <g
                  key={candle.x}
                  className="animate-[candleReveal_600ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
                  style={{
                    opacity: 0,
                    animationDelay: `${300 + index * 58}ms`,
                    transformOrigin: `${candle.x}px ${candle.close}px`,
                  }}
                >
                  {/* Wick */}
                  <line
                    x1={candle.x}
                    y1={candle.high}
                    x2={candle.x}
                    y2={candle.low}
                    stroke="#159FFF"
                    strokeWidth="1.5"
                  />

                  {/* Body */}
                  <rect
                    x={candle.x - 6}
                    y={bodyTop}
                    width="12"
                    height={bodyHeight}
                    rx="1.5"
                    fill={
                      bullish
                        ? "#159FFF"
                        : "#0A5C91"
                    }
                    stroke="#159FFF"
                    strokeWidth="1"
                  />
                </g>
              );
            })}
          </g>

          {/* =====================================================
              TREND LINE
          ===================================================== */}

          <path
            d="M35 153 C90 140, 125 125, 165 116 S245 84, 345 28"
            fill="none"
            stroke="url(#chartFade)"
            strokeWidth="1.5"
            strokeDasharray="420"
            strokeDashoffset="420"
            className="animate-[trendReveal_850ms_ease-out_900ms_forwards]"
          />

          {/* =====================================================
              TREND PULSE
          ===================================================== */}

          <circle
            cx="345"
            cy="28"
            r="3"
            fill="#159FFF"
            filter="url(#pulseGlow)"
            className="animate-[signalPulse_700ms_ease-out_1450ms_forwards]"
            style={{
              opacity: 0,
            }}
          />

          <circle
            cx="345"
            cy="28"
            r="7"
            fill="none"
            stroke="#159FFF"
            strokeWidth="1"
            className="animate-[signalRing_700ms_ease-out_1450ms_forwards]"
            style={{
              opacity: 0,
            }}
          />
        </svg>

        {/* =======================================================
            MARKET STATUS
        ======================================================= */}

        <div
          className={`absolute left-1/2 top-[218px] -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.28em] text-[#5680A2] transition-all duration-500 ${
            exiting
              ? "translate-y-[-5px] opacity-0"
              : "translate-y-0 opacity-100"
          }`}
        >
          MARKET IGNITION
        </div>

        {/* =======================================================
            TRADEWING WORDMARK
        ======================================================= */}

        <div
          className={`absolute left-1/2 top-[245px] -translate-x-1/2 whitespace-nowrap text-[19px] font-extrabold tracking-[0.18em] text-zinc-100 transition-all duration-700 ease-out ${
            exiting
              ? "translate-y-[-8px] scale-[0.96] opacity-0"
              : "translate-y-0 scale-100 opacity-100"
          }`}
        >
          TRADE
          <span className="text-[#159FFF]">WING</span>
        </div>
      </div>
    </div>
  );
}